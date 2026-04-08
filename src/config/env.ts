import dotenv from 'dotenv';
import path from 'path';

// Load .env relative to the project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const ENV = {
    // Application
    PORT: process.env.PORT || 5678,

    // Supabase
    DATABASE_URL: process.env.DATABASE_URL as string,
    SUPABASE_URL: process.env.SUPABASE_URL as string,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY as string,

    // Redis
    REDIS_URL: process.env.REDIS_URL as string,

    // YCloud
    YCLOUD_API_KEY: process.env.YCLOUD_API_KEY as string,
    YCLOUD_WEBHOOK_SECRET: process.env.YCLOUD_WEBHOOK_SECRET as string,
    WHATSAPP_BUSINESS_PHONE: process.env.WHATSAPP_BUSINESS_PHONE as string,
    WHATSAPP_WABA_ID: process.env.WHATSAPP_WABA_ID as string,

    // Groq
    GROQ_API_KEY: process.env.GROQ_API_KEY as string,
    GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',

    // Cashfree
    CASHFREE_APP_ID: process.env.CASHFREE_APP_ID as string,
    CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY as string,
    CASHFREE_API_VERSION: process.env.CASHFREE_API_VERSION || '2023-08-01',
    CASHFREE_ENVIRONMENT: process.env.CASHFREE_ENVIRONMENT || 'sandbox',
    CASHFREE_RETURN_URL: process.env.CASHFREE_RETURN_URL || 'https://automatxpress.com/payment-success?order_id={order_id}',

    // KYC
    AADHAAR_ENCRYPTION_KEY: process.env.AADHAAR_ENCRYPTION_KEY as string,
};

// Validate that critical env vars exist
export function validateEnv() {
    const missing: string[] = [];

    // We warn rather than crash immediately just so the server can boot while keys are being fetched
    if (!ENV.DATABASE_URL) missing.push('DATABASE_URL');
    if (!ENV.REDIS_URL) missing.push('REDIS_URL');
    if (!ENV.AADHAAR_ENCRYPTION_KEY) missing.push('AADHAAR_ENCRYPTION_KEY');

    if (missing.length > 0) {
        console.warn(`[WARN] Missing environment variables: ${missing.join(', ')}`);
    }
}
