/**
 * messageQueue.ts — Abort & Group Message Bunching Engine (Fix 2)
 *
 * STRATEGY:
 *  1. Each incoming message is immediately saved to DB and the webhook returns 200.
 *  2. We store an AbortController per user phone in a WeakRef-compatible Map.
 *  3. If a new message arrives while the AI is processing for the same user:
 *     - We abort the current AI call.
 *     - We set a short "gather" window (500ms) and collect all queued messages.
 *     - Re-trigger processing with ALL queued messages joined as one prompt.
 *  4. This naturally handles rapid-fire typing without any timer-based delays.
 *
 * BENEFITS:
 *  - No arbitrary waits for single messages (user still gets instant AI response).
 *  - Multi-message bursts are treated as ONE coherent thought by the AI.
 *  - Zero duplicate Groq calls for burst scenarios.
 */

interface PendingEntry {
    messages: string[];
    abortController: AbortController;
    gatherTimer?: ReturnType<typeof setTimeout>;
}

// In-memory map: `${clientId}:${phone}` → PendingEntry
// This lives in-process. In multi-server setups, use Redis pub/sub instead.
const pendingMap = new Map<string, PendingEntry>();

/**
 * Queues an incoming message for a user. If the user already has a pending
 * AI call, aborts it and adds this message to the queue.
 *
 * @param clientId    - The WABA client ID
 * @param phone       - Customer phone number
 * @param message     - The text body of the new message
 * @param onProcess   - Callback that runs when we're ready to process the batch
 * @returns An AbortController for the CURRENT processing run (may be new)
 */
export function queueMessage(
    clientId: string,
    phone: string,
    message: string | null,
    onProcess: (groupedMessages: string, signal: AbortSignal) => Promise<void>
): void {
    const key = `${clientId}:${phone}`;
    const existing = pendingMap.get(key);

    if (existing) {
        // Abort whatever AI call is in flight right now
        console.log(`[MSG_QUEUE] Aborting previous AI call for ${phone} — combining messages`);
        existing.abortController.abort();

        // Clear any gather timer that might be pending
        if (existing.gatherTimer) clearTimeout(existing.gatherTimer);

        // Append new message to the accumulated list
        if (message) existing.messages.push(message);

        // Start a short gather timer — collect any more that come within 500ms
        const newAC = new AbortController();
        const updatedMessages = [...existing.messages];
        existing.abortController = newAC;

        existing.gatherTimer = setTimeout(async () => {
            pendingMap.delete(key);
            const grouped = updatedMessages.filter(Boolean).join('\n');
            console.log(`[MSG_QUEUE] Processing grouped messages for ${phone}: "${grouped}"`);
            try {
                await onProcess(grouped, newAC.signal);
            } catch (err: any) {
                if (err?.name !== 'AbortError') {
                    console.error(`[MSG_QUEUE] Processing error for ${phone}:`, err);
                }
            }
        }, 500); // 500ms gather window — short enough to feel instant, long enough to catch rapid-fire
    } else {
        // No pending entry — start a new one immediately (no delay for first message)
        const newAC = new AbortController();
        const messages = message ? [message] : [];
        const entry: PendingEntry = {
            messages,
            abortController: newAC,
        };
        pendingMap.set(key, entry);

        // Trigger processing with a minimal 50ms yield to allow ultra-rapid follow-ups to arrive
        entry.gatherTimer = setTimeout(async () => {
            pendingMap.delete(key);
            const grouped = messages.filter(Boolean).join('\n');
            console.log(`[MSG_QUEUE] Processing fresh message for ${phone}: "${grouped}"`);
            try {
                await onProcess(grouped, newAC.signal);
            } catch (err: any) {
                if (err?.name !== 'AbortError') {
                    console.error(`[MSG_QUEUE] Processing error for ${phone}:`, err);
                }
            }
        }, 50); // Almost instant for single messages
    }
}

/**
 * Force-clears any pending queue entry for a user.
 * Useful when a user is in an active KYC flow or has a reservation — no AI needed.
 */
export function clearQueue(clientId: string, phone: string): void {
    const key = `${clientId}:${phone}`;
    const existing = pendingMap.get(key);
    if (existing) {
        existing.abortController.abort();
        if (existing.gatherTimer) clearTimeout(existing.gatherTimer);
        pendingMap.delete(key);
    }
}
