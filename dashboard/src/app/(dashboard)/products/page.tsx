import { supabaseAdmin } from "@/lib/supabase-server";
import ProductsClient from "./ProductsClient";
import type { Product } from "@/types/products";

export const revalidate = 0; // Dynamic rendering for latest inventory

export default async function ProductsPage() {
    // Note: To match the UI mockup gracefully we'll fetch all products.
    // We group them by SKU/Name or just display raw rows.
    // Since 1 row = 1 physical item, the "Stock" concept in UI is visually an aggregate if the user adds duplicates. 
    // To match the UI exactly, let's group rows with the same name/sku to calculate a 'stock' count for display, 
    // or we can just list them individually if SKUs are unique per item.

    // We will pass the raw products to the client and let the client handle grouping/display.
    const { data: rawProducts, error } = await supabaseAdmin
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching products:", error);
    }

    const products: Product[] = (rawProducts || []) as Product[];

    return <ProductsClient initialProducts={products} />;
}
