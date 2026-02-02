import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import { sendEmail, processTemplateVariables } from './mailer.js';

const router = express.Router();

// --- Recipients ---
router.get('/recipients', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM email_recipients ORDER BY created_at DESC');
        res.json(rows);
    } catch (error: any) {
        console.error('Failed to get recipients:', error);
        res.status(500).json({ error: 'Failed to get recipients', message: error.message });
    }
});

router.post('/recipients', async (req, res) => {
    try {
        const { email, name } = req.body;
        const id = uuidv4();
        await db.query('INSERT INTO email_recipients (id, email, name) VALUES ($1, $2, $3)', [id, email, name]);
        const { rows } = await db.query('SELECT * FROM email_recipients WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (error: any) {
        console.error('Failed to create recipient:', error);
        res.status(500).json({ error: 'Failed to create recipient', message: error.message });
    }
});

router.post('/recipients/bulk', async (req, res) => {
    const client = await db.pool.connect();
    try {
        const recipients = req.body; // Expects array of { email, name? }
        if (!Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'Invalid input: expected non-empty array of recipients' });
        }

        await client.query('BEGIN');

        // We use a single query for efficiency. 
        // Note: For extremely large batches (e.g. 10k+), we might need to chunk this, 
        // but for <1000 items this is fine.
        const values: any[] = [];
        const placeholders: string[] = [];

        recipients.forEach((r, index) => {
            const i = index * 3;
            values.push(uuidv4(), r.email, r.name || null);
            placeholders.push(`($${i + 1}, $${i + 2}, $${i + 3})`);
        });

        const query = `
            INSERT INTO email_recipients (id, email, name) 
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (email) DO NOTHING
        `;

        await client.query(query, values);
        await client.query('COMMIT');

        res.json({ success: true, count: recipients.length });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Failed to bulk add recipients:', error);
        res.status(500).json({ error: 'Failed to bulk add recipients', message: error.message });
    } finally {
        client.release();
    }
});

router.delete('/recipients/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        await client.query('DELETE FROM email_logs WHERE recipient_id = $1', [id]);
        await client.query('DELETE FROM email_recipients WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(204).end();
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`ERROR: Failed to delete recipient ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to delete recipient',
            message: error.message,
            stack: error.stack
        });
    } finally {
        client.release();
    }
});

// --- Templates ---
router.get('/templates', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM email_templates ORDER BY created_at DESC');
        res.json(rows);
    } catch (error: any) {
        console.error('Failed to get templates:', error);
        res.status(500).json({ error: 'Failed to get templates', message: error.message });
    }
});

router.post('/templates', async (req, res) => {
    try {
        const { name, subject, html_content } = req.body;
        const id = uuidv4();
        await db.query('INSERT INTO email_templates (id, name, subject, html_content) VALUES ($1, $2, $3, $4)', [id, name, subject, html_content]);
        const { rows } = await db.query('SELECT * FROM email_templates WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (error: any) {
        console.error('Failed to create template:', error);
        res.status(500).json({ error: 'Failed to create template', message: error.message });
    }
});

router.delete('/templates/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM email_templates WHERE id = $1', [req.params.id]);
        res.status(204).end();
    } catch (error: any) {
        console.error('Failed to delete template:', error);
        res.status(500).json({ error: 'Failed to delete template', message: error.message });
    }
});

// --- Campaigns ---
router.get('/campaigns', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM email_campaigns ORDER BY created_at DESC');
        // recipient_ids is already JSONB in Postgres, no need to parse if pg-types handles it
        // but if it's stored as JSON string in JSONB, we might need a map.
        // Usually pg-types parses JSONB automatically.
        res.json(rows);
    } catch (error: any) {
        console.error('Failed to get campaigns:', error);
        res.status(500).json({ error: 'Failed to get campaigns', message: error.message });
    }
});

router.post('/campaigns', async (req, res) => {
    try {
        const { name, subject, html_content, template_id, recipient_ids, delay_seconds, scheduled_at } = req.body;
        const id = uuidv4();
        const status = scheduled_at ? 'scheduled' : 'draft';

        await db.query(`
            INSERT INTO email_campaigns (id, name, subject, html_content, template_id, recipient_ids, delay_seconds, status, scheduled_at, total_recipients)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [id, name, subject, html_content, template_id, recipient_ids, delay_seconds, status, scheduled_at, recipient_ids.length]);

        const { rows } = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (error: any) {
        console.error('Failed to create campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign', message: error.message });
    }
});

