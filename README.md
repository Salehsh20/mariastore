# MariaStore — E-Commerce Website

A full-stack e-commerce website built with **Express.js**, **Supabase**, and vanilla **HTML/CSS/JavaScript**. Customers browse products and checkout via **WhatsApp**.

## Features

### Storefront (Customer)
- Browse products with images, colors, sizes, and prices
- Filter by category, sort, and search
- Product detail page with image gallery
- Shopping cart (localStorage)
- WhatsApp checkout — redirects to owner's WhatsApp with order details

### Admin Panel
- Secure login with JWT authentication
- Dashboard with product/category statistics
- Full CRUD for Products (name, description, price, images, colors, sizes)
- Full CRUD for Categories
- Image upload with automatic optimization (resize + WebP conversion)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js, Node.js |
| Database | Supabase (PostgreSQL) |
| Image Storage | Supabase Storage |
| Image Processing | Sharp (resize, WebP, thumbnails) |
| Auth | JWT + bcrypt |
| Frontend | Vanilla HTML, CSS, JavaScript |

## Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run `database/schema.sql`
3. (Optional) Run `database/seed.sql` for sample data
4. Go to **Storage** → Create a new bucket called `product-images` (set it to **Public**)
5. Copy your project URL, anon key, and service role key from **Settings > API**

### 2. Configure Environment
```bash
cd backend
cp .env.example .env  # or edit .env directly
```

Edit `.env` with your Supabase credentials:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
WHATSAPP_NUMBER=966XXXXXXXXX
```

### 3. Install & Run
```bash
cd backend
npm install
npm run seed   # Creates default admin (admin@mariastore.com / admin123)
npm run dev    # Start with auto-reload
```

### 4. Open in Browser
- **Store**: http://localhost:3000
- **Admin**: http://localhost:3000/admin

### 5. Default Admin Login
- **Email**: admin@mariastore.com
- **Password**: admin123
- ⚠️ Change this password immediately!

## Project Structure
```
mariastore2/
├── backend/
│   ├── server.js           # Express entry point
│   ├── config/supabase.js  # Supabase client
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication
│   │   └── upload.js       # Multer file upload
│   ├── routes/
│   │   ├── products.js     # Public product API
│   │   ├── categories.js   # Public category API
│   │   └── admin/          # Protected admin CRUD
│   └── utils/
│       ├── imageHandler.js # Sharp image processing
│       └── whatsapp.js     # WhatsApp link builder
├── frontend/               # Customer storefront
│   ├── index.html          # Home page
│   ├── product.html        # Product detail
│   ├── cart.html           # Shopping cart
│   ├── css/                # Styles
│   └── js/                 # Client logic
├── admin/                  # Admin panel
│   ├── index.html          # Login
│   ├── dashboard.html      # Dashboard
│   ├── products.html       # Product management
│   ├── categories.html     # Category management
│   ├── css/admin.css       # Admin styles
│   └── js/                 # Admin logic
└── database/
    ├── schema.sql          # Database tables
    └── seed.sql            # Sample data
```

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products (paginated) |
| GET | /api/products/:slug | Product detail |
| GET | /api/categories | List categories |
| GET | /api/categories/:slug/products | Products by category |
| POST | /api/whatsapp-link | Generate WhatsApp link |

### Admin (requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/auth/login | Admin login |
| GET | /api/admin/products | List all products |
| POST | /api/admin/products | Create product |
| PUT | /api/admin/products/:id | Update product |
| DELETE | /api/admin/products/:id | Soft delete |
| DELETE | /api/admin/products/:id/hard | Permanent delete |
| POST | /api/admin/products/:id/images | Upload images |
| DELETE | /api/admin/images/:id | Delete image |
| GET/POST/PUT/DELETE | /api/admin/categories | Category CRUD |
