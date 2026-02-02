import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import apiRoutes from './routes.js';
import { processCampaign } from './mailer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Root API info
app.get('/api', (req, res) => {
    res.json({ message: 'Mail Muse API is running', version: '1.0.0' });
});

// Special route to start campaign (calls mailer logic)
app.post('/api/campaigns/:id/start', async (req, res) => {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Non-blocking start
    processCampaign(id, baseUrl);

    res.json({ success: true, message: 'Campaign started' });
});

// Tracking Pixel (stub)
app.get('/api/track-email', (req, res) => {
    const { id, type } = req.query;
    console.log(`Tracking event: ${type} for log ${id}`);

    // Return a 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
    });
    res.end(pixel);
});

// Serve Static Files in Production
const distPath = path.resolve(__dirname, '..');
app.use(express.static(distPath));

// Catch-all to serve index.html for SPA
app.get('*', (req, res) => {
    // Only serve index.html if it's not an API route
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.status(404).json({
            error: 'API route not found',
            path: req.path,
        });
    }
});

// Initialize Database and Start Server
const startServer = async () => {
    try {
        await initDb();
        console.log('Database initialized successfully');

        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
