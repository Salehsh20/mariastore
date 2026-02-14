-- ============================================================
-- MariaStore Seed Data — Sample products for testing
-- Run AFTER schema.sql
-- ============================================================

-- Sample Categories
INSERT INTO categories (name, slug, image_url) VALUES
  ('T-Shirts', 't-shirts', NULL),
  ('Bags', 'bags', NULL),
  ('Shoes', 'shoes', NULL),
  ('Accessories', 'accessories', NULL);

-- Sample Products
INSERT INTO products (name, slug, description, price, old_price, category_id, is_active) VALUES
  (
    'Classic Cotton T-Shirt',
    'classic-cotton-tshirt',
    'Premium quality 100% cotton t-shirt with a comfortable fit. Perfect for everyday wear.',
    29.99,
    39.99,
    (SELECT id FROM categories WHERE slug = 't-shirts'),
    true
  ),
  (
    'Leather Shoulder Bag',
    'leather-shoulder-bag',
    'Elegant genuine leather shoulder bag with multiple compartments. Ideal for work and casual outings.',
    89.99,
    NULL,
    (SELECT id FROM categories WHERE slug = 'bags'),
    true
  ),
  (
    'Sport Running Shoes',
    'sport-running-shoes',
    'Lightweight and breathable running shoes with cushioned sole for maximum comfort.',
    69.99,
    89.99,
    (SELECT id FROM categories WHERE slug = 'shoes'),
    true
  ),
  (
    'Silver Watch',
    'silver-watch',
    'Elegant silver watch with stainless steel band. Water resistant up to 50m.',
    149.99,
    NULL,
    (SELECT id FROM categories WHERE slug = 'accessories'),
    true
  );

-- Sample Colors
INSERT INTO product_colors (product_id, color_name, color_hex) VALUES
  ((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), 'White', '#FFFFFF'),
  ((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), 'Black', '#000000'),
  ((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), 'Navy', '#000080'),
  ((SELECT id FROM products WHERE slug = 'leather-shoulder-bag'), 'Brown', '#8B4513'),
  ((SELECT id FROM products WHERE slug = 'leather-shoulder-bag'), 'Black', '#000000'),
  ((SELECT id FROM products WHERE slug = 'sport-running-shoes'), 'White', '#FFFFFF'),
  ((SELECT id FROM products WHERE slug = 'sport-running-shoes'), 'Red', '#FF0000'),
  ((SELECT id FROM products WHERE slug = 'silver-watch'), 'Silver', '#C0C0C0');

-- Sample Sizes
INSERT INTO product_sizes (product_id, size, in_stock) VALUES
  ((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), 'S', true),
  ((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), 'M', true),
  ((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), 'L', true),
  ((SELECT id FROM products WHERE slug = 'classic-cotton-tshirt'), 'XL', true),
  ((SELECT id FROM products WHERE slug = 'leather-shoulder-bag'), 'One Size', true),
  ((SELECT id FROM products WHERE slug = 'sport-running-shoes'), '40', true),
  ((SELECT id FROM products WHERE slug = 'sport-running-shoes'), '41', true),
  ((SELECT id FROM products WHERE slug = 'sport-running-shoes'), '42', true),
  ((SELECT id FROM products WHERE slug = 'sport-running-shoes'), '43', true),
  ((SELECT id FROM products WHERE slug = 'sport-running-shoes'), '44', false),
  ((SELECT id FROM products WHERE slug = 'silver-watch'), 'One Size', true);
