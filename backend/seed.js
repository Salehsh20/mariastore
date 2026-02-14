/**
 * Seed script — Creates a default admin user
 * Run: node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./config/supabase');

async function seed() {
    console.log('Seeding database...\n');

    // Create admin user
    const email = 'admin@mariastore.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from('admin_users')
        .upsert({ email, password: hashedPassword }, { onConflict: 'email' })
        .select();

    if (error) {
        console.error('Error creating admin:', error.message);
    } else {
        console.log('Admin user created/updated:');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${password}`);
        console.log('  ⚠️  CHANGE THIS PASSWORD after first login!\n');
    }

    console.log('Done! You can now start the server with: npm run dev');
}

seed().catch(console.error);
