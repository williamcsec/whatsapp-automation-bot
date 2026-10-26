import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { query } from '../../../../../../src/services/db';

export async function GET() {
    try {
        await requireSuperAdmin();

        // 1. Aggregate AI Tokens
        const aiQuery = await query(`
            SELECT 
                COUNT(*) as total_calls,
                SUM(prompt_tokens) as total_prompt,
                SUM(completion_tokens) as total_completion,
                SUM(total_time_seconds) as total_time
            FROM ai_interactions
        `);
        const aiStats = aiQuery.rows[0];
        
        // 2. Aggregate WhatsApp Messages
        const waQuery = await query(`
            SELECT 
                direction,
                COUNT(*) as count
            FROM conversations
            GROUP BY direction
        `);
        let inboundWa = 0;
        let outboundWa = 0;
        waQuery.rows.forEach(r => {
            if (r.direction === 'inbound') inboundWa = parseInt(r.count, 10);
            if (r.direction === 'outbound') outboundWa = parseInt(r.count, 10);
        });

        // 3. Aggregate Orders / Payments
        const orderQuery = await query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue
            FROM orders
            WHERE payment_status = 'PAID'
        `);
        const orderStats = orderQuery.rows[0];

        // 4. Calculate Costs (Hardcoded pricing for MVP/Simulation)
        // Groq Llama 3 Pricing: ~₹49 per 1M tokens ($0.60 * 82 INR)
        const totalTokens = (parseInt(aiStats.total_prompt || '0', 10) + parseInt(aiStats.total_completion || '0', 10));
        const groqCostInr = (totalTokens / 1_000_000) * 49; 
        
        // WhatsApp Pricing (Meta API India Avg): ~₹0.40 blended per outbound message
        const whatsappCostInr = outboundWa * 0.40;

        // Cashfree Fees: ~1.8% of total revenue processed
        const revenue = parseFloat(orderStats.total_revenue || '0');
        const cashfreeCostInr = revenue * 0.018;

        const totalInfrastructureCost = groqCostInr + whatsappCostInr + cashfreeCostInr;
        
        // Client Billing simulation (Fixed ₹50k for demo)
        const clientBillingInr = 50000;
        const netMargin = clientBillingInr - totalInfrastructureCost;
        const profitMarginPerc = ((netMargin / clientBillingInr) * 100).toFixed(1);

        return NextResponse.json({
            success: true,
            data: {
                aiTokens: {
                    calls: parseInt(aiStats.total_calls || '0', 10),
                    tokens: totalTokens,
                    costInr: groqCostInr
                },
                whatsapp: {
                    inbound: inboundWa,
                    outbound: outboundWa,
                    costInr: whatsappCostInr
                },
                payments: {
                    orders: parseInt(orderStats.total_orders || '0', 10),
                    revenue: revenue,
                    costInr: cashfreeCostInr
                },
                summary: {
                    totalInfraCost: totalInfrastructureCost,
                    clientBilling: clientBillingInr,
                    netMargin: netMargin,
                    marginPercentage: profitMarginPerc
                }
            }
        });

    } catch (error: any) {
        console.error('[COSTS_ERR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
