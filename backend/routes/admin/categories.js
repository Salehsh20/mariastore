const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabase');
const upload = require('../../middleware/upload');
const { processAndUploadImage, deleteImage } = require('../../utils/imageHandler');
const slugify = require('slugify');

// GET /api/admin/categories
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// POST /api/admin/categories
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        const slug = slugify(name, { lower: true, strict: true });

        let image_url = null;
        if (req.file) {
            const result = await processAndUploadImage(
                req.file.buffer,
                req.file.originalname,
                'categories'
            );
            image_url = result.fullUrl;
        }

        const { data, error } = await supabase
            .from('categories')
            .insert({ name, slug, image_url })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// PUT /api/admin/categories/:id
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        const updates = {};

        if (name) {
            updates.name = name;
            updates.slug = slugify(name, { lower: true, strict: true });
        }

        if (req.file) {
            // Delete old image
            const { data: existing } = await supabase
                .from('categories')
                .select('image_url')
                .eq('id', req.params.id)
                .single();

            if (existing && existing.image_url) {
                await deleteImage(existing.image_url);
            }

            const result = await processAndUploadImage(
                req.file.buffer,
                req.file.originalname,
                'categories'
            );
            updates.image_url = result.fullUrl;
        }

        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', async (req, res) => {
    try {
        // Check if products use this category
        const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', req.params.id);

        if (count > 0) {
            return res.status(400).json({
                error: `Cannot delete category. ${count} products are using it. Reassign them first.`
            });
        }

        // Delete image from storage
        const { data: cat } = await supabase
            .from('categories')
            .select('image_url')
            .eq('id', req.params.id)
            .single();

        if (cat && cat.image_url) {
            await deleteImage(cat.image_url);
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

module.exports = router;
