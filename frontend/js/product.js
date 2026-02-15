// ── Product Detail Page Logic ──
document.addEventListener('DOMContentLoaded', () => {
    Cart.updateBadge();
    loadProduct();
});

let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let quantity = 1;

async function loadProduct() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) { window.location.href = '/'; return; }

    try {
        const res = await fetch(`${CONFIG.API_URL}/products/${slug}`);
        if (!res.ok) throw new Error('Not found');
        const product = await res.json();
        currentProduct = product;
        renderProduct(product);
        loadRelatedProducts(product);
    } catch (err) {
        console.error('Failed to load product:', err);
        document.getElementById('infoSkeleton').innerHTML = `
      <div class="text-center py-16">
        <div class="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center"><i class="fas fa-exclamation-triangle text-red-400 text-xl"></i></div>
        <h2 class="text-lg font-bold text-dark-800 mb-2">Product Not Found</h2>
        <p class="text-dark-400 mb-6 text-sm">This product may have been removed or the link is incorrect.</p>
        <a href="/" class="inline-flex items-center gap-2 text-sm text-brand-600 font-semibold hover:text-brand-700"><i class="fas fa-arrow-left"></i> Back to Shop</a>
      </div>`;
    }
}

function renderProduct(p) {
    document.title = `${p.name} — MariaStore`;
    document.getElementById('breadcrumbName').textContent = p.name;

    // Images
    const mainImg = document.getElementById('mainImage');
    const skeleton = document.getElementById('imageSkeleton');
    const imgs = p.product_images || [];
    const primary = imgs.find(i => i.is_primary) || imgs[0];

    if (primary) {
        mainImg.src = primary.image_url;
        mainImg.onload = () => skeleton.classList.add('hidden');
        mainImg.onerror = () => { mainImg.src = CONFIG.PLACEHOLDER_IMAGE; skeleton.classList.add('hidden'); };
    } else {
        mainImg.src = CONFIG.PLACEHOLDER_IMAGE;
        skeleton.classList.add('hidden');
    }

    // Thumbnails
    const row = document.getElementById('thumbnailsRow');
    if (imgs.length > 1) {
        row.innerHTML = imgs.map((img, i) => `
      <button onclick="switchImage('${img.image_url}', this)"
        class="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === 0 || img.is_primary ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-dark-200 hover:border-brand-400'}">
        <img src="${img.thumbnail_url || img.image_url}" alt="Thumbnail ${i + 1}" class="w-full h-full object-cover">
      </button>
    `).join('');
    }

    // Product info
    document.getElementById('infoSkeleton').classList.add('hidden');
    document.getElementById('productInfo').classList.remove('hidden');

    document.getElementById('productName').textContent = p.name;
    document.getElementById('productPrice').textContent = formatPrice(p.price);
    document.getElementById('productDescription').textContent = p.description || 'No description available.';

    // Category
    if (p.categories) {
        const catEl = document.getElementById('productCategory');
        catEl.querySelector('span').textContent = p.categories.name;
        catEl.href = `/?category=${p.categories.slug}`;
    }

    // Compare price / discount
    if (p.old_price && p.old_price > p.price) {
        const compareEl = document.getElementById('productComparePrice');
        const discountEl = document.getElementById('productDiscount');
        compareEl.textContent = formatPrice(p.old_price);
        compareEl.classList.remove('hidden');
        const pct = Math.round((1 - p.price / p.old_price) * 100);
        discountEl.textContent = `${pct}% OFF`;
        discountEl.classList.remove('hidden');
    }

    // Colors
    const colors = p.product_colors || [];
    if (colors.length > 0) {
        document.getElementById('colorsSection').classList.remove('hidden');
        document.getElementById('colorsGrid').innerHTML = colors.map(c => `
      <button onclick="selectColor('${c.color_name}', '${c.color_hex}', this)"
        class="color-btn w-10 h-10 rounded-full border-2 border-dark-200 hover:border-brand-500 transition-all relative"
        style="background-color: ${c.color_hex}" title="${c.color_name}">
      </button>
    `).join('');
    }

    // Sizes
    const sizes = p.product_sizes || [];
    if (sizes.length > 0) {
        document.getElementById('sizesSection').classList.remove('hidden');
        document.getElementById('sizesGrid').innerHTML = sizes.map(s => `
      <button onclick="selectSize('${s.size}', this)"
        class="size-btn px-5 py-2.5 text-sm font-semibold border-2 rounded-xl transition-all
        ${s.in_stock ? 'border-dark-200 text-dark-700 hover:border-brand-500 hover:text-brand-600' : 'border-dark-100 text-dark-300 cursor-not-allowed line-through'}"
        ${!s.in_stock ? 'disabled' : ''}>
        ${s.size}
      </button>
    `).join('');
    }

    // Quantity buttons
    document.getElementById('qtyMinus').addEventListener('click', () => {
        if (quantity > 1) { quantity--; document.getElementById('qtyValue').textContent = quantity; }
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
        if (quantity < 20) { quantity++; document.getElementById('qtyValue').textContent = quantity; }
    });

    // Add to cart
    document.getElementById('addToCartBtn').addEventListener('click', () => {
        const colors = currentProduct.product_colors || [];
        const sizes = currentProduct.product_sizes || [];
        const hasColors = colors.length > 0;
        const hasSizes = sizes.filter(s => s.in_stock).length > 0;

        if (hasColors && !selectedColor) {
            showToast('Please select a color', 'error');
            document.getElementById('colorsSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (hasSizes && !selectedSize) {
            showToast('Please select a size', 'error');
            document.getElementById('sizesSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        Cart.addItem(currentProduct, quantity, selectedColor, selectedSize);
    });

    // Buy now (WhatsApp) - validate before redirect
    document.getElementById('buyNowBtn').addEventListener('click', (e) => {
        const colors = currentProduct.product_colors || [];
        const sizes = currentProduct.product_sizes || [];
        const hasColors = colors.length > 0;
        const hasSizes = sizes.filter(s => s.in_stock).length > 0;

        if (hasColors && !selectedColor) {
            e.preventDefault();
            showToast('Please select a color', 'error');
            document.getElementById('colorsSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (hasSizes && !selectedSize) {
            e.preventDefault();
            showToast('Please select a size', 'error');
            document.getElementById('sizesSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    });

    // Buy now (WhatsApp)
    updateBuyNowLink();
}

function switchImage(url, el) {
    document.getElementById('mainImage').src = url;
    document.querySelectorAll('#thumbnailsRow button').forEach(btn => {
        btn.className = btn.className.replace(/border-brand-500 ring-2 ring-brand-500\/20/g, 'border-dark-200 hover:border-brand-400');
    });
    el.className = el.className.replace(/border-dark-200 hover:border-brand-400/g, 'border-brand-500 ring-2 ring-brand-500/20');
}

function selectColor(name, hex, el) {
    selectedColor = name;
    document.getElementById('selectedColorName').textContent = name;
    document.querySelectorAll('.color-btn').forEach(b => {
        b.classList.remove('ring-2', 'ring-brand-500', 'border-brand-500');
        b.classList.add('border-dark-200');
    });
    el.classList.remove('border-dark-200');
    el.classList.add('ring-2', 'ring-brand-500', 'border-brand-500');
    updateBuyNowLink();
}

function selectSize(size, el) {
    selectedSize = size;
    document.querySelectorAll('.size-btn:not([disabled])').forEach(b => {
        b.classList.remove('border-brand-500', 'text-brand-600', 'bg-brand-50');
        b.classList.add('border-dark-200', 'text-dark-700');
    });
    el.classList.remove('border-dark-200', 'text-dark-700');
    el.classList.add('border-brand-500', 'text-brand-600', 'bg-brand-50');
    updateBuyNowLink();
}

function updateBuyNowLink() {
    if (!currentProduct) return;
    const items = [{
        name: currentProduct.name,
        price: currentProduct.price,
        quantity: quantity,
        color: selectedColor,
        size: selectedSize
    }];
    document.getElementById('buyNowBtn').href = generateWhatsAppLink(items, currentProduct.price * quantity);
}

async function loadRelatedProducts(product) {
    const grid = document.getElementById('relatedGrid');
    const section = document.getElementById('relatedSection');
    try {
        const catSlug = product.categories?.slug;
        if (!catSlug) { section.classList.add('hidden'); return; }

        const res = await fetch(`${CONFIG.API_URL}/products?category=${catSlug}&limit=4`);
        const data = await res.json();

        const related = (data.products || []).filter(p => p.id !== product.id).slice(0, 4);
        if (related.length === 0) { section.classList.add('hidden'); return; }

        grid.innerHTML = related.map(p => buildProductCard(p)).join('');
    } catch (err) {
        section.classList.add('hidden');
    }
}
