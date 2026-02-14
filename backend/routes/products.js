const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/products — List products with pagination, search, filter
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            search,
            sort = 'created_at',
            order = 'desc'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('products')
            .select(`
        id, name, slug, description, price, old_price, is_active, created_at,
        categories (id, name, slug),
        product_images (id, image_url, thumbnail_url, is_primary, sort_order),
        product_colors (id, color_name, color_hex, image_url),
        product_sizes (id, size, in_stock)
      `, { count: 'exact' })
            .eq('is_active', true)
            .range(offset, offset + parseInt(limit) - 1)
            .order(sort, { ascending: order === 'asc' });

        // Filter by category slug
        if (category) {
            const { data: cat } = await supabase
                .from('categories')
                .select('id')
                .eq('slug', category)
                .single();

            if (cat) {
                query = query.eq('category_id', cat.id);
            }
        }

        // Search by name
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            products: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/products/:slug — Single product with all details
router.get('/:slug', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
        id, name, slug, description, price, old_price, is_active, created_at, updated_at,
        categories (id, name, slug),
        product_images (id, image_url, thumbnail_url, is_primary, sort_order),
        product_colors (id, color_name, color_hex, image_url),
        product_sizes (id, size, in_stock)
      `)
            .eq('slug', req.params.slug)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Sort images by sort_order
        if (data.product_images) {
            data.product_images.sort((a, b) => a.sort_order - b.sort_order);
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

module.exports = router;
