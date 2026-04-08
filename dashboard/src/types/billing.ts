export interface Invoice {
    id: number;
    client_id: string;
    invoice_number: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    items: InvoiceItem[];
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'generated' | 'sent' | 'paid' | 'cancelled';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface InvoiceItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    order_number?: string;
}

export interface CompletedOrder {
    id: number;
    client_id: string;
    order_id: string;
    order_number?: string;
    customer_phone: string;
    customer_name?: string;
    customer_email?: string;
    product_name?: string;
    product_price?: number;
    payment_amount?: number;
    total_amount?: number;
    payment_method?: string;
    cf_payment_id?: string;
    payment_time?: string;
    fulfillment_status?: string;
    completed_at?: string;
    invoice_customer_name?: string;
    invoice_customer_email?: string;
    invoice_customer_phone?: string;
}
