// ── Cart Manager (localStorage) ──
const Cart = {
    KEY: 'mariastore_cart',

    getItems() {
        try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
        catch { return []; }
    },

    save(items) {
        localStorage.setItem(this.KEY, JSON.stringify(items));
        this.updateBadge();
    },

    addItem(product, quantity = 1, color = null, size = null) {
        const items = this.getItems();
        const key = `${product.id}_${color || ''}_${size || ''}`;
        const idx = items.findIndex(i => i.key === key);

        if (idx > -1) {
            items[idx].quantity += quantity;
        } else {
            items.push({
                key,
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                image: getProductImage(product),
                color,
                size,
                quantity
            });
        }
        this.save(items);
        showToast(`${product.name} added to cart!`, 'success');
    },

    updateQuantity(key, quantity) {
        const items = this.getItems();
        const idx = items.findIndex(i => i.key === key);
        if (idx > -1) {
            if (quantity <= 0) { items.splice(idx, 1); }
            else { items[idx].quantity = quantity; }
            this.save(items);
        }
    },

    removeItem(key) {
        const items = this.getItems().filter(i => i.key !== key);
        this.save(items);
    },

    clear() {
        localStorage.removeItem(this.KEY);
        this.updateBadge();
    },

    getTotal() {
        return this.getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    getCount() {
        return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
    },

    updateBadge() {
        const badges = document.querySelectorAll('#cartBadge');
        const count = this.getCount();
        badges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
    },

    getWhatsAppLink() {
        const items = this.getItems();
        const total = this.getTotal();
        if (items.length === 0) return '#';
        return generateWhatsAppLink(items, total);
    }
};

// Initialize badge on every page
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
