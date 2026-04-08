import Groq from 'groq-sdk';
import { ENV } from '../config/env';
import { Product } from './products';
import { query } from './db';

// Prevent SDK initialized crashes if env is missing during boot
export const groq = ENV.GROQ_API_KEY ? new Groq({
    apiKey: ENV.GROQ_API_KEY
}) : null;

export interface ExtractedAIResponse {
    intent: 'browse' | 'compare' | 'buy' | 'price_check' | 'greeting' | 'objection' | 'unknown';
    text: string;
    buttons: { id: string; title: string }[];
    products: { id: string; title: string; price: number; brief: string; images: string[]; stock: string; item_type?: string }[];
    // Phase 6: expanded action enum
    action: 'none' | 'reserve_physical' | 'request_virtual' | 'price_objection' | 'notify_queue';
    reserve_seconds: number;
    payment_hint: string;
    confidence: number;
    language_hint: 'en' | 'hi-hinglish';
}

// ─── Groq Function Tool: fetch_chat_history ──────────────────────────────────
// The AI calls this tool when it decides it needs conversation history.
// This avoids sending history with EVERY request (saves tokens).
const FETCH_HISTORY_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'fetch_chat_history',
        description: `Call this tool when the user's message is short, ambiguous, or references prior context
(e.g., "this one", "the first one", "how much is it", "yes", "no", "more details", "ok", "sure").
Do NOT call if the user has clearly stated what they want in full (e.g., "I want to buy iPhone 14 Pro Max").
Returns the last 8 messages of the conversation so you can give a contextually accurate response.`,
        parameters: {
            type: 'object',
            properties: {
                reason: {
                    type: 'string',
                    description: 'Why do you need context? Short explanation.'
                }
            },
            required: ['reason']
        }
    }
};

/**
 * Fetches the last N messages for a customer from the conversations DB.
 * Called when the AI decides it needs context via tool use.
 */
async function fetchChatHistory(
    clientId: string,
    customerPhone: string,
    limit = 8
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
        const result = await query(
            `SELECT direction, text_body FROM conversations
             WHERE client_id = $1 AND customer_phone = $2
               AND text_body IS NOT NULL
             ORDER BY created_at DESC LIMIT $3`,
            [clientId, customerPhone, limit]
        );

        return result.rows.reverse().map(r => ({
            role: r.direction === 'inbound' ? 'user' : 'assistant' as const,
            // Clean internal prefixes so the AI doesn't get confused by system markers
            content: (r.text_body as string)
                .replace(/^\[Interactive\] /, '')
                .replace(/^\[Image Sent:.*?\] /, '')
                .substring(0, 500) // Cap per-message at 500 chars to control token cost
        }));
    } catch (err) {
        console.error('[GROQ] Failed to fetch chat history:', err);
        return [];
    }
}

/**
 * Phase 2 AI Integration: Dynamic Catalog Injection + Hinglish Sales Agent
 * 
 * FIX 2: Now supports:
 *  - Groq Function/Tool Calling: AI fetches context only when it needs it (saves tokens)
 *  - FIX 6: AbortSignal support: if the message queue aborts (user sent more messages), we cancel
 *  - FIX 6: 8-second hard timeout: prevents YCloud retry cascade on Groq slowness
 *  - max_tokens bumped 400 → 800: prevents JSON truncation crashes
 *  - Token usage is still logged async to ai_interactions table
 */
