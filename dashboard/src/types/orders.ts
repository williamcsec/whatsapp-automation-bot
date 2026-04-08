// Types representing our custom order shapes from DB

export type OrderStatus =
    | 'pending_payment'
    | 'payment_initiated'
    | 'failed'
    | 'paid'
    | 'expired'
    | 'fraud_suspected';

export interface PendingOrder {
    id: number;
    client_id: string;
    order_id: string;
    customer_phone: string;
    customer_name: string;
    product_id: number;
    product_name: string;
    payment_amount: number;
    status: OrderStatus;
    reserved_at: string;
    expires_at: string;
    kyc_status?: string | null;
    delivery_address?: any;
}
