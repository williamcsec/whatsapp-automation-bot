import { query } from './db';

export interface Product {
  id: number;
  client_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  status: 'available' | 'reserved' | 'sold';
  image_url: string | null;
}

/**
 * Fetches all currently 'available' products for a specific client.
 * This ensures the AI never recommends products that are reserved or sold.
 */
export async function getAvailableProducts(clientId: string): Promise<Product[]> {
  const sql = `
    SELECT id, client_id, name, description, price, category, status, image_url
    FROM products
    WHERE client_id = $1 AND status = 'available'
  `;

  const result = await query<Product>(sql, [clientId]);
  return result.rows;
}

/**
 * Validates if specific product IDs are still available.
 * Used before attempting to generate a payment link.
 */
export async function verifyProductsAvailability(clientId: string, productIds: number[]): Promise<boolean> {
  if (!productIds || productIds.length === 0) return false;

  const sql = `
    SELECT id FROM products 
    WHERE client_id = $1 AND status = 'available' AND id = ANY($2)
  `;

  const result = await query(sql, [clientId, productIds]);
  // If the number of returned available products matches the requested array length, they are all still available.
  return result.rowCount === productIds.length;
}

/**
 * Permanently changes a product's status to 'sold' so the AI never sees it again.
 */
export async function markProductAsSold(productId: number): Promise<void> {
  const sql = `
        UPDATE products 
        SET status = 'sold' 
        WHERE id = $1
    `;
  await query(sql, [productId]);
}
