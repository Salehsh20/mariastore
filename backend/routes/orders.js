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
            // Order was created but items failed — still return order ID
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
