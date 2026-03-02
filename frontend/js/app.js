// ── Home Page Logic ──
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
    setupSearch();
    setupFilters();
    setupMobileMenu();
    setupInstallAppButton();
    setupWhatsAppLinks();
});

// ── Categories ──
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    try {
        const res = await fetch(`${CONFIG.API_URL}/categories`);
        const data = await res.json();

        if (!data || data.length === 0) {
            grid.innerHTML = '<p class="col-span-full text-center text-dark-400 py-10">No categories available</p>';
            return;
        }

        // Populate filter dropdown
        const filter = document.getElementById('categoryFilter');
        data.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.slug;
            opt.textContent = cat.name;
            filter.appendChild(opt);
        });

        // Render category cards
        const gradients = [
            'from-brand-500 to-purple-600',
            'from-sky-500 to-blue-600',
            'from-amber-500 to-orange-600',
            'from-emerald-500 to-teal-600',
            'from-rose-500 to-pink-600',
            'from-indigo-500 to-violet-600'
        ];

        grid.innerHTML = data.map((cat, i) => `
      <a href="/?category=${cat.slug}" class="group relative overflow-hidden rounded-2xl aspect-[3/4] sm:aspect-[4/5] cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 ring-1 ring-dark-200/50" onclick="filterByCategory(event, '${cat.slug}')">
        ${cat.image_url
                ? `<div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style="background-image: url('${cat.image_url}')"></div>`
                : `<div class="absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]}"></div>`
            }
        <div class="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-dark-900/30 to-transparent group-hover:from-dark-900/90 transition-all duration-500"></div>
        <div class="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <h3 class="text-white font-bold text-lg sm:text-xl tracking-tight drop-shadow-lg">${cat.name}</h3>
          <p class="text-white/80 text-xs sm:text-sm mt-1 flex items-center gap-1.5 font-medium">
            Shop now <i class="fas fa-arrow-right text-[10px] group-hover:translate-x-1.5 transition-transform duration-300"></i>
          </p>
        </div>
      </a>
    `).join('');
    } catch (err) {
        console.error('Failed to load categories:', err);
        grid.innerHTML = '<p class="col-span-full text-center text-red-400 py-10">Failed to load categories</p>';
    }
}

// ── Products ──
let currentPage = 1;

async function loadProducts(page = 1) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');

    // Get filter values
    const category = document.getElementById('categoryFilter')?.value || '';
    const sortVal = document.getElementById('sortFilter')?.value || 'created_at-desc';
    const [sort, order] = sortVal.split('-');
    const search = document.getElementById('searchInput')?.value || document.getElementById('mobileSearchInput')?.value || '';

    // Build query string
    const params = new URLSearchParams({ page, limit: CONFIG.PRODUCTS_PER_PAGE, sort, order });
    if (category) params.set('category', category);
    if (search.trim()) params.set('search', search.trim());

    try {
        const res = await fetch(`${CONFIG.API_URL}/products?${params}`);
        const data = await res.json();

        if (!data.products || data.products.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            pagination.innerHTML = '';
            return;
        }

        emptyState.classList.add('hidden');
        currentPage = data.pagination.page;

        grid.innerHTML = data.products.map(p => buildProductCard(p)).join('');

        // Pagination
        if (data.pagination.pages > 1) {
            let phtml = '';
            const { page: pg, pages } = data.pagination;

            phtml += `<button onclick="loadProducts(${pg - 1})" ${pg <= 1 ? 'disabled' : ''} class="w-10 h-10 rounded-xl flex items-center justify-center text-sm ${pg <= 1 ? 'text-dark-300 cursor-not-allowed' : 'text-dark-600 hover:bg-dark-100'}"><i class="fas fa-chevron-left text-xs"></i></button>`;

            const start = Math.max(1, pg - 2);
            const end = Math.min(pages, pg + 2);
            for (let i = start; i <= end; i++) {
                phtml += `<button onclick="loadProducts(${i})" class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium ${i === pg ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25' : 'text-dark-600 hover:bg-dark-100'}">${i}</button>`;
            }

            phtml += `<button onclick="loadProducts(${pg + 1})" ${pg >= pages ? 'disabled' : ''} class="w-10 h-10 rounded-xl flex items-center justify-center text-sm ${pg >= pages ? 'text-dark-300 cursor-not-allowed' : 'text-dark-600 hover:bg-dark-100'}"><i class="fas fa-chevron-right text-xs"></i></button>`;

            pagination.innerHTML = `<div class="inline-flex items-center gap-1 bg-white border border-dark-200 rounded-2xl p-1.5 shadow-sm">${phtml}</div>`;
        } else {
            pagination.innerHTML = '';
        }
    } catch (err) {
        console.error('Failed to load products:', err);
        grid.innerHTML = '<p class="col-span-full text-center text-red-400 py-10">Failed to load products. Please try again.</p>';
    }
}

// ── Category Filter Link ──
function filterByCategory(e, slug) {
    e.preventDefault();
    const filter = document.getElementById('categoryFilter');
    if (filter) { filter.value = slug; }
    loadProducts(1);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
}

// ── Search ──
function setupSearch() {
    let timeout;
    const handler = (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => loadProducts(1), 400);
    };
    document.getElementById('searchInput')?.addEventListener('input', handler);
    document.getElementById('mobileSearchInput')?.addEventListener('input', handler);
}

// ── Filters ──
function setupFilters() {
    document.getElementById('categoryFilter')?.addEventListener('change', () => loadProducts(1));
    document.getElementById('sortFilter')?.addEventListener('change', () => loadProducts(1));
}

// ── Mobile Menu ──
function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('hidden'));
    }
}

// ── PWA Install (Mobile Menu) ──
function setupInstallAppButton() {
    const installBtn = document.getElementById('installAppBtn');
    if (!installBtn) return;

    let deferredPrompt = null;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        installBtn.classList.add('hidden');
        return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
            installBtn.classList.add('hidden');
        }
        deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
        installBtn.classList.add('hidden');
        deferredPrompt = null;
    });
}

// ── WhatsApp Links ──
function setupWhatsAppLinks() {
    const cta = document.getElementById('whatsappCTA');
    const footer = document.getElementById('footerWhatsApp');
    const link = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}`;
    if (cta) cta.href = link;
    if (footer) footer.href = link;
}
