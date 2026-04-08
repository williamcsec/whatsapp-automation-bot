import { supabaseAdmin } from "@/lib/supabase-server";
import CustomersClient from "./CustomersClient";
import type { CustomerWithChats } from "@/types/customers";

export const revalidate = 0; // Dynamic rendering

export default async function CustomersPage() {
    // 1. Fetch Customers
    const { data: rawCustomers, error: custError } = await supabaseAdmin
        .from("customers")
        .select("*")
        .order("last_active", { ascending: false });

    if (custError) {
        console.error("Error fetching customers:", custError);
    }

    // 2. Fetch conversations
    const { data: rawChats, error: chatError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: true });

    if (chatError) {
        console.error("Error fetching chats:", chatError);
    }

    // Group chats with their respective customers
    const customersWithChats: CustomerWithChats[] = (rawCustomers || []).map((customer) => {
        return {
            ...customer,
            conversations: (rawChats || []).filter(chat => chat.customer_id === customer.id)
        }
    });

    return <CustomersClient initialCustomers={customersWithChats} />;
}
