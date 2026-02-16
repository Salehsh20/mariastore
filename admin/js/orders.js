// ── Admin Orders Page Logic ──
// Loads, displays, and manages customer orders

let currentPage = 1;
let currentStatus = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();

    // Status filter change
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        currentStatus = e.target.value;
        currentPage = 1;
        loadOrders();
    });
});

// ── Load orders from API ──
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="py-16 text-center text-dark-400"><i class="fas fa-spinner fa-spin mr-2"></i>Loading orders...</td></tr>';

    try {
        const params = new URLSearchParams({ page: currentPage, limit: 20 });
        if (currentStatus !== 'all') params.append('status', currentStatus);

        const res = await adminFetch(`/admin/orders?${params}`);
        const data = await res.json();

        if (!data.orders || data.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="py-16 text-center text-dark-400"><i class="fas fa-shopping-bag mr-2 text-lg"></i>No orders found</td></tr>';
            document.getElementById('paginationContainer').style.display = 'none';
            updateStats(data.orders || []);
            return;
        }

        // Render rows
        tbody.innerHTML = data.orders.map(order => {
            const itemCount = order.order_items ? order.order_items.length : 0;
            const date = new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            const time = new Date(order.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit'
            });

            return `
            <tr class="border-b border-dark-100 hover:bg-dark-50/50 transition-colors cursor-pointer" onclick="viewOrder('${order.id}')">
                <td class="py-3.5 px-4">
                    <span class="text-sm font-bold text-brand-600">#${order.order_number || '—'}</span>
                </td>
                <td class="py-3.5 px-4">
                    <p class="font-medium text-dark-800">${order.first_name} ${order.last_name}</p>
                </td>
                <td class="py-3.5 px-4 hidden md:table-cell">
                    <span class="text-dark-500">${order.phone}</span>
                </td>
                <td class="py-3.5 px-4 hidden lg:table-cell">
                    <span class="text-dark-500 truncate max-w-[200px] block">${order.address}</span>
                </td>
                <td class="py-3.5 px-4">
                    <span class="text-dark-600">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
                </td>
                <td class="py-3.5 px-4">
                    <span class="font-semibold text-dark-800">$${parseFloat(order.total).toFixed(2)}</span>
                </td>
                <td class="py-3.5 px-4">
                    ${getStatusBadge(order.status)}
                </td>
                <td class="py-3.5 px-4">
                    <p class="text-dark-600 text-xs">${date}</p>
                    <p class="text-dark-400 text-[11px]">${time}</p>
                </td>
                <td class="py-3.5 px-4">
                    <button onclick="event.stopPropagation(); viewOrder('${order.id}')"
                        class="p-2 rounded-lg text-dark-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="View">
                        <i class="fas fa-eye text-xs"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteOrder('${order.id}')"
                        class="p-2 rounded-lg text-dark-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        // Update stats
        updateStats(data.orders);

        // Pagination
        if (data.totalPages > 1) {
            document.getElementById('paginationContainer').style.display = 'flex';
            document.getElementById('paginationInfo').textContent = `Page ${data.page} of ${data.totalPages} (${data.total} orders)`;

            let btns = '';
            if (data.page > 1) {
                btns += `<button onclick="goToPage(${data.page - 1})" class="px-3 py-1.5 text-sm border border-dark-200 rounded-lg hover:bg-dark-100 transition-colors">← Prev</button>`;
            }
            if (data.page < data.totalPages) {
                btns += `<button onclick="goToPage(${data.page + 1})" class="px-3 py-1.5 text-sm border border-dark-200 rounded-lg hover:bg-dark-100 transition-colors">Next →</button>`;
            }
            document.getElementById('paginationButtons').innerHTML = btns;
        } else {
            document.getElementById('paginationContainer').style.display = 'none';
        }

    } catch (err) {
        console.error('Failed to load orders:', err);
        tbody.innerHTML = '<tr><td colspan="9" class="py-16 text-center text-red-400"><i class="fas fa-exclamation-circle mr-2"></i>Failed to load orders</td></tr>';
    }
}

// ── Update stats counters ──
function updateStats(orders) {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statDelivered').textContent = delivered;
    document.getElementById('statCancelled').textContent = cancelled;
}

// ── Status badge HTML ──
function getStatusBadge(status) {
    const styles = {
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
        shipped: 'bg-purple-50 text-purple-700 border-purple-200',
        delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        cancelled: 'bg-red-50 text-red-600 border-red-200',
    };
    const style = styles[status] || styles.pending;
    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style} capitalize">${status}</span>`;
}

// ── View order detail modal ──
async function viewOrder(id) {
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('modalContent');
    modal.classList.remove('hidden');

    content.innerHTML = '<div class="text-center py-10 text-dark-400"><i class="fas fa-spinner fa-spin text-lg"></i></div>';

    try {
        const res = await adminFetch(`/admin/orders/${id}`);
        const order = await res.json();

        const date = new Date(order.created_at).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
        const time = new Date(order.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });

        document.getElementById('modalTitle').textContent = `Order #${order.order_number || '—'}`;

        content.innerHTML = `
            <!-- Status -->
            <div class="mb-6">
                <label class="block text-xs font-semibold text-dark-400 uppercase tracking-wide mb-2">Status</label>
                <select id="orderStatusSelect" data-order-id="${order.id}"
                    class="w-full border border-dark-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>🚚 Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>📦 Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                </select>
            </div>

            <!-- Customer Info -->
            <div class="bg-dark-50 rounded-xl p-4 mb-6 space-y-2.5">
                <h3 class="text-sm font-bold text-dark-800 mb-3">
                    <i class="fas fa-user text-brand-500 mr-1.5"></i> Customer
                </h3>
                <div class="flex justify-between text-sm">
                    <span class="text-dark-500">Name</span>
                    <span class="font-medium text-dark-800">${order.first_name} ${order.last_name}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-dark-500">Phone</span>
                    <a href="tel:${order.phone}" class="font-medium text-brand-600 hover:underline">${order.phone}</a>
                </div>
                <div class="text-sm">
                    <span class="text-dark-500">Address</span>
                    <p class="font-medium text-dark-800 mt-1">${order.address}</p>
                </div>
                ${order.notes ? `
                <div class="text-sm">
                    <span class="text-dark-500">Notes</span>
                    <p class="font-medium text-dark-700 mt-1 italic">${order.notes}</p>
                </div>` : ''}
            </div>

            <!-- Order Items -->
            <div class="mb-6">
                <h3 class="text-sm font-bold text-dark-800 mb-3">
                    <i class="fas fa-shopping-bag text-brand-500 mr-1.5"></i> Items (${order.order_items?.length || 0})
                </h3>
                <div class="space-y-3">
                    ${(order.order_items || []).map(item => `
                        <div class="flex gap-3 items-start bg-dark-50 rounded-xl p-3">
                            <div class="w-14 h-14 rounded-lg bg-dark-200 overflow-hidden flex-shrink-0">
                                ${item.product_image
                ? `<img src="${item.product_image}" class="w-full h-full object-cover">`
                : '<div class="w-full h-full flex items-center justify-center text-dark-400"><i class="fas fa-image text-xs"></i></div>'
            }
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-dark-800">${item.product_name}</p>
                                <div class="flex flex-wrap gap-2 mt-0.5">
                                    ${item.color ? `<span class="text-[11px] text-dark-400">Color: ${item.color}</span>` : ''}
                                    ${item.size ? `<span class="text-[11px] text-dark-400">Size: ${item.size}</span>` : ''}
                                </div>
                                <div class="flex justify-between items-center mt-1">
                                    <span class="text-xs text-dark-400">Qty: ${item.quantity}</span>
                                    <span class="text-sm font-semibold text-dark-800">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Total -->
            <div class="bg-brand-50 rounded-xl p-4 mb-6 flex justify-between items-center">
                <span class="text-sm font-bold text-dark-800">Order Total</span>
                <span class="text-xl font-extrabold text-dark-900">$${parseFloat(order.total).toFixed(2)}</span>
            </div>

            <!-- Date -->
            <div class="text-center text-xs text-dark-400">
                <p>Placed on ${date} at ${time}</p>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex gap-3">
                <a href="https://wa.me/${order.phone.replace(/[^0-9]/g, '')}" target="_blank"
                    class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all">
                    <i class="fab fa-whatsapp"></i> Contact
                </a>
                <button onclick="deleteOrder('${order.id}'); closeOrderModal();"
                    class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold rounded-xl transition-all border border-red-200">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;

    } catch (err) {
        console.error('Failed to load order:', err);
        content.innerHTML = '<div class="text-center py-10 text-red-400"><i class="fas fa-exclamation-circle mr-2"></i>Failed to load order</div>';
    }
}

// ── Close modal ──
function closeOrderModal() {
    document.getElementById('orderModal').classList.add('hidden');
}

// ── Update order status ──
async function updateOrderStatus(id, status) {
    try {
        const res = await adminFetch(`/admin/orders/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            showToast(`Order status updated to ${status}`, 'success');
            loadOrders(); // Refresh table
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to update status', 'error');
        }
    } catch (err) {
        console.error('Status update error:', err);
        showToast('Failed to update status', 'error');
    }
}

// ── Delete order ──
async function deleteOrder(id) {
    if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) return;

    try {
        const res = await adminFetch(`/admin/orders/${id}`, { method: 'DELETE' });

        if (res.ok) {
            showToast('Order deleted', 'success');
            loadOrders();
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to delete order', 'error');
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to delete order', 'error');
    }
}

// ── Pagination ──
function goToPage(page) {
    currentPage = page;
    loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
