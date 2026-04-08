import { acquireLock, releaseLock } from './redis';

const RESERVATION_TTL_MS = 120000; // 2 minutes

/**
 * Attempts to reserve a product for a specific client and customer.
 * Uses a Redis distributed lock to prevent double-booking (race conditions).
 */
export async function reserveProduct(clientId: string, productId: number, customerPhone: string): Promise<boolean> {
    const lockKey = `reservation:${clientId}:product:${productId}`;
    // The lock value identifies WHO holds the lock, so we can release it safely later or verify ownership
    const lockValue = customerPhone;

    const acquired = await acquireLock(lockKey, lockValue, RESERVATION_TTL_MS);

    if (acquired) {
        console.log(`[RESERVATION] Product ${productId} locked for ${customerPhone} for 2 minutes.`);
        return true;
    } else {
        console.log(`[RESERVATION FAILED] Product ${productId} is already locked.`);
        return false;
    }
}

/**
 * Manually releases a product reservation early (e.g., if checkout is cancelled).
 */
export async function releaseProductReservation(clientId: string, productId: number, customerPhone: string): Promise<boolean> {
    const lockKey = `reservation:${clientId}:product:${productId}`;
    const lockValue = customerPhone;

    const released = await releaseLock(lockKey, lockValue);
    if (released) {
        console.log(`[RESERVATION RELEASED] Product ${productId} unlocked for ${customerPhone}.`);
    } else {
        console.log(`[RESERVATION RELEASE FAILED] Product ${productId} lock not held by ${customerPhone} or already expired.`);
    }
    return released;
}
