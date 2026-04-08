import { supabaseAdmin } from "@/lib/supabase-server";
import LiveOrdersClient from "./LiveOrdersClient";
import type { PendingOrder } from "@/types/orders";

export const revalidate = 0; // Disable full page caching for live dashboard

export default async function OrdersPage() {
    // Fetch active and pending reservations (excluding fully expired/paid if we want to mimic the current UI tab exactly)
    // But the UI showed categories for "Expired" and "Completed Today" as well. Let's fetch the recent 50 across states.

    const { data: recentOrders, error } = await supabaseAdmin
        .from("pending_orders")
        .select("*")
        .order("reserved_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching pending orders:", error);
    }

    // To combine with "Completed Orders" we would join them, but for now we focus on pending_orders.
    // We'll pass them to the interactive client.
    const orders: PendingOrder[] = (recentOrders || []) as PendingOrder[];

    return <LiveOrdersClient initialOrders={orders} />;
}
