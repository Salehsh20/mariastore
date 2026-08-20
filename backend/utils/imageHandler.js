const sharp = require('sharp');
const path = require('path');
const supabase = require('../config/supabase');

const BUCKET_NAME = 'product-images';

/**
 * Upload one file to storage, retrying transient failures.
 * Supabase Storage can deadlock on its own metadata tables when several
 * uploads land at once (Postgres reports 40P01), which fails an entire
 * gallery over something that succeeds on a second attempt. upsert is on so
 * a retry after a partially-applied write doesn't trip over its own file.
 */
async function uploadWithRetry(filePath, buffer, attempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, buffer, {
                contentType: 'image/webp',
                cacheControl: '31536000', // 1 year cache
                upsert: true
            });

        if (!error) return;

        lastError = error;
        await new Promise(resolve => setTimeout(resolve, attempt * 250));
    }

    throw new Error(lastError.message);
}

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
    try {
        await uploadWithRetry(fullPath, fullBuffer);
    } catch (err) {
        throw new Error(`Full image upload failed: ${err.message}`);
    }

    // Upload thumbnail
    try {
        await uploadWithRetry(thumbPath, thumbBuffer);
    } catch (err) {
        throw new Error(`Thumbnail upload failed: ${err.message}`);
    }

    // Get public URLs
    const { data: fullUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    const { data: thumbUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbPath);

    return {
        fullUrl: fullUrlData.publicUrl,
        thumbnailUrl: thumbUrlData.publicUrl
    };
}

/**
 * Process and upload several images, preserving input order.
 * Runs in small batches rather than one-at-a-time (too slow for a large
 * gallery) or all-at-once (every full-size buffer resized in memory
 * simultaneously). If any image fails, the ones already uploaded are removed
 * so a partial gallery is never left behind in storage.
 */
async function processAndUploadImages(files, folder = 'products', concurrency = 4) {
    const results = new Array(files.length);
    const uploaded = [];

    try {
        for (let start = 0; start < files.length; start += concurrency) {
            const batch = files.slice(start, start + concurrency);
            const settled = await Promise.allSettled(
                batch.map(file => processAndUploadImage(file.buffer, file.originalname, folder))
            );

            settled.forEach((outcome, offset) => {
                if (outcome.status === 'fulfilled') {
                    results[start + offset] = outcome.value;
                    uploaded.push(outcome.value.fullUrl);
                }
            });

            const failure = settled.find(outcome => outcome.status === 'rejected');
            if (failure) throw failure.reason;
        }
    } catch (err) {
        for (const url of uploaded) {
            await deleteImage(url);
        }
        throw err;
    }

    return results;
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

module.exports = { processAndUploadImage, processAndUploadImages, deleteImage };
