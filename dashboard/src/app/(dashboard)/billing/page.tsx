import { supabaseAdmin } from "@/lib/supabase-server";
import BillingClient from "./BillingClient";
import type { Invoice, CompletedOrder } from "@/types/billing";

export const revalidate = 0;

export default async function BillingPage() {
    const { data: rawInvoices, error: invError } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

    if (invError) {
        console.error("Error fetching invoices:", invError);
    }

    const { data: rawOrders, error: ordError } = await supabaseAdmin
        .from("completed_orders")
        .select("*")
        .order("completed_at", { ascending: false });

    if (ordError) {
        console.error("Error fetching completed orders:", ordError);
    }

    return (
        <BillingClient
            initialInvoices={(rawInvoices || []) as Invoice[]}
            initialOrders={(rawOrders || []) as CompletedOrder[]}
        />
    );
}
