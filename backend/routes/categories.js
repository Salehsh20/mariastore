const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/categories — List all categories
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name, slug, image_url, created_at')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// GET /api/categories/:slug/products — Products by category
router.get('/:slug/products', async (req, res) => {
    try {
        const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get category
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('id, name, slug, image_url')
            .eq('slug', req.params.slug)
            .single();

        if (catError || !category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Get products in category
        const { data: products, error, count } = await supabase
            .from('products')
            .select(`
        id, name, slug, description, price, old_price, is_active, created_at,
        product_images (id, image_url, thumbnail_url, is_primary, sort_order),
        product_colors (id, color_name, color_hex),
        product_sizes (id, size, in_stock)
      `, { count: 'exact' })
            .eq('category_id', category.id)
            .eq('is_active', true)
            .range(offset, offset + parseInt(limit) - 1)
            .order(sort, { ascending: order === 'asc' });

        if (error) throw error;

        res.json({
            category,
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error fetching category products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

module.exports = router;
