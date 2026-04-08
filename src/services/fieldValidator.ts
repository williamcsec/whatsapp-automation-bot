/**
 * fieldValidator.ts — Pure validation functions for all KYC fields.
 * No DB or Redis access. No side effects. Safe to test in isolation.
 *
 * Per spec Section 9.
 */

export type KYCField =
    | 'full_name'
    | 'email'
    | 'delivery_preference'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'state'
    | 'pincode'
    | 'aadhaar';

export const validators: Record<KYCField, (input: string) => boolean> = {
    full_name: v => /^[a-zA-Z\s\.\-]{2,80}$/.test(v.trim()),
    email: v => v.trim().toLowerCase() === 'skip' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    delivery_preference: v => ['delivery_home', 'delivery_pickup'].includes(v.trim()),
    address_line1: v => v.trim().length >= 5 && v.trim().length <= 150,
    address_line2: v => v.trim().toLowerCase() === 'skip' || v.trim().length <= 100,
    city: v => /^[a-zA-Z\s]{2,50}$/.test(v.trim()),
    state: v => /^[a-zA-Z\s]{2,50}$/.test(v.trim()),
    pincode: v => /^[1-9][0-9]{5}$/.test(v.trim()),
    aadhaar: v => {
        const clean = v.replace(/[\s\-]/g, '');
        if (!/^[2-9][0-9]{11}$/.test(clean)) return false; // UIDAI: starts 2-9
        if (/^(\d)\1{11}$/.test(clean)) return false;      // No all-same digits
        return true;
    },
};

export const errorMessages: Record<KYCField, string> = {
    full_name: 'Naam mein sirf letters hone chahiye (2-80 chars). Dobara batao:',
    email: "Sahi email format chahiye (abc@xyz.com) ya 'skip' likho:",
    delivery_preference: 'Please button tap karke choose karo.',
    address_line1: 'Poora address likho (flat/house no. + building, min 5 chars):',
    address_line2: "Area/colony name ya 'skip' likho:",
    city: 'Sirf city ka naam chahiye (letters only):',
    state: 'State ka naam dobara batao (letters only):',
    pincode: '6-digit pincode chahiye (sirf numbers, first digit 1-9):',
    aadhaar: 'Aadhaar 12 digits ka hota hai (pehla digit 2-9). Dobara check kar ke bhejo:',
};

/** Max retries per field before offering restart */
export const MAX_FIELD_RETRIES = 3;

/**
 * Returns the field-level validation error message, or null if valid.
 */
export function validateField(field: KYCField, value: string): string | null {
    const isValid = validators[field]?.(value);
    if (isValid) return null;
    return errorMessages[field] ?? 'Invalid input. Please try again.';
}

/**
 * Normalises field value after it passes validation.
 * - email 'skip' → null
 * - address_line2 'skip' → null
 * - delivery_preference 'delivery_home' → 'delivery', 'delivery_pickup' → 'pickup'
 * - aadhaar: strips spaces & hyphens (DO NOT return here — pass to encryptAadhaar immediately)
 */
export function normaliseFieldValue(field: KYCField, value: string): string | null {
    const v = value.trim();
    if (field === 'email' && v.toLowerCase() === 'skip') return null;
    if (field === 'address_line2' && v.toLowerCase() === 'skip') return null;
    if (field === 'delivery_preference') {
        return v === 'delivery_home' ? 'delivery' : 'pickup';
    }
    if (field === 'aadhaar') {
        // Return cleaned — caller must pass to encryptAadhaar() immediately and NOT log
        return v.replace(/[\s\-]/g, '');
    }
    return v;
}
