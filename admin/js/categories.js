// ── Admin Categories Management ──
let deleteCatId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupCatForm();
    setupCatImagePreview();

    // Open modal if #add in URL
    if (window.location.hash === '#add') openCatModal();
});

// ── Load Categories ──
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    const emptyEl = document.getElementById('emptyState');

    try {
        const res = await adminFetch('/admin/categories');
        const data = await res.json();

        if (!data || data.length === 0) {
            grid.innerHTML = '';
            emptyEl.classList.remove('hidden');
            return;
        }

        emptyEl.classList.add('hidden');

        const gradients = [
            'from-brand-500 to-purple-600', 'from-sky-500 to-blue-600', 'from-amber-500 to-orange-600',
            'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-indigo-500 to-violet-600'
        ];

        grid.innerHTML = data.map((cat, i) => `
      <div class="bg-white rounded-2xl border border-dark-200 overflow-hidden group hover:shadow-lg transition-shadow">
        <div class="relative h-36 overflow-hidden">
          ${cat.image_url
                ? `<img src="${cat.image_url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
                : `<div class="w-full h-full bg-gradient-to-br ${gradients[i % gradients.length]}"></div>`
            }
          <div class="absolute inset-0 bg-gradient-to-t from-dark-900/40 to-transparent"></div>
          <h3 class="absolute bottom-3 left-4 text-white font-bold text-lg">${cat.name}</h3>
        </div>
        <div class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs text-dark-400">slug: ${cat.slug}</p>
          </div>
          <div class="flex gap-1">
            <button onclick="editCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}', '${cat.image_url || ''}')"
              class="p-2 rounded-lg text-dark-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
              <i class="fas fa-pen text-xs"></i>
            </button>
            <button onclick="openDeleteCatModal('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')"
              class="p-2 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
              <i class="fas fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    } catch (err) {
        console.error('Failed to load categories:', err);
        grid.innerHTML = '<p class="col-span-full text-center text-red-400 py-10">Failed to load categories</p>';
    }
}

// ── Modal ──
function openCatModal() {
    document.getElementById('catModal').classList.remove('hidden');
    document.getElementById('catForm').reset();
    document.getElementById('catId').value = '';
    document.getElementById('catExistingImage').innerHTML = '';
    document.getElementById('catImagePreview').innerHTML = '';
    document.getElementById('catModalTitle').textContent = 'Add Category';
    document.getElementById('catSubmitText').textContent = 'Create';
}

function closeCatModal() {
    document.getElementById('catModal').classList.add('hidden');
}

function editCategory(id, name, imageUrl) {
    openCatModal();
    document.getElementById('catId').value = id;
    document.getElementById('catName').value = name;
    document.getElementById('catModalTitle').textContent = 'Edit Category';
    document.getElementById('catSubmitText').textContent = 'Save Changes';

    if (imageUrl) {
        document.getElementById('catExistingImage').innerHTML = `
      <div class="w-20 h-20 rounded-lg overflow-hidden border border-dark-200">
        <img src="${imageUrl}" class="w-full h-full object-cover">
      </div>`;
    }
}

// ── Image Preview ──
function setupCatImagePreview() {
    document.getElementById('catImage')?.addEventListener('change', (e) => {
        const preview = document.getElementById('catImagePreview');
        preview.innerHTML = '';
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML = `<div class="w-20 h-20 rounded-lg overflow-hidden border border-dark-200"><img src="${ev.target.result}" class="w-full h-full object-cover"></div>`;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// ── Form Submit ──
function setupCatForm() {
    document.getElementById('catForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('catSubmitBtn');
        const text = document.getElementById('catSubmitText');
        btn.disabled = true;
        text.textContent = 'Saving...';

        try {
            const catId = document.getElementById('catId').value;
            const formData = new FormData();
            formData.append('name', document.getElementById('catName').value);

            const file = document.getElementById('catImage').files[0];
            if (file) formData.append('image', file);

            const url = catId ? `/admin/categories/${catId}` : '/admin/categories';
            const method = catId ? 'PUT' : 'POST';

            const res = await adminFetch(url, { method, body: formData });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }

            showToast(catId ? 'Category updated!' : 'Category created!', 'success');
            closeCatModal();
            loadCategories();
        } catch (err) {
            showToast(err.message || 'Failed to save category', 'error');
        } finally {
            btn.disabled = false;
            text.textContent = document.getElementById('catId').value ? 'Save Changes' : 'Create';
        }
    });
}

// ── Delete Category ──
function openDeleteCatModal(id, name) {
    deleteCatId = id;
    document.getElementById('deleteCatMsg').textContent = `Are you sure you want to delete "${name}"?`;
    document.getElementById('deleteCatModal').classList.remove('hidden');
}

function closeDeleteCatModal() {
    document.getElementById('deleteCatModal').classList.add('hidden');
    deleteCatId = null;
}

async function confirmDeleteCat() {
    if (!deleteCatId) return;
    try {
        const res = await adminFetch(`/admin/categories/${deleteCatId}`, { method: 'DELETE' });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
        showToast('Category deleted', 'success');
        closeDeleteCatModal();
        loadCategories();
    } catch (err) {
        showToast(err.message || 'Failed to delete category', 'error');
    }
}
