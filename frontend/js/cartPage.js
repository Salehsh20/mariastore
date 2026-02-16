// ── Cart Page Logic ──
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
  renderCart();
  setupCartEvents();
});

function renderCart() {
  const items = Cart.getItems();
  const emptyEl = document.getElementById('emptyCart');
  const filledEl = document.getElementById('filledCart');
  const subtitle = document.getElementById('cartSubtitle');
  const clearBtn = document.getElementById('clearCartBtn');

  if (items.length === 0) {
    emptyEl.classList.remove('hidden');
    filledEl.classList.add('hidden');
    clearBtn.classList.add('hidden');
    subtitle.textContent = 'Your cart is empty';
    return;
  }

  emptyEl.classList.add('hidden');
  filledEl.classList.remove('hidden');
  clearBtn.classList.remove('hidden');

  const count = Cart.getCount();
  subtitle.textContent = `${count} item${count !== 1 ? 's' : ''} in your cart`;

  // Render items
  const list = document.getElementById('cartItemsList');
  list.innerHTML = items.map(item => `
    <div class="bg-white border border-dark-200 rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 group" data-key="${item.key}">
      <!-- Image -->
      <a href="product.html?slug=${item.slug}" class="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-dark-100">
        <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform"
          onerror="this.src='${CONFIG.PLACEHOLDER_IMAGE}'">
      </a>

      <!-- Details -->
      <div class="flex-1 min-w-0 flex flex-col">
        <div class="flex justify-between items-start gap-3">
          <div class="min-w-0">
            <a href="product.html?slug=${item.slug}" class="text-sm sm:text-base font-semibold text-dark-800 hover:text-brand-600 transition-colors line-clamp-2">${item.name}</a>
            <div class="flex flex-wrap gap-2 mt-1.5">
              ${item.color ? `<span class="text-xs text-dark-400 bg-dark-50 px-2 py-0.5 rounded-full">Color: ${item.color}</span>` : ''}
              ${item.size ? `<span class="text-xs text-dark-400 bg-dark-50 px-2 py-0.5 rounded-full">Size: ${item.size}</span>` : ''}
            </div>
          </div>
          <button onclick="removeCartItem('${item.key}')" class="p-1.5 rounded-lg text-dark-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0" title="Remove">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>

        <div class="mt-auto flex items-center justify-between pt-3">
          <!-- Quantity -->
          <div class="inline-flex items-center border border-dark-200 rounded-lg overflow-hidden">
            <button onclick="changeQty('${item.key}', ${item.quantity - 1})" class="w-8 h-8 flex items-center justify-center text-dark-500 hover:bg-dark-100 transition-colors text-xs">
              <i class="fas fa-minus text-[10px]"></i>
            </button>
            <span class="w-8 text-center text-sm font-semibold text-dark-800">${item.quantity}</span>
            <button onclick="changeQty('${item.key}', ${item.quantity + 1})" class="w-8 h-8 flex items-center justify-center text-dark-500 hover:bg-dark-100 transition-colors text-xs">
              <i class="fas fa-plus text-[10px]"></i>
            </button>
          </div>
          <!-- Price -->
          <span class="text-base font-bold text-dark-900">${formatPrice(item.price * item.quantity)}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Summary
  const total = Cart.getTotal();
  document.getElementById('summarySubtotal').textContent = formatPrice(total);
  document.getElementById('summaryTotal').textContent = formatPrice(total);
  // Set WhatsApp link on the secondary button
  const whatsappBtn = document.getElementById('whatsappBtn');
  if (whatsappBtn) whatsappBtn.href = Cart.getWhatsAppLink();
}

function changeQty(key, newQty) {
  if (newQty < 1) {
    removeCartItem(key);
    return;
  }
  Cart.updateQuantity(key, newQty);
  renderCart();
}

function removeCartItem(key) {
  Cart.removeItem(key);
  showToast('Item removed from cart', 'info');
  renderCart();
}

function setupCartEvents() {
  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      Cart.clear();
      showToast('Cart cleared', 'info');
      renderCart();
    }
  });
}