router.delete('/campaigns/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        const id = req.params.id;
        await client.query('BEGIN');
        await client.query('DELETE FROM email_logs WHERE campaign_id = $1', [id]);
        await client.query('DELETE FROM email_campaigns WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(204).end();
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`ERROR: Failed to delete campaign ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to delete campaign',
            message: error.message,
            stack: error.stack
        });
    } finally {
        client.release();
    }
});

router.patch('/campaigns/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.query('UPDATE email_campaigns SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true, status });
    } catch (error: any) {
        console.error('Failed to update campaign status:', error);
        res.status(500).json({ error: 'Failed to update campaign status', message: error.message });
    }
});

// --- Config ---
router.get('/config', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM mail_config LIMIT 1');
        res.json(rows[0]);
    } catch (error: any) {
        console.error('Failed to get config:', error);
        res.status(500).json({ error: 'Failed to get config', message: error.message });
    }
});

router.post('/config', async (req, res) => {
    try {
        const { rows: currentConfigRows } = await db.query('SELECT id FROM mail_config LIMIT 1');
        const currentConfig = currentConfigRows[0];
        const {
            provider, from_email, from_name, api_key,
            mailgun_api_key, mailgun_domain,
            smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure,
            is_configured, tracking_enabled,
            telegram_notifications_enabled, telegram_bot_token, telegram_chat_id
        } = req.body;

        if (currentConfig) {
            await db.query(`
                UPDATE mail_config SET 
                    provider = $1, from_email = $2, from_name = $3, api_key = $4, 
                    mailgun_api_key = $5, mailgun_domain = $6, mailgun_region = $7,
                    smtp_host = $8, smtp_port = $9, smtp_user = $10, smtp_pass = $11, smtp_secure = $12,
                    is_configured = $13, tracking_enabled = $14, telegram_notifications_enabled = $15, 
                    telegram_bot_token = $16, telegram_chat_id = $17, updated_at = CURRENT_TIMESTAMP
                WHERE id = $18
            `, [
                provider || 'sendgrid', from_email, from_name, api_key,
                mailgun_api_key, mailgun_domain, req.body.mailgun_region || 'us',
                smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure,
                is_configured, tracking_enabled, telegram_notifications_enabled,
                telegram_bot_token, telegram_chat_id, currentConfig.id
            ]);
        } else {
            await db.query(`
                INSERT INTO mail_config (
                    id, provider, from_email, from_name, api_key, 
                    mailgun_api_key, mailgun_domain, mailgun_region,
                    smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure,
                    is_configured, tracking_enabled, telegram_notifications_enabled, telegram_bot_token, telegram_chat_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            `, [
                uuidv4(), provider || 'sendgrid', from_email, from_name, api_key,
                mailgun_api_key, mailgun_domain, req.body.mailgun_region || 'us',
                smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure,
                is_configured, tracking_enabled, telegram_notifications_enabled, telegram_bot_token, telegram_chat_id
            ]);
        }

        const { rows } = await db.query('SELECT * FROM mail_config LIMIT 1');
        res.json(rows[0]);
    } catch (error: any) {
        console.error('Failed to update config:', error);
        res.status(500).json({ error: 'Failed to update config', message: error.message });
    }
});

// --- Stats & Logs ---
router.get('/campaigns/:id/logs', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM email_logs WHERE campaign_id = $1 ORDER BY created_at DESC', [req.params.id]);
        res.json(rows);
    } catch (error: any) {
        console.error('Failed to get logs:', error);
        res.status(500).json({ error: 'Failed to get logs', message: error.message });
    }
});

router.get('/stats/summary', async (req, res) => {
    try {
        const { rows: sentRows } = await db.query('SELECT SUM(sent_count) as total FROM email_campaigns');
        const { rows: failedRows } = await db.query('SELECT SUM(failed_count) as total FROM email_campaigns');
        const { rows: countRows } = await db.query('SELECT COUNT(*) as total FROM email_campaigns');

        const totalSent = parseInt(sentRows[0]?.total || '0', 10);
        const totalFailed = parseInt(failedRows[0]?.total || '0', 10);
        const totalCampaigns = parseInt(countRows[0]?.total || '0', 10);

        res.json({ totalSent, totalFailed, totalCampaigns });
    } catch (error: any) {
        console.error('Failed to get stats:', error);
        res.status(500).json({ error: 'Failed to get stats', message: error.message });
    }
});

// --- Test Email ---
router.post('/test-email', async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        const { rows } = await db.query('SELECT * FROM mail_config LIMIT 1');
        const config = rows[0];

        if (!config || !config.is_configured) {
            return res.status(400).json({ error: 'Email provider not configured' });
        }

        // Mock recipient for variable substitution
        const recipient = { email: to, name: 'Test User' };
        // We pass empty baseUrl since tracking is disabled for tests
        const processedHtml = processTemplateVariables(html, recipient, 'test-id', false, '');

        const result = await sendEmail(to, subject, processedHtml, config);

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error: any) {
        console.error('Failed to send test email:', error);
        res.status(500).json({ error: 'Failed to send test email', message: error.message });
    }
});

export default router;
