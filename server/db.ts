import pg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    // Create email_recipients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_recipients (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        html_content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        html_content TEXT,
        template_id TEXT REFERENCES email_templates(id),
        recipient_ids JSONB NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        delay_seconds INTEGER NOT NULL DEFAULT 0,
        total_recipients INTEGER NOT NULL DEFAULT 0,
        sent_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id TEXT PRIMARY KEY,
        campaign_id TEXT REFERENCES email_campaigns(id) ON DELETE CASCADE,
        recipient_id TEXT REFERENCES email_recipients(id) ON DELETE CASCADE,
        recipient_email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indices
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON email_logs(campaign_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_id ON email_logs(recipient_id)');

    // Create mail_config table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mail_config (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL DEFAULT 'sendgrid',
        from_email TEXT NOT NULL,
        from_name TEXT NOT NULL,
        api_key TEXT,
        mailgun_api_key TEXT,
        mailgun_domain TEXT,
        mailgun_region TEXT DEFAULT 'us',
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        smtp_secure BOOLEAN DEFAULT false,
        is_configured BOOLEAN NOT NULL DEFAULT false,
        tracking_enabled BOOLEAN NOT NULL DEFAULT true,
        telegram_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
        telegram_bot_token TEXT,
        telegram_chat_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default config if it doesn't exist
    const { rows } = await client.query('SELECT id FROM mail_config LIMIT 1');
    if (rows.length === 0) {
      await client.query(`
        INSERT INTO mail_config (id, from_email, from_name, is_configured)
        VALUES ($1, $2, $3, $4)
      `, [uuidv4(), '', '', false]);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Don't throw if it's just a schema issue in production, but here we want to know
    throw error;
  } finally {
    client.release();
  }
};

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};
