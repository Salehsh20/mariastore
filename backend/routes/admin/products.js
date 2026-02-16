const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabase');
const upload = require('../../middleware/upload');
const { processAndUploadImage, deleteImage } = require('../../utils/imageHandler');
const slugify = require('slugify');

// GET /api/admin/products — List all products (including inactive)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, category_id } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('products')
            .select(`
        id, name, slug, description, price, old_price, is_active, created_at, updated_at, category_id,
        categories (id, name, slug),
        product_images (id, image_url, thumbnail_url, is_primary, sort_order),
        product_colors (id, color_name, color_hex, image_url),
        product_sizes (id, size, in_stock)
      `, { count: 'exact' })
            .range(offset, offset + parseInt(limit) - 1)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        if (category_id) {
            query = query.eq('category_id', category_id);
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
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/admin/products/:id — Single product by ID
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
        id, name, slug, description, price, old_price, is_active, created_at, updated_at, category_id,
        categories (id, name, slug),
        product_images (id, image_url, thumbnail_url, is_primary, sort_order),
        product_colors (id, color_name, color_hex, image_url),
        product_sizes (id, size, in_stock)
      `)
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(data);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST /api/admin/products — Create product
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        const { name, description, price, old_price, category_id, colors, sizes } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();

        // Insert product
        const { data: product, error } = await supabase
            .from('products')
            .insert({
                name,
                slug,
                description: description || '',
                price: parseFloat(price),
                old_price: old_price ? parseFloat(old_price) : null,
                category_id: category_id || null,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        // Upload images
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const { fullUrl, thumbnailUrl } = await processAndUploadImage(
                    file.buffer,
                    file.originalname,
                    'products'
                );

                await supabase.from('product_images').insert({
                    product_id: product.id,
                    image_url: fullUrl,
                    thumbnail_url: thumbnailUrl,
                    is_primary: i === 0,
                    sort_order: i
                });
            }
        }

        // Insert colors
        if (colors) {
            const colorsArr = JSON.parse(colors);
            for (const color of colorsArr) {
                await supabase.from('product_colors').insert({
                    product_id: product.id,
                    color_name: color.name,
                    color_hex: color.hex,
                    image_url: color.image_url || null
                });
            }
        }

        // Insert sizes
        if (sizes) {
            const sizesArr = JSON.parse(sizes);
            for (const size of sizesArr) {
                await supabase.from('product_sizes').insert({
                    product_id: product.id,
                    size: size.size,
                    in_stock: size.in_stock !== false
                });
            }
        }

        // Fetch complete product
        const { data: fullProduct } = await supabase
            .from('products')
            .select(`
        *, categories (*), product_images (*), product_colors (*), product_sizes (*)
      `)
            .eq('id', product.id)
            .single();

        res.status(201).json(fullProduct);
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /api/admin/products/:id — Update product
router.put('/:id', upload.array('images', 10), async (req, res) => {
    try {
        const { name, description, price, old_price, category_id, is_active, colors, sizes } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) {
            updates.name = name;
            updates.slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();
        }
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = parseFloat(price);
        if (old_price !== undefined) updates.old_price = old_price ? parseFloat(old_price) : null;
        if (category_id !== undefined) updates.category_id = category_id || null;
        if (is_active !== undefined) updates.is_active = is_active === 'true' || is_active === true;

        const { data: product, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Upload new images if provided
        if (req.files && req.files.length > 0) {
            // Get current max sort_order
            const { data: existingImages } = await supabase
                .from('product_images')
                .select('sort_order')
                .eq('product_id', req.params.id)
                .order('sort_order', { ascending: false })
                .limit(1);

            let startOrder = existingImages && existingImages.length > 0
                ? existingImages[0].sort_order + 1
                : 0;

            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const { fullUrl, thumbnailUrl } = await processAndUploadImage(
                    file.buffer,
                    file.originalname,
                    'products'
                );

                await supabase.from('product_images').insert({
                    product_id: req.params.id,
                    image_url: fullUrl,
                    thumbnail_url: thumbnailUrl,
                    is_primary: false,
                    sort_order: startOrder + i
                });
            }
        }

        // Update colors if provided
        if (colors) {
            await supabase.from('product_colors').delete().eq('product_id', req.params.id);
            const colorsArr = JSON.parse(colors);
            for (const color of colorsArr) {
                await supabase.from('product_colors').insert({
                    product_id: req.params.id,
                    color_name: color.name,
                    color_hex: color.hex,
                    image_url: color.image_url || null
                });
            }
        }

        // Update sizes if provided
        if (sizes) {
            await supabase.from('product_sizes').delete().eq('product_id', req.params.id);
            const sizesArr = JSON.parse(sizes);
            for (const size of sizesArr) {
                await supabase.from('product_sizes').insert({
                    product_id: req.params.id,
                    size: size.size,
                    in_stock: size.in_stock !== false
                });
            }
        }

        // Fetch complete product
        const { data: fullProduct } = await supabase
            .from('products')
            .select(`
        *, categories (*), product_images (*), product_colors (*), product_sizes (*)
      `)
            .eq('id', req.params.id)
            .single();

        res.json(fullProduct);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE /api/admin/products/:id — Soft delete (toggle is_active)
router.delete('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Product deleted', product: data });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// DELETE /api/admin/products/:id/hard — Permanent delete with images
router.delete('/:id/hard', async (req, res) => {
    try {
        // Get all images to delete from storage
        const { data: images } = await supabase
            .from('product_images')
            .select('image_url')
            .eq('product_id', req.params.id);

        // Delete images from storage
        if (images) {
            for (const img of images) {
                await deleteImage(img.image_url);
            }
        }

        // Delete related records
        await supabase.from('product_images').delete().eq('product_id', req.params.id);
        await supabase.from('product_colors').delete().eq('product_id', req.params.id);
        await supabase.from('product_sizes').delete().eq('product_id', req.params.id);

        // Delete product
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Product permanently deleted' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// POST /api/admin/products/:id/images — Add images to existing product
router.post('/:id/images', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images provided' });
        }

        const { data: existingImages } = await supabase
            .from('product_images')
            .select('sort_order')
            .eq('product_id', req.params.id)
            .order('sort_order', { ascending: false })
            .limit(1);

        let startOrder = existingImages && existingImages.length > 0
            ? existingImages[0].sort_order + 1
            : 0;

        const uploadedImages = [];

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const { fullUrl, thumbnailUrl } = await processAndUploadImage(
                file.buffer,
                file.originalname,
                'products'
            );

            const { data: imgRecord, error } = await supabase
                .from('product_images')
                .insert({
                    product_id: req.params.id,
                    image_url: fullUrl,
                    thumbnail_url: thumbnailUrl,
                    is_primary: false,
                    sort_order: startOrder + i
                })
                .select()
                .single();

            if (!error) uploadedImages.push(imgRecord);
        }

        res.status(201).json(uploadedImages);
    } catch (err) {
        console.error('Error uploading images:', err);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// DELETE /api/admin/images/:id — Delete a single image
router.delete('/images/:id', async (req, res) => {
    try {
        const { data: image, error: fetchError } = await supabase
            .from('product_images')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Delete from storage
        await deleteImage(image.image_url);

        // Delete from DB
        const { error } = await supabase
            .from('product_images')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Image deleted' });
    } catch (err) {
        console.error('Error deleting image:', err);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// PUT /api/admin/images/:id/primary — Set image as primary
router.put('/images/:id/primary', async (req, res) => {
    try {
        const { data: image } = await supabase
            .from('product_images')
            .select('product_id')
            .eq('id', req.params.id)
            .single();

        if (!image) return res.status(404).json({ error: 'Image not found' });

        // Unset all primary for this product
        await supabase
            .from('product_images')
            .update({ is_primary: false })
            .eq('product_id', image.product_id);

        // Set this one as primary
        await supabase
            .from('product_images')
            .update({ is_primary: true })
            .eq('id', req.params.id);

        res.json({ message: 'Primary image updated' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to update primary image' });
    }
});

module.exports = router;
