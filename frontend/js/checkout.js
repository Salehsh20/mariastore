// ── Checkout Page Logic ──
// Handles form validation, order submission, and success state

document.addEventListener('DOMContentLoaded', () => {
    Cart.updateBadge();
    initCheckout();
});

function initCheckout() {
    const items = Cart.getItems();
    const emptyEl = document.getElementById('emptyCheckout');
    const contentEl = document.getElementById('checkoutContent');

    // If cart is empty, show empty state
    if (items.length === 0) {
        emptyEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        return;
    }

    // Show checkout form
    emptyEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    // Render order summary sidebar
    renderCheckoutSummary(items);

    // Setup form submission
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
}

// ── Render the order summary in the sidebar ──
function renderCheckoutSummary(items) {
    const container = document.getElementById('checkoutItems');
    const total = Cart.getTotal();
    const count = Cart.getCount();

    container.innerHTML = items.map(item => `
        <div class="flex gap-3 items-start">
            <div class="w-14 h-14 rounded-lg overflow-hidden bg-dark-100 flex-shrink-0">
                <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover"
                    onerror="this.src='${CONFIG.PLACEHOLDER_IMAGE}'">
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-dark-800 line-clamp-1">${item.name}</p>
                <div class="flex flex-wrap gap-1 mt-0.5">
                    ${item.color ? `<span class="text-[11px] text-dark-400">${item.color}</span>` : ''}
                    ${item.color && item.size ? '<span class="text-[11px] text-dark-300">·</span>' : ''}
                    ${item.size ? `<span class="text-[11px] text-dark-400">${item.size}</span>` : ''}
                </div>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-dark-400">Qty: ${item.quantity}</span>
                    <span class="text-sm font-semibold text-dark-800">${formatPrice(item.price * item.quantity)}</span>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('checkoutSubtotal').textContent = formatPrice(total);
    document.getElementById('checkoutItemCount').textContent = `${count} item${count !== 1 ? 's' : ''}`;
    document.getElementById('checkoutTotal').textContent = formatPrice(total);
}

// ── Handle form submission ──
async function handleCheckout(e) {
    e.preventDefault();

    const btn = document.getElementById('placeOrderBtn');
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const notes = document.getElementById('notes').value.trim();

    // Client-side validation
    if (!firstName || !lastName || !phone || !address) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Get cart items
    const items = Cart.getItems();
    if (items.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin text-lg"></i> Placing Order...';

    try {
        const res = await fetch(`${CONFIG.API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName,
                lastName,
                phone,
                address,
                notes: notes || null,
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    image: item.image,
                    price: item.price,
                    quantity: item.quantity,
                    color: item.color,
                    size: item.size
                }))
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to place order');
        }

        // ── Success! ──
        // Build WhatsApp link with order details before clearing cart
        const total = Cart.getTotal();
        const whatsappLink = buildOrderWhatsAppLink(firstName, lastName, phone, address, items, total, data.orderNumber);

        // Clear cart
        Cart.clear();

        // Show success state
        document.getElementById('checkoutContent').classList.add('hidden');
        const successEl = document.getElementById('orderSuccess');
        successEl.classList.remove('hidden');

        // Show order number
        if (data.orderNumber) {
            document.getElementById('orderNumberDisplay').textContent = `Order #${data.orderNumber}`;
        }

        // Set WhatsApp button link
        document.getElementById('whatsappOrderBtn').href = whatsappLink;

        showToast('Order placed successfully!', 'success');

    } catch (err) {
        console.error('Checkout error:', err);
        showToast(err.message || 'Something went wrong. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle text-lg"></i> Place Order';
    }
}

// ── Build WhatsApp message for the completed order ──
function buildOrderWhatsAppLink(firstName, lastName, phone, address, items, total, orderNumber) {
    let msg = `Hello ${CONFIG.STORE_NAME}!\n\n`;
    msg += `🛒 *New Order${orderNumber ? ` #${orderNumber}` : ''}*\n\n`;
    msg += `👤 *Customer:* ${firstName} ${lastName}\n`;
    msg += `📞 *Phone:* ${phone}\n`;
    msg += `📍 *Address:* ${address}\n\n`;
    msg += `*Order Items:*\n`;

    items.forEach((item, i) => {
        msg += `${i + 1}. *${item.name}*\n`;
        if (item.color) msg += `   Color: ${item.color}\n`;
        if (item.size) msg += `   Size: ${item.size}\n`;
        msg += `   Qty: ${item.quantity} × ${formatPrice(item.price)}\n\n`;
    });

    msg += `💰 *Total: ${formatPrice(total)}*\n\n`;
    msg += `Please confirm the order. Thank you! 🙏`;

    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