export async function detectIntent(
    userMessage: string,          // May be multiple messages joined by \n (from messageQueue)
    groupedProducts: any[],
    clientId: string,
    conversationId: number,
    customerPhone: string,
    abortSignal?: AbortSignal     // FIX 2: passed from messageQueue AbortController
): Promise<ExtractedAIResponse> {
    if (!groq) throw new Error('Groq SDK not initialized. Missing API Key.');

    const productCatalogText = JSON.stringify(groupedProducts);

    const systemPrompt = `You are an elite sales assistant for AutomatXpress. Goal: Convert interests into sales immediately.
- If user wants to buy or shows high intent for a specific product, set action: "reserve_physical".
- Use Hinglish (Hindi in Latin script) naturally.
- KEEP TEXT RESPONSES VERY SHORT AND CONCISE. Do not write long paragraphs.
- If recommending products, RETURN MAXIMUM 2 PRODUCTS. If there are more matches, ask the user "Would you like to see more options?" in your text response.
- RESPONSE MUST BE JSON ONLY.

INVENTORY (Use these IDs/Titles):
${productCatalogText}

Return only JSON. JSON schema:
{
  "intent": "browse|compare|buy|price_check|greeting|objection|unknown",
  "text": "string (customer-facing, <=400 chars)",
  "buttons": [{"id":"string","title":"string"}],
  "products": [{"id":"string","title":"string","price":number,"brief":"string","images":["url"],"stock":"available|reserved|sold","item_type":"physical|virtual"}],
  "action": "none|reserve_physical|request_virtual|price_objection|notify_queue",
  "reserve_seconds": 600,
  "payment_hint": "upi|card|bank",
  "confidence": 0.0,
  "language_hint": "en|hi-hinglish"
}

Action rules:
- User wants to BUY a PHYSICAL item → action: "reserve_physical"
- User wants to BUY a VIRTUAL item → action: "request_virtual" (NO payment link will be sent — owner confirmation required)
- User is negotiating price / asking for discount → action: "price_objection"
- User wants to join waitlist → action: "notify_queue"
In the "products" array, put the "hash_id" of the chosen item in the "id" field so the backend can locate and lock a real device.`;

    // ─── FIX 6: 8-second timeout + AbortSignal wiring ──────────────────────────
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn(`[GROQ] 8-second timeout reached for ${customerPhone}. Aborting Groq call.`);
        timeoutController.abort();
    }, 8000);

    // Combine the external queue abort with our internal timeout abort
    const combinedSignal = abortSignal
        ? ((): AbortSignal => {
            const combined = new AbortController();
            abortSignal.addEventListener('abort', () => combined.abort(), { once: true });
            timeoutController.signal.addEventListener('abort', () => combined.abort(), { once: true });
            return combined.signal;
        })()
        : timeoutController.signal;

    const startT = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let finalContent: string | null = null;
    let usedHistory = false;

    try {
        // ── PASS 1: Initial call — AI can choose to call fetch_chat_history ──────
        const baseMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        const pass1 = await groq.chat.completions.create(
            {
                model: ENV.GROQ_MODEL,
                messages: baseMessages,
                tools: [FETCH_HISTORY_TOOL],
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 800  // FIX: was 400, now 800 to prevent JSON truncation
            },
            { signal: combinedSignal }
        );

        const pass1Choice = pass1.choices[0];
        promptTokens += pass1.usage?.prompt_tokens ?? 0;
        completionTokens += pass1.usage?.completion_tokens ?? 0;

        if (pass1Choice?.finish_reason === 'tool_calls' && pass1Choice.message.tool_calls) {
            // ── PASS 2: AI wants history — fetch it and respond ──────────────────
            console.log(`[GROQ] AI requested chat history for ${customerPhone} (token-efficient context load)`);
            usedHistory = true;

            const history = await fetchChatHistory(clientId, customerPhone, 8);

            // Build messages: system + history + current user message
            const pass2Messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
                { role: 'system', content: systemPrompt },
                ...history,
                // Tell the model the tool responded with the history
                pass1Choice.message,
                {
                    role: 'tool',
                    tool_call_id: pass1Choice.message.tool_calls[0].id,
                    content: JSON.stringify(history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n'))
                },
                { role: 'user', content: userMessage }
            ];

            const pass2 = await groq.chat.completions.create(
                {
                    model: ENV.GROQ_MODEL,
                    messages: pass2Messages,
                    response_format: { type: 'json_object' },
                    temperature: 0.7,
                    max_tokens: 800
                },
                { signal: combinedSignal }
            );

            finalContent = pass2.choices[0]?.message?.content ?? null;
            promptTokens += pass2.usage?.prompt_tokens ?? 0;
            completionTokens += pass2.usage?.completion_tokens ?? 0;
        } else {
            // Single pass — AI had enough context from the system prompt alone
            finalContent = pass1Choice?.message?.content ?? null;
        }

        totalTokens = promptTokens + completionTokens;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!finalContent) {
        throw new Error('Groq returned empty response body');
    }

    // ── Parse response safely ─────────────────────────────────────────────────
    let parsedResponse: ExtractedAIResponse;
    try {
        parsedResponse = JSON.parse(finalContent) as ExtractedAIResponse;
    } catch (e) {
        throw new Error('Groq did not return valid JSON: ' + finalContent.substring(0, 200));
    }

    // Ensure required fields always have defaults (defensive)
    parsedResponse.buttons = parsedResponse.buttons ?? [];
    parsedResponse.products = parsedResponse.products ?? [];
    parsedResponse.action = parsedResponse.action ?? 'none';
    parsedResponse.confidence = parsedResponse.confidence ?? 0;

    const durationSec = (Date.now() - startT) / 1000;

    // ── Save interaction async — never blocks webhook response ───────────────
    const logSql = `
        INSERT INTO ai_interactions (
            client_id, groq_completion_id, model_used, temperature, max_tokens,
            system_prompt, user_message, assistant_response, response_json,
            parsed_intent, parsed_product_ids, parsed_confidence,
            prompt_tokens, completion_tokens, total_tokens, total_time_seconds,
            conversation_id, customer_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `;
    query(logSql, [
        clientId, `local_${Date.now()}`, ENV.GROQ_MODEL, 0.7, 800,
        systemPrompt, userMessage, parsedResponse.text, finalContent,
        parsedResponse.intent, parsedResponse.products.map(p => p.id), parsedResponse.confidence,
        promptTokens, completionTokens, totalTokens, durationSec,
        conversationId, customerPhone
    ]).catch(err => console.error('[AI_LOG_ERR] Failed to log AI interaction:', err));

    console.log(`[GROQ] Done in ${durationSec.toFixed(2)}s | Tokens: ${totalTokens} | History: ${usedHistory} | Intent: ${parsedResponse.intent}`);

    return parsedResponse;
}
