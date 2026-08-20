const multer = require('multer');

// Store in memory for processing with Sharp before uploading to Supabase
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.'), false);
    }
};

// Keep this in one place — the routes cap upload.array() with it and the error
// handler quotes it back to the user, so all three can never drift apart.
const MAX_FILES = 20;

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
        files: MAX_FILES
    }
});

upload.MAX_FILES = MAX_FILES;

module.exports = upload;
