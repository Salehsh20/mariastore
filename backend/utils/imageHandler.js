const sharp = require('sharp');
const path = require('path');
const supabase = require('../config/supabase');

const BUCKET_NAME = 'product-images';

/**
 * Process and upload an image to Supabase Storage
 * Returns { fullUrl, thumbnailUrl }
 */
async function processAndUploadImage(fileBuffer, originalName, folder = 'products') {
    const timestamp = Date.now();
    const baseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    // Process full-size image (max 1200px wide, WebP, 80% quality)
    const fullBuffer = await sharp(fileBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

    // Process thumbnail (400px wide)
    const thumbBuffer = await sharp(fileBuffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

    const fullPath = `${folder}/${baseName}-${timestamp}.webp`;
    const thumbPath = `${folder}/thumbs/${baseName}-${timestamp}.webp`;

    // Upload full image
    const { error: fullError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fullPath, fullBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000' // 1 year cache
        });

    if (fullError) throw new Error(`Full image upload failed: ${fullError.message}`);

    // Upload thumbnail
    const { error: thumbError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(thumbPath, thumbBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000'
        });

    if (thumbError) throw new Error(`Thumbnail upload failed: ${thumbError.message}`);

    // Get public URLs
    const { data: fullUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    const { data: thumbUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbPath);

    return {
        fullUrl: fullUrlData.publicUrl,
        thumbnailUrl: thumbUrlData.publicUrl
    };
}

/**
 * Delete an image from Supabase Storage
 */
async function deleteImage(imageUrl) {
    try {
        const url = new URL(imageUrl);
        const pathParts = url.pathname.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
        if (pathParts.length > 1) {
            const filePath = pathParts[1];
            await supabase.storage.from(BUCKET_NAME).remove([filePath]);

            // Also try to delete thumbnail
            const thumbPath = filePath.replace(/\/([^/]+)$/, '/thumbs/$1');
            await supabase.storage.from(BUCKET_NAME).remove([thumbPath]);
        }
    } catch (err) {
        console.error('Error deleting image:', err.message);
    }
}

module.exports = { processAndUploadImage, deleteImage };
