import { Router, Request, Response } from 'express';
import { detectIntent } from '../services/groq';
import { getAvailableProducts } from '../services/products';
import { query } from '../services/db';

export const adminRouter = Router();

/**
 * POST /api/admin/simulate
 * Run a test evaluation of the LLM pipeline for an arbitrary message.
 */
adminRouter.post('/simulate', async (req: Request, res: Response): Promise<void> => {
    try {
        const { client_id, message, phone = "+910000000000" } = req.body;

        if (!client_id || !message) {
            res.status(400).json({ error: 'Missing client_id or message' });
            return;
        }

        const startT = Date.now();

        // 1. Fetch live product catalog for this client to inject into prompt
        const products = await getAvailableProducts(client_id);
        const groupedProducts = products.map((p: any) => ({
            id: p.id,
            title: p.name,
            price: p.price,
            stock: p.status === 'available' ? 'available' : 'sold_out',
            brief: p.description
        }));

        // 2. Fetch/Mock a Conversation ID (need one for the AI log)
        let convId = 0;
        const convCheck = await query(`SELECT id FROM conversations WHERE client_id = $1 AND customer_phone = $2 LIMIT 1`, [client_id, phone]);
        if (convCheck.rows.length > 0) {
            convId = convCheck.rows[0].id;
        } else {
            // Create a temporary conversation for the simulation
            const newConv = await query(
                `INSERT INTO conversations (client_id, customer_phone, direction, status, text_body) VALUES ($1, $2, 'inbound', 'delivered', $3) RETURNING id`, 
                [client_id, phone, 'TEST_SIMULATION']
            );
            convId = newConv.rows[0].id;
        }

        // 3. Run the true production prompt (Hitting Groq)
        const aiResponse = await detectIntent(
            message,
            groupedProducts,
            client_id,
            convId,
            phone
        );

        const latencyMs = Date.now() - startT;

        // 4. Fetch the tokens used from the DB (since detectIntent writes it async)
        // Wait 100ms to ensure the async INSERT finishes
        await new Promise(resolve => setTimeout(resolve, 100));
        const tokenQuery = await query(
            `SELECT prompt_tokens, completion_tokens, total_time_seconds 
             FROM ai_interactions 
             WHERE client_id = $1 AND customer_phone = $2
             ORDER BY created_at DESC LIMIT 1`,
            [client_id, phone]
        );
        
        let tokens = { prompt: 0, completion: 0, time_seconds: 0 };
        if (tokenQuery.rows.length > 0) {
            tokens = {
                prompt: tokenQuery.rows[0].prompt_tokens,
                completion: tokenQuery.rows[0].completion_tokens,
                time_seconds: Math.floor(parseFloat(tokenQuery.rows[0].total_time_seconds || '0'))
            };
        }

        res.status(200).json({
            success: true,
            latency: latencyMs,
            tokens,
            ai: aiResponse,
            productsInjected: groupedProducts.length
        });
    } catch (error: any) {
        console.error('[SIMULATE_ERR]', error);
        res.status(500).json({ error: error.message });
    }
});
