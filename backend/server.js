require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security ────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // Allow inline styles/scripts for simplicity
}));

app.use(cors({
    origin: '*', // In production, restrict to your domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // Increased limit for development
    message: { error: 'Too many login attempts, please try again later.' }
});

// ── Body parsing ────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files ────────────────────────────────────
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/assets', express.static(path.join(__dirname, '..', 'public', 'assets')));

// ── API Routes ──────────────────────────────────────
// Public routes
app.use('/api/products', apiLimiter, require('./routes/products'));
app.use('/api/categories', apiLimiter, require('./routes/categories'));
app.use('/api/orders', apiLimiter, require('./routes/orders'));

// WhatsApp link generator endpoint
const { generateWhatsAppLink } = require('./utils/whatsapp');
app.post('/api/whatsapp-link', apiLimiter, (req, res) => {
    const { items, total } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Cart items are required' });
    }
    const link = generateWhatsAppLink(items, total || 0);
    res.json({ link, whatsappNumber: process.env.WHATSAPP_NUMBER });
});

// Admin routes
const authMiddleware = require('./middleware/auth');
app.use('/api/admin/auth', authLimiter, require('./routes/admin/auth'));
app.use('/api/admin/products', authMiddleware, require('./routes/admin/products'));
app.use('/api/admin/categories', authMiddleware, require('./routes/admin/categories'));
app.use('/api/admin/orders', authMiddleware, require('./routes/admin/orders'));

// Admin dashboard stats
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
    try {
        const supabase = require('./config/supabase');

        const [products, activeProducts, categories] = await Promise.all([
            supabase.from('products').select('id', { count: 'exact', head: true }),
            supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('categories').select('id', { count: 'exact', head: true })
        ]);

        res.json({
            totalProducts: products.count || 0,
            activeProducts: activeProducts.count || 0,
            totalCategories: categories.count || 0
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ── SPA Fallback routes ─────────────────────────────
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    }
});

// ── Error handling ──────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum 10MB allowed.' });
    }
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start server (skip in Vercel serverless) ────────
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`MariaStore server running on http://localhost:${PORT}`);
        console.log(`Admin panel: http://localhost:${PORT}/admin`);
        console.log(`API: http://localhost:${PORT}/api`);
    });
}

// Export for Vercel serverless
module.exports = app;
