import { query } from '../services/db';
import { ExtractedWebhookData } from '../services/ycloud';

/**
 * Store the inbound message into the conversations table securely.
 * @returns The database ID of the created conversation row.
 */
export async function storeIncomingMessage(
  data: ExtractedWebhookData, 
  clientId: string = 'default_client',
  isHumanOverride: boolean = false
): Promise<number> {
  const sql = `
    INSERT INTO conversations (
      client_id, 
      ycloud_event_id, 
      ycloud_message_id, 
      waba_id, 
      customer_phone, 
      direction, 
      message_type, 
      text_body, 
      ycloud_timestamp,
      is_human_override
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (ycloud_message_id) DO NOTHING
    RETURNING id;
  `;

  const values = [
    clientId,
    data.ycloud_event_id,
    data.ycloud_message_id,
    data.waba_id,
    data.from_number,
    'inbound',
    data.message_type,
    data.text_body,
    data.ycloud_timestamp ? (
        /^\d+$/.test(data.ycloud_timestamp) 
            ? new Date(parseInt(data.ycloud_timestamp) * 1000) 
            : new Date(data.ycloud_timestamp)
    ) : new Date(),
    isHumanOverride
  ];

  const result = await query(sql, values);

  if (result.rowCount === 0) {
    // If conflict DO NOTHING hit, returning id will be empty.
    // Let's fetch the existing ID for idempotency:
    const existing = await query(`SELECT id FROM conversations WHERE ycloud_message_id = $1`, [data.ycloud_message_id]);
    return existing.rows[0].id;
  }

  return result.rows[0].id;
}

/**
 * Store an outbound message log directly to the conversations table.
 */
export async function storeOutboundMessage(toPhone: string, text: string, clientId: string = 'default_client'): Promise<number> {
  const sql = `
      INSERT INTO conversations (
        client_id, 
        customer_phone, 
        direction, 
        message_type, 
        text_body, 
        message_status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

  const values = [
    clientId,
    toPhone,
    'outbound',
    'text',
    text,
    'sent'
  ];

  const result = await query(sql, values);
  return result.rows[0].id;
}
