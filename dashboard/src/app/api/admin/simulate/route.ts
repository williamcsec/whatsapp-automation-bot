import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { detectIntent } from '../../../../../../src/services/groq';
import { getClientProducts } from '../../../../../../src/services/products';
import { query } from '../../../../../../src/services/db';

export async function POST(req: Request) {
    try {
        await requireSuperAdmin();

        const body = await req.json();
        const { client_id, message, phone = "+910000000000" } = body;

        if (!client_id || !message) {
            return NextResponse.json({ error: 'Missing client_id or message' }, { status: 400 });
        }

        const startT = Date.now();

        // 1. Fetch live product catalog for this client to inject into prompt
        const products = await getClientProducts(client_id);
        const groupedProducts = products.map(p => ({
            id: p.hash_id || p.id,
            title: p.title,
            price: p.price,
            stock: p.stock > 0 ? 'available' : 'sold_out',
            brief: p.brief
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
                time_seconds: tokenQuery.rows[0].total_time_seconds
            };
        }

        return NextResponse.json({
            success: true,
            latency: latencyMs,
            tokens,
            ai: aiResponse,
            productsInjected: groupedProducts.length
        });

    } catch (error: any) {
        console.error('[SIMULATE_ERR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
