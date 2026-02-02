import axios from 'axios';
import nodemailer from 'nodemailer';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const sleep = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

export const processTemplateVariables = (
    htmlContent: string,
    recipient: { email: string; name?: string },
    logId: string,
    trackingEnabled: boolean,
    baseUrl: string
): string => {
    let processed = htmlContent || '';
    processed = processed.replace(/\{\{name\}\}/gi, recipient.name || recipient.email.split('@')[0]);
    processed = processed.replace(/\{\{email\}\}/gi, recipient.email);

    if (trackingEnabled) {
        const trackingPixelUrl = `${baseUrl}/api/track-email?id=${logId}&type=open`;
        const trackingPixel = `<img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:none;visibility:hidden;" />`;

        if (htmlContent.toLowerCase().includes('{{tracking}}')) {
            processed = processed.replace(/\{\{tracking\}\}/gi, trackingPixel);
        } else if (processed.toLowerCase().includes('</body>')) {
            processed = processed.replace(/<\/body>/i, `${trackingPixel}</body>`);
        } else {
            processed += trackingPixel;
        }
    } else {
        processed = processed.replace(/\{\{tracking\}\}/gi, '');
    }
    return processed;
};

const sendWithSendGrid = async (
    to: string,
    subject: string,
    htmlContent: string,
    fromEmail: string,
    fromName: string,
    apiKey: string
) => {
    try {
        await axios.post(
            'https://api.sendgrid.com/v3/mail/send',
            {
                personalizations: [{ to: [{ email: to }] }],
                from: { email: fromEmail, name: fromName },
                subject,
                content: [{ type: 'text/html', value: htmlContent }],
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return { success: true };
    } catch (error: any) {
        console.error(`SendGrid error for ${to}:`, error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

const sendWithMailgun = async (
    to: string,
    subject: string,
    htmlContent: string,
    fromEmail: string,
    fromName: string,
    apiKey: string,
    domain: string,
    region: string = 'us'
) => {
    try {
        const auth = Buffer.from(`api:${apiKey}`).toString('base64');
        const baseUrl = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
        const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

        await axios.post(
            `${baseUrl}/v3/${domain}/messages`,
            new URLSearchParams({
                from,
                to,
                subject,
                html: htmlContent,
            }),
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                },
            }
        );
        return { success: true };
    } catch (error: any) {
        console.error(`Mailgun error for ${to}:`, error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

const sendWithSMTP = async (
    to: string,
    subject: string,
    htmlContent: string,
    fromEmail: string,
    fromName: string,
    host: string,
    port: number,
    user: string,
    pass: string,
    secure: boolean
) => {
    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
        });

        await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html: htmlContent,
        });
        return { success: true };
    } catch (error: any) {
        console.error(`SMTP error for ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

export const sendEmail = async (
    to: string,
    subject: string,
    htmlContent: string,
    config: any
) => {
    if (config.provider === 'mailgun') {
        return sendWithMailgun(
            to,
            subject,
            htmlContent,
            config.from_email,
            config.from_name,
            config.mailgun_api_key,
            config.mailgun_domain,
            config.mailgun_region
        );
    } else if (config.provider === 'smtp') {
        return sendWithSMTP(
            to,
            subject,
            htmlContent,
            config.from_email,
            config.from_name,
            config.smtp_host,
            config.smtp_port,
            config.smtp_user,
            config.smtp_pass,
            config.smtp_secure
        );
    } else {
        // Default to SendGrid
        return sendWithSendGrid(
            to,
            subject,
            htmlContent,
            config.from_email,
            config.from_name,
            config.api_key
        );
    }
};

export const processCampaign = async (campaignId: string, baseUrl: string) => {
    const { rows: campaignRows } = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [campaignId]);
    const campaign = campaignRows[0];
    if (!campaign) return;

    const { rows: configRows } = await db.query('SELECT * FROM mail_config LIMIT 1');
    const config = configRows[0];
    if (!config || !config.is_configured) {
        console.error('Email provider not configured');
        await db.query('UPDATE email_campaigns SET status = $1 WHERE id = $2', ['failed', campaignId]);
        return;
    }

    console.log(`Starting campaign ${campaignId} using ${config.provider} provider`);

    const recipientIds = campaign.recipient_ids;
    // Postgres ANY($1) for array lookup
    const { rows: recipients } = await db.query('SELECT * FROM email_recipients WHERE id = ANY($1)', [recipientIds]);

    await db.query('UPDATE email_campaigns SET status = $1, total_recipients = $2 WHERE id = $3', ['sending', recipients.length, campaignId]);

    let baseHtmlContent = campaign.html_content;
    if (!baseHtmlContent && campaign.template_id) {
        const { rows: templateRows } = await db.query('SELECT html_content FROM email_templates WHERE id = $1', [campaign.template_id]);
        baseHtmlContent = templateRows[0]?.html_content || '';
    }

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i++) {
        try {
            // Check for pause or cancellation
            const { rows: statusRows } = await db.query('SELECT status FROM email_campaigns WHERE id = $1', [campaignId]);
            let currentStatus = statusRows[0]?.status;

            while (currentStatus === 'paused') {
                await sleep(5);
                const { rows: statusRows2 } = await db.query('SELECT status FROM email_campaigns WHERE id = $1', [campaignId]);
                currentStatus = statusRows2[0]?.status;
            }

            if (currentStatus !== 'sending') {
                console.log(`Campaign ${campaignId} stopped (status: ${currentStatus})`);
                return;
            }

            const recipient = recipients[i];
            const logId = uuidv4();

            await db.query(`
                INSERT INTO email_logs (id, campaign_id, recipient_id, recipient_email, status)
                VALUES ($1, $2, $3, $4, $5)
            `, [logId, campaignId, recipient.id, recipient.email, 'pending']);

            const personalizedHtml = processTemplateVariables(
                baseHtmlContent,
                recipient,
                logId,
                config.tracking_enabled,
                baseUrl
            );

            const result = await sendEmail(
                recipient.email,
                campaign.subject,
                personalizedHtml,
                config
            );

            await db.query(`
                UPDATE email_logs SET status = $1, error_message = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3
            `, [result.success ? 'sent' : 'failed', result.error ? JSON.stringify(result.error) : null, logId]);

            await db.query('UPDATE email_recipients SET status = $1 WHERE id = $2', [result.success ? 'sent' : 'failed', recipient.id]);

            if (result.success) sentCount++;
            else failedCount++;

            await db.query('UPDATE email_campaigns SET sent_count = $1, failed_count = $2 WHERE id = $3', [sentCount, failedCount, campaignId]);

            if (i < recipients.length - 1 && campaign.delay_seconds > 0) {
                await sleep(campaign.delay_seconds);
            }
        } catch (error: any) {
            console.error(`Error processing recipient in campaign ${campaignId}:`, error.message);
            const { rows: statusRows } = await db.query('SELECT status FROM email_campaigns WHERE id = $1', [campaignId]);
            if (statusRows.length === 0) return;
        }
    }

    const finalStatus = failedCount === recipients.length ? 'failed' : 'sent';
    await db.query('UPDATE email_campaigns SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2', [finalStatus, campaignId]);

    // Telegram notification
    if (config.telegram_notifications_enabled && config.telegram_bot_token && config.telegram_chat_id) {
        try {
            const message = `📧 Campaign Completed: ${campaign.name}\n✅ Sent: ${sentCount}\n❌ Failed: ${failedCount}`;
            await axios.post(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
                chat_id: config.telegram_chat_id,
                text: message,
            });
        } catch (e) {
            console.error('Failed to send Telegram notification');
        }
    }
};
