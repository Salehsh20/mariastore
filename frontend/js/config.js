// ── MariaStore Frontend Config ──
const CONFIG = {
    API_URL: '/api',
    WHATSAPP_NUMBER: '96181755271',
    STORE_NAME: 'MariaStore',
    CURRENCY: '$',
    PRODUCTS_PER_PAGE: 12,
    PLACEHOLDER_IMAGE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMTcwIDE4MEgxNzZWMjIwSDE3MFYxODBaIiBmaWxsPSIjOTRhM2I4Ii8+PHBhdGggZD0iTTIxNiAxODBIMjIyVjIyMEgyMTZWMTgwWiIgZmlsbD0iIzk0YTNiOCIvPjxwYXRoIGQ9Ik0xNzAgMjQwSDIzMFYyNDZIMTcwVjI0MFoiIGZpbGw9IiM5NGEzYjgiLz48L3N2Zz4=',
};

// ── Helpers ──
function formatPrice(price) {
    return `${CONFIG.CURRENCY}${parseFloat(price).toFixed(2)}`;
}

function getProductImage(product) {
    if (product.product_images && product.product_images.length > 0) {
        const primary = product.product_images.find(i => i.is_primary) || product.product_images[0];
        return primary.thumbnail_url || primary.image_url;
    }
    return CONFIG.PLACEHOLDER_IMAGE;
}

function getProductFullImage(product) {
    if (product.product_images && product.product_images.length > 0) {
        const primary = product.product_images.find(i => i.is_primary) || product.product_images[0];
        return primary.image_url;
    }
    return CONFIG.PLACEHOLDER_IMAGE;
}

function generateWhatsAppLink(items, total) {
    const baseUrl = window.location.origin;
    let msg = `Hello ${CONFIG.STORE_NAME}! I'd like to order:\n\n`;
    items.forEach((item, i) => {
        msg += `${i + 1}. *${item.name}*\n`;
        if (item.color) msg += `   Color: ${item.color}\n`;
        if (item.size) msg += `   Size: ${item.size}\n`;
        msg += `   Quantity: ${item.quantity}\n`;
        msg += `   Price: ${formatPrice(item.price * item.quantity)}\n`;
        if (item.slug) msg += `   Link: ${baseUrl}/product.html?slug=${item.slug}\n`;
        msg += `\n`;
    });
    msg += `*Total: ${formatPrice(total)}*\n\nPlease confirm availability. Thank you!`;
    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ── Toast Notifications ──
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: 'fa-check-circle text-emerald-500', error: 'fa-exclamation-circle text-red-500', info: 'fa-info-circle text-brand-500' };
    const toast = document.createElement('div');
    toast.className = 'animate-slide-in flex items-center gap-3 px-5 py-3.5 bg-white border border-dark-200 rounded-xl shadow-xl max-w-sm';
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span class="text-sm font-medium text-dark-700">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Product card HTML builder
function buildProductCard(product) {
    const img = getProductImage(product);
    const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0;
    return `
    <a href="product.html?slug=${product.slug}" class="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl ring-1 ring-dark-200/50 hover:ring-brand-300/50 transition-all duration-500 hover:-translate-y-1">
      <div class="relative overflow-hidden aspect-[3/4] bg-dark-100">
        <img src="${img}" alt="${product.name}" loading="lazy"
          class="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
          onerror="this.src='${CONFIG.PLACEHOLDER_IMAGE}'">
        ${discount > 0 ? `<span class="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">${discount}% OFF</span>` : ''}
        <div class="absolute inset-0 bg-gradient-to-t from-dark-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
      <div class="p-3.5 sm:p-4">
        ${product.categories ? `<p class="text-[11px] font-semibold text-brand-600 uppercase tracking-wider mb-1">${product.categories.name}</p>` : ''}
        <h3 class="text-sm font-semibold text-dark-800 line-clamp-2 group-hover:text-brand-600 transition-colors leading-snug">${product.name}</h3>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-base font-bold text-dark-900">${formatPrice(product.price)}</span>
          ${product.old_price ? `<span class="text-xs text-dark-400 line-through">${formatPrice(product.old_price)}</span>` : ''}
        </div>
      </div>
    </a>`;
}
