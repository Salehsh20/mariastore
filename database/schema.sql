-- ============================================================
-- MariaStore Database Schema
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Categories ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);

-- ── Products ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_created ON products(created_at DESC);

-- ── Product Images ──────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ── Product Colors ──────────────────────────────────
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name VARCHAR(50) NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  image_url TEXT
);

CREATE INDEX idx_product_colors_product ON product_colors(product_id);

-- ── Product Sizes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  in_stock BOOLEAN DEFAULT true
);

CREATE INDEX idx_product_sizes_product ON product_sizes(product_id);

-- ── Admin Users ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Insert default admin ────────────────────────────
-- Password: admin123 (bcrypt hash)
-- CHANGE THIS immediately after first login!
INSERT INTO admin_users (email, password) VALUES (
  'admin@mariastore.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
) ON CONFLICT (email) DO NOTHING;

-- ── Supabase Storage Bucket ─────────────────────────
-- Run this in Supabase SQL editor or create via Dashboard:
-- Go to Storage > New Bucket > Name: "product-images" > Public: Yes

-- ── Row Level Security (RLS) ────────────────────────
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read access for storefront
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read product_images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Public read product_colors" ON product_colors FOR SELECT USING (true);
CREATE POLICY "Public read product_sizes" ON product_sizes FOR SELECT USING (true);

-- Service role has full access (used by backend with service key)
CREATE POLICY "Service full access categories" ON categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access products" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access images" ON product_images FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access colors" ON product_colors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access sizes" ON product_sizes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access admin" ON admin_users FOR ALL USING (auth.role() = 'service_role');
