// ── Orders API Routes (Public) ──
// Handles order placement from the checkout form

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/orders — Place a new order
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, phone, address, items, notes } = req.body;

        // ── Validate required fields ──
        if (!firstName || !lastName || !phone || !address) {
            return res.status(400).json({ error: 'First name, last name, phone, and address are required.' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart must have at least one item.' });
        }

        // ── Validate each item before it feeds into the total ──
        for (const item of items) {
            const price = parseFloat(item.price);
            const quantity = parseInt(item.quantity);
            if (!item.name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({ error: 'Cart contains an invalid item. Please refresh and try again.' });
            }
        }

        // ── Calculate total from items ──
        const total = items.reduce((sum, item) => {
            return sum + (parseFloat(item.price) * parseInt(item.quantity));
        }, 0);

        // ── Insert order ──
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone: phone.trim(),
                address: address.trim(),
                total: total.toFixed(2),
                status: 'pending',
                notes: notes || null
            })
            .select()
            .single();

        if (orderError) {
            console.error('Order insert error:', orderError);
            return res.status(500).json({ error: 'Failed to place order. Please try again.' });
        }

        // ── Insert order items ──
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.id || null,
            product_name: item.name,
            product_image: item.image || null,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            color: item.color || null,
            size: item.size || null
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('Order items insert error:', itemsError);

            // Never leave an order holding a total with no record of what was
            // ordered — roll it back so the customer sees a real failure and
            // can retry, instead of a silent success.
            const { error: rollbackError } = await supabase
                .from('orders')
                .delete()
                .eq('id', order.id);

            if (rollbackError) {
                console.error('CRITICAL: could not roll back order', order.id, rollbackError);
            }

            return res.status(500).json({ error: 'Failed to place order. Please try again.' });
        }

        res.status(201).json({
            message: 'Order placed successfully!',
            orderId: order.id,
            orderNumber: order.order_number
        });

    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
