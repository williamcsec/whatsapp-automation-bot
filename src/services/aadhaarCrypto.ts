/**
 * aadhaarCrypto.ts — ONLY file that touches Aadhaar plaintext.
 *
 * RULES:
 * 1. NEVER log the plaintext Aadhaar number anywhere.
 * 2. NEVER return decrypted Aadhaar in any API response.
 * 3. NEVER copy Aadhaar to completed_orders or any other table.
 * 4. Only decrypt when: (a) admin downloads invoice PDF, (b) return/refund verification.
 * 5. decryptAadhaar() calls must be logged to reservation_audit with who/when.
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Key must be 64 hex chars = 32 bytes.
// Generate once: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// LAZY INIT: Don't crash the server if KYC isn't configured yet.
let _key: Buffer | null = null;

function getKey(): Buffer {
    if (_key) return _key;
    const hex = process.env.AADHAAR_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('[SECURITY] AADHAAR_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Set it in .env before using KYC.');
    }
    _key = Buffer.from(hex, 'hex');
    return _key;
}

export interface AadhaarEncrypted {
    encrypted: string;  // base64 ciphertext
    iv: string;         // base64 IV (16 bytes) — unique per encryption
    tag: string;        // base64 GCM auth tag (16 bytes)
}

/**
 * Encrypts an Aadhaar number using AES-256-GCM.
 * @param plaintext - Raw 12-digit Aadhaar (with or without spaces/hyphens)
 * @throws Error if format is invalid
 */
export function encryptAadhaar(plaintext: string): AadhaarEncrypted {
    const clean = plaintext.replace(/[\s\-]/g, '');

    // Validate UIDAI format: 12 digits, first digit 2-9, not all-same
    if (!/^[2-9][0-9]{11}$/.test(clean)) {
        throw new Error('INVALID_AADHAAR_FORMAT');
    }
    if (/^(\d)\1{11}$/.test(clean)) {
        throw new Error('INVALID_AADHAAR_FORMAT'); // All same digits
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(clean, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // DO NOT log clean, iv, or any derivative of plaintext here.
    return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    };
}

/**
 * Decrypts an Aadhaar number. Use only for permitted operations.
 * The caller MUST log this access to reservation_audit.
 * @returns The decrypted 12-digit Aadhaar string
 */
export function decryptAadhaar(enc: AadhaarEncrypted): string {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(enc.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(enc.tag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(enc.encrypted, 'base64')),
        decipher.final(),
    ]);
    // DO NOT log decrypted.toString('utf8')
    return decrypted.toString('utf8');
}

/**
 * Returns only the last 4 digits for display purposes.
 * Safe to show on screen — not personally identifying on its own.
 */
export function maskAadhaarLast4(enc: AadhaarEncrypted): string {
    try {
        const plain = decryptAadhaar(enc);
        return plain.slice(-4);
    } catch {
        return '????';
    }
}
