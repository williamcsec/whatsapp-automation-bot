import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { webhookRouter } from './routes/webhook';
import { webhookTestRouter } from './routes/webhookTest';

export const app = express();

// --- Security Headers ---
app.use(helmet());

// --- CORS: Lock down to dashboard + YCloud origins ---
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.DASHBOARD_URL, // Production dashboard URL
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, webhooks)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// --- Rate Limiting: Global 100 req/min per IP ---
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down' },
});
app.use(globalLimiter);

// --- Body Parser with raw body preservation for webhook HMAC ---
app.use(express.json({
    limit: '1mb',
    verify: (req: any, res, buf) => {
        req.rawBody = buf.toString('utf-8');
    }
}));

// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Mount Routers ---
app.use('/webhook', webhookRouter);
app.use('/webhook', webhookTestRouter);
