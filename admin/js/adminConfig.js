// ── Admin Config ──
const ADMIN_API = '/api';

function getToken() {
    return localStorage.getItem('admin_token');
}

function getAdminUser() {
    try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return null; }
}

// Fetch with auth header
async function adminFetch(path, options = {}) {
    const token = getToken();
    if (!token) { window.location.href = '/admin/'; throw new Error('No token'); }
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    const res = await fetch(`${ADMIN_API}${path}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/admin/';
        throw new Error('Unauthorized');
    }
    return res;
}

// Toggle sidebar (mobile)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

// Logout
function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/';
}

// Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: 'fa-check-circle text-emerald-500', error: 'fa-exclamation-circle text-red-500', info: 'fa-info-circle text-brand-500' };
    const toast = document.createElement('div');
    toast.className = 'animate-slide-in flex items-center gap-3 px-5 py-3.5 bg-white border border-dark-200 rounded-xl shadow-xl max-w-sm';
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span class="text-sm font-medium text-dark-700">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all .3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}
