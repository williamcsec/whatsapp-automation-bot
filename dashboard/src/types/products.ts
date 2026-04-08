// Types representing the products schema

export type ProductStatus = 'available' | 'reserved' | 'sold';

export interface Product {
    id: number;
    client_id: string;
    name: string;
    description: string | null;
    price: number;
    category: string | null;
    sku: string | null;
    status: ProductStatus;
    reserved_at: string | null;
    reserved_by: string | null;
    sold_at: string | null;
    image_url: string | null;
    video_url: string | null;
    additional_images: string[] | null;
    specs: any; // JSONB
    stock_location: string | null;
    condition: string | null; // e.g. "new", "refurbished", "used"
    warranty_months: number | null;
    created_at: string;
    updated_at: string;
    item_type: string | null;
    owner_confirmed: boolean;
    owner_confirmed_at: string | null;
    low_stock_alert_limit: number | null;
    low_stock_limit: number | null;
    deal_status: string | null;
    cost_price: number | null;
}
