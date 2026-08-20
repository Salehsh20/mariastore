const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabase');
const upload = require('../../middleware/upload');
const { processAndUploadImages, deleteImage } = require('../../utils/imageHandler');
const slugify = require('slugify');

// Cap every image route with the same limit multer enforces
const MAX_IMAGES = upload.MAX_FILES;

// ── Payload parsers ─────────────────────────────────
// Colors and sizes arrive as JSON strings in multipart form data. These throw
// on a malformed payload so the caller can answer 400 instead of silently
// saving nothing.

// Expected: [{ name, hex, image_url? }]
function parseColors(raw, productId) {
    let arr;
    try {
        arr = JSON.parse(raw);
    } catch (err) {
        throw new Error('Colors must be valid JSON');
    }
    if (!Array.isArray(arr)) throw new Error('Colors must be an array');

    return arr.map(color => {
        if (!color || typeof color !== 'object' || !color.name) {
            throw new Error('Each color needs a name — expected [{ name, hex }]');
        }
        return {
            product_id: productId,
            color_name: color.name,
            color_hex: color.hex,
            image_url: color.image_url || null
        };
    });
}

// Expected: [{ size, in_stock? }] — a bare ["S", "M"] is accepted too
function parseSizes(raw, productId) {
    let arr;
    try {
        arr = JSON.parse(raw);
    } catch (err) {
        throw new Error('Sizes must be valid JSON');
    }
    if (!Array.isArray(arr)) throw new Error('Sizes must be an array');

    return arr.map(entry => {
        const isObject = entry && typeof entry === 'object';
        const size = isObject ? entry.size : entry;
        if (!size) {
            throw new Error('Each size needs a value — expected [{ size, in_stock }]');
        }
        return {
            product_id: productId,
            size,
            in_stock: isObject ? entry.in_stock !== false : true
        };
    });
}

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
router.post('/', upload.array('images', MAX_IMAGES), async (req, res) => {
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

        // A product whose colors, sizes or images failed to save is worse than
        // no product at all — the admin has no way to tell it is incomplete.
        // Undo everything and report the failure instead.
        const uploadedUrls = [];
        const abort = async (message, status, detail) => {
            console.error('Product create aborted:', message, detail || '');
            for (const url of uploadedUrls) {
                await deleteImage(url);
            }
            // product_images / product_colors / product_sizes cascade on delete
            await supabase.from('products').delete().eq('id', product.id);
            return res.status(status).json({ error: message });
        };

        // Upload images
        if (req.files && req.files.length > 0) {
            let uploaded;
            try {
                uploaded = await processAndUploadImages(req.files, 'products');
            } catch (uploadErr) {
                return abort('Failed to process product images', 500, uploadErr);
            }

            const imageRows = uploaded.map(({ fullUrl, thumbnailUrl }, i) => {
                uploadedUrls.push(fullUrl);
                return {
                    product_id: product.id,
                    image_url: fullUrl,
                    thumbnail_url: thumbnailUrl,
                    is_primary: i === 0,
                    sort_order: i
                };
            });

            const { error: imageError } = await supabase.from('product_images').insert(imageRows);
            if (imageError) return abort('Failed to save product images', 500, imageError);
        }

        // Insert colors
        if (colors) {
            let colorRows;
            try {
                colorRows = parseColors(colors, product.id);
            } catch (parseErr) {
                return abort(parseErr.message, 400);
            }

            if (colorRows.length > 0) {
                const { error: colorError } = await supabase.from('product_colors').insert(colorRows);
                if (colorError) return abort('Failed to save product colors', 500, colorError);
            }
        }

        // Insert sizes
        if (sizes) {
            let sizeRows;
            try {
                sizeRows = parseSizes(sizes, product.id);
            } catch (parseErr) {
                return abort(parseErr.message, 400);
            }

            if (sizeRows.length > 0) {
                const { error: sizeError } = await supabase.from('product_sizes').insert(sizeRows);
                if (sizeError) return abort('Failed to save product sizes', 500, sizeError);
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
router.put('/:id', upload.array('images', MAX_IMAGES), async (req, res) => {
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

            let uploaded;
            try {
                uploaded = await processAndUploadImages(req.files, 'products');
            } catch (uploadErr) {
                console.error('Image processing error:', uploadErr);
                return res.status(500).json({ error: 'Failed to process product images' });
            }

            const imageRows = uploaded.map(({ fullUrl, thumbnailUrl }, i) => ({
                product_id: req.params.id,
                image_url: fullUrl,
                thumbnail_url: thumbnailUrl,
                is_primary: false,
                sort_order: startOrder + i
            }));

            const { error: imageError } = await supabase.from('product_images').insert(imageRows);
            if (imageError) {
                console.error('Image insert error:', imageError);
                // Don't leave orphaned files sitting in storage
                for (const row of imageRows) {
                    await deleteImage(row.image_url);
                }
                return res.status(500).json({ error: 'Failed to save product images' });
            }
        }

        // Update colors if provided — parse before deleting, so a malformed
        // payload can't wipe the rows it was meant to replace
        if (colors) {
            let colorRows;
            try {
                colorRows = parseColors(colors, req.params.id);
            } catch (parseErr) {
                return res.status(400).json({ error: parseErr.message });
            }

            await supabase.from('product_colors').delete().eq('product_id', req.params.id);

            if (colorRows.length > 0) {
                const { error: colorError } = await supabase.from('product_colors').insert(colorRows);
                if (colorError) {
                    console.error('Color update error:', colorError);
                    return res.status(500).json({ error: 'Failed to update product colors' });
                }
            }
        }

        // Update sizes if provided — same parse-then-replace ordering
        if (sizes) {
            let sizeRows;
            try {
                sizeRows = parseSizes(sizes, req.params.id);
            } catch (parseErr) {
                return res.status(400).json({ error: parseErr.message });
            }

            await supabase.from('product_sizes').delete().eq('product_id', req.params.id);

            if (sizeRows.length > 0) {
                const { error: sizeError } = await supabase.from('product_sizes').insert(sizeRows);
                if (sizeError) {
                    console.error('Size update error:', sizeError);
                    return res.status(500).json({ error: 'Failed to update product sizes' });
                }
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
router.post('/:id/images', upload.array('images', MAX_IMAGES), async (req, res) => {
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

        const uploaded = await processAndUploadImages(req.files, 'products');

        const imageRows = uploaded.map(({ fullUrl, thumbnailUrl }, i) => ({
            product_id: req.params.id,
            image_url: fullUrl,
            thumbnail_url: thumbnailUrl,
            is_primary: false,
            sort_order: startOrder + i
        }));

        const { data: uploadedImages, error: imageError } = await supabase
            .from('product_images')
            .insert(imageRows)
            .select();

        if (imageError) {
            console.error('Image insert error:', imageError);
            // Don't leave orphaned files sitting in storage
            for (const row of imageRows) {
                await deleteImage(row.image_url);
            }
            return res.status(500).json({ error: 'Failed to save product images' });
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
