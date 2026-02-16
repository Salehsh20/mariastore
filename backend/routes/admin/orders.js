// ── Admin Orders Routes ──
// Handles viewing and managing orders (admin only)

const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabase');

// GET /api/admin/orders — Get all orders with items
router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        let query = supabase
            .from('orders')
            .select('*, order_items(*)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        // Filter by status if provided
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: orders, error, count } = await query;

        if (error) {
            console.error('Fetch orders error:', error);
            return res.status(500).json({ error: 'Failed to fetch orders.' });
        }

        res.json({
            orders: orders || [],
            total: count || 0,
            page: parseInt(page),
            totalPages: Math.ceil((count || 0) / parseInt(limit))
        });

    } catch (err) {
        console.error('Orders error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/orders/:id — Get single order details
router.get('/:id', async (req, res) => {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', req.params.id)
            .single();

        if (error || !order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        res.json(order);

    } catch (err) {
        console.error('Order detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/orders/:id/status — Update order status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const { data, error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            console.error('Update status error:', error);
            return res.status(500).json({ error: 'Failed to update order status.' });
        }

        res.json({ message: 'Status updated.', order: data });

    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/orders/:id — Delete an order
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            console.error('Delete order error:', error);
            return res.status(500).json({ error: 'Failed to delete order.' });
        }

        res.json({ message: 'Order deleted.' });

    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
