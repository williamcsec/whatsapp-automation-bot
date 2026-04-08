export interface Customer {
    id: string;
    client_id: string;
    name?: string;
    phone_number: string;
    profile_picture_url?: string;
    total_spend: number;
    total_orders: number;
    last_active: string;
    created_at: string;
    updated_at: string;
}

export interface Conversation {
    id: number;
    client_id: string;
    customer_id?: string;
    ycloud_message_id?: string;
    customer_phone: string;
    direction: 'inbound' | 'outbound';
    message_type?: string;
    text_body?: string;
    is_human_override: boolean;
    created_at: string;
}

export interface CustomerWithChats extends Customer {
    conversations: Conversation[];
}
