// ── Admin Products Management ──
let currentPage = 1;
let deleteProductId = null;
let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
    setupSearch();
    setupForm();
    setupImagePreview();

    // Open modal if #add in URL
    if (window.location.hash === '#add') openModal();
});

// ── Load categories for dropdown ──
async function loadCategories() {
    try {
        const res = await adminFetch('/admin/categories');
        allCategories = await res.json();

        // Product form dropdown
        const select = document.getElementById('pCategory');
        select.innerHTML = '<option value="">No Category</option>';
        allCategories.forEach(cat => {
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });

        // Category filter dropdown
        const filter = document.getElementById('categoryFilter');
        if (filter) {
            filter.innerHTML = '<option value="">All Categories</option>';
            allCategories.forEach(cat => {
                filter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
            filter.addEventListener('change', () => loadProducts(1));
        }
    } catch (err) { console.error('Failed to load categories:', err); }
}

// ── Load Products ──
async function loadProducts(page = 1) {
    const body = document.getElementById('productsBody');
    const search = document.getElementById('searchInput')?.value || '';
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    const params = new URLSearchParams({ page, limit: 10 });
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);

    try {
        const res = await adminFetch(`/admin/products?${params}`);
        const data = await res.json();
        currentPage = data.pagination?.page || 1;

        if (!data.products || data.products.length === 0) {
            body.innerHTML = `<tr><td colspan="5" class="py-16 text-center text-dark-400">
        <div class="w-14 h-14 mx-auto mb-4 bg-dark-100 rounded-full flex items-center justify-center"><i class="fas fa-box text-dark-300 text-lg"></i></div>
        <p class="font-medium text-dark-600">No products found</p>
        <p class="text-xs mt-1">Create your first product to get started</p>
      </td></tr>`;
            document.getElementById('tablePagination').innerHTML = '';
            return;
        }

        body.innerHTML = data.products.map(p => {
            const img = p.product_images?.find(i => i.is_primary)?.thumbnail_url || p.product_images?.[0]?.thumbnail_url || '';
            return `
        <tr class="border-b border-dark-100 hover:bg-dark-50/50 transition-colors">
          <td class="py-3 px-5">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-dark-100 overflow-hidden flex-shrink-0 border border-dark-200">
                ${img ? `<img src="${img}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-dark-300"><i class="fas fa-image"></i></div>'}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-dark-800 truncate max-w-[250px]">${p.name}</p>
                <p class="text-xs text-dark-400 truncate max-w-[250px]">${p.slug}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-5 text-dark-500 hidden md:table-cell">${p.categories?.name || '<span class="text-dark-300">—</span>'}</td>
          <td class="py-3 px-5">
            <span class="font-semibold text-dark-800">$${parseFloat(p.price).toFixed(2)}</span>
            ${p.old_price ? `<span class="text-xs text-dark-400 line-through ml-1">$${parseFloat(p.old_price).toFixed(2)}</span>` : ''}
          </td>
          <td class="py-3 px-5">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}">
              ${p.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="py-3 px-5 text-right">
            <div class="flex items-center justify-end gap-1">
              <button onclick="editProduct('${p.id}')" class="p-2 rounded-lg text-dark-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit"><i class="fas fa-pen text-xs"></i></button>
              <button onclick="openDeleteModal('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="p-2 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><i class="fas fa-trash text-xs"></i></button>
            </div>
          </td>
        </tr>`;
        }).join('');

        // Pagination
        const { page: pg, pages, total } = data.pagination;
        const pagEl = document.getElementById('tablePagination');
        if (pages > 1) {
            pagEl.innerHTML = `
        <p class="text-sm text-dark-500">Showing ${(pg - 1) * 10 + 1}–${Math.min(pg * 10, total)} of ${total}</p>
        <div class="flex gap-1">
          <button onclick="loadProducts(${pg - 1})" ${pg <= 1 ? 'disabled' : ''} class="w-9 h-9 rounded-lg flex items-center justify-center text-sm ${pg <= 1 ? 'text-dark-300 cursor-not-allowed' : 'text-dark-600 hover:bg-dark-100'}"><i class="fas fa-chevron-left text-xs"></i></button>
          <button onclick="loadProducts(${pg + 1})" ${pg >= pages ? 'disabled' : ''} class="w-9 h-9 rounded-lg flex items-center justify-center text-sm ${pg >= pages ? 'text-dark-300 cursor-not-allowed' : 'text-dark-600 hover:bg-dark-100'}"><i class="fas fa-chevron-right text-xs"></i></button>
        </div>`;
        } else {
            pagEl.innerHTML = `<p class="text-sm text-dark-500">${total} product${total !== 1 ? 's' : ''}</p><div></div>`;
        }
    } catch (err) {
        console.error('Failed to load products:', err);
        body.innerHTML = '<tr><td colspan="5" class="py-16 text-center text-red-400">Failed to load products</td></tr>';
    }
}

// ── Search ──
function setupSearch() {
    let timeout;
    document.getElementById('searchInput')?.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => loadProducts(1), 400);
    });
}

// ── Modal ──
function openModal(productId = null) {
    document.getElementById('productModal').classList.remove('hidden');
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('existingImages').innerHTML = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('colorsList').innerHTML = '';
    document.getElementById('sizesList').innerHTML = '';
    document.getElementById('pActive').checked = true;

    if (productId) {
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('submitText').textContent = 'Save Changes';
    } else {
        document.getElementById('modalTitle').textContent = 'Add Product';
        document.getElementById('submitText').textContent = 'Create Product';
    }
}

function closeModal() {
    document.getElementById('productModal').classList.add('hidden');
}

async function editProduct(id) {
    openModal(id);
    try {
        const res = await adminFetch(`/admin/products/${id}`);
        const p = await res.json();

        document.getElementById('productId').value = p.id;
        document.getElementById('pName').value = p.name;
        document.getElementById('pDesc').value = p.description || '';
        document.getElementById('pPrice').value = p.price;
        document.getElementById('pOldPrice').value = p.old_price || '';
        document.getElementById('pCategory').value = p.category_id || '';
        document.getElementById('pActive').checked = p.is_active;

        // Existing images
        const imgContainer = document.getElementById('existingImages');
        if (p.product_images?.length > 0) {
            imgContainer.innerHTML = p.product_images.map(img => `
        <div class="relative group w-20 h-20 rounded-lg overflow-hidden border border-dark-200">
          <img src="${img.thumbnail_url || img.image_url}" class="w-full h-full object-cover">
          ${img.is_primary ? '<span class="absolute top-1 left-1 bg-brand-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">Main</span>' : ''}
          <div class="absolute inset-0 bg-dark-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            ${!img.is_primary ? `<button type="button" onclick="setPrimaryImage('${img.id}')" class="p-1 bg-white rounded text-xs text-brand-600 hover:bg-brand-50" title="Set primary"><i class="fas fa-star"></i></button>` : ''}
            <button type="button" onclick="deleteImage('${img.id}', this)" class="p-1 bg-white rounded text-xs text-red-600 hover:bg-red-50" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');
        }

        // Colors
        if (p.product_colors?.length > 0) {
            p.product_colors.forEach(c => addColorRow(c.color_name, c.color_hex));
        }

        // Sizes
        if (p.product_sizes?.length > 0) {
            p.product_sizes.forEach(s => addSizeRow(s.size, s.in_stock));
        }
    } catch (err) {
        console.error('Failed to load product:', err);
        showToast('Failed to load product details', 'error');
        closeModal();
    }
}

// ── Color Rows ──
function addColorRow(name = '', hex = '#000000') {
    const container = document.getElementById('colorsList');
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2';
    row.innerHTML = `
    <input type="text" placeholder="Color Name" value="${name}" class="color-name flex-1 px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
    <input type="color" value="${hex}" class="color-hex w-10 h-10 rounded-lg border border-dark-200 cursor-pointer p-0.5">
    <button type="button" onclick="this.parentElement.remove()" class="p-2 text-dark-400 hover:text-red-500 transition-colors"><i class="fas fa-times text-xs"></i></button>`;
    container.appendChild(row);
}

// ── Size Rows ──
function addSizeRow(size = '', inStock = true) {
    const container = document.getElementById('sizesList');
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2';
    row.innerHTML = `
    <input type="text" placeholder="Size (S, M, L, XL...)" value="${size}" class="size-value flex-1 px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
    <label class="flex items-center gap-2 text-sm text-dark-600 cursor-pointer">
      <input type="checkbox" ${inStock ? 'checked' : ''} class="size-stock w-4 h-4 rounded border-dark-300 text-brand-600 focus:ring-brand-500/30"> In Stock
    </label>
    <button type="button" onclick="this.parentElement.remove()" class="p-2 text-dark-400 hover:text-red-500 transition-colors"><i class="fas fa-times text-xs"></i></button>`;
    container.appendChild(row);
}

// ── Image Preview ──
function setupImagePreview() {
    document.getElementById('pImages')?.addEventListener('change', (e) => {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        const fileCount = e.target.files.length;

        if (fileCount > 0) {
            // Show count
            const countDiv = document.createElement('div');
            countDiv.className = 'w-full text-sm font-medium text-brand-600 mb-2';
            countDiv.textContent = `${fileCount} image${fileCount > 1 ? 's' : ''} selected`;
            preview.appendChild(countDiv);
        }

        Array.from(e.target.files).forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement('div');
                div.className = 'relative w-24 h-24 rounded-lg overflow-hidden border-2 border-dark-200';
                div.innerHTML = `
                    <img src="${ev.target.result}" class="w-full h-full object-cover">
                    <div class="absolute top-1 right-1 bg-dark-900/70 text-white text-xs px-1.5 py-0.5 rounded">${i + 1}</div>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });
}

async function optimizeImageForUpload(file) {
    const supportedForDirectUpload = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxDirectFileSize = 700 * 1024;

    if (supportedForDirectUpload.includes(file.type) && file.size <= maxDirectFileSize) {
        return file;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Unsupported image format: ${file.name}`));
            img.src = objectUrl;
        });

        const maxWidth = 1280;
        const maxHeight = 1280;
        let { width, height } = image;

        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Image processing failed');

        ctx.drawImage(image, 0, 0, width, height);

        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.72);
        });

        if (!blob) {
            throw new Error(`Failed to optimize image: ${file.name}`);
        }

        const safeBase = (file.name.split('.').slice(0, -1).join('.') || 'image')
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .toLowerCase();

        return new File([blob], `${safeBase}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function prepareImagesForUpload(files) {
    const output = [];

    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            throw new Error(`Invalid file type: ${file.name}`);
        }
        output.push(await optimizeImageForUpload(file));
    }

    return output;
}

// ── Form Submit ──
function setupForm() {
    document.getElementById('productForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const text = document.getElementById('submitText');
        const spinner = document.getElementById('submitSpinner');

        btn.disabled = true;
        text.textContent = 'Saving...';
        spinner.classList.remove('hidden');

        try {
            const productId = document.getElementById('productId').value;
            const formData = new FormData();

            formData.append('name', document.getElementById('pName').value);
            formData.append('description', document.getElementById('pDesc').value);
            formData.append('price', document.getElementById('pPrice').value);
            formData.append('old_price', document.getElementById('pOldPrice').value || '');
            formData.append('category_id', document.getElementById('pCategory').value);
            formData.append('is_active', document.getElementById('pActive').checked);

            // Images
            const rawFiles = Array.from(document.getElementById('pImages').files || []);
            const optimizedFiles = await prepareImagesForUpload(rawFiles);
            for (let i = 0; i < optimizedFiles.length; i++) {
                formData.append('images', optimizedFiles[i]);
            }

            // Colors
            const colorRows = document.querySelectorAll('#colorsList > div');
            const colors = [];
            colorRows.forEach(row => {
                const name = row.querySelector('.color-name').value.trim();
                const hex = row.querySelector('.color-hex').value;
                if (name) colors.push({ name, hex });
            });
            if (colors.length > 0) formData.append('colors', JSON.stringify(colors));

            // Sizes
            const sizeRows = document.querySelectorAll('#sizesList > div');
            const sizes = [];
            sizeRows.forEach(row => {
                const size = row.querySelector('.size-value').value.trim();
                const in_stock = row.querySelector('.size-stock').checked;
                if (size) sizes.push({ size, in_stock });
            });
            if (sizes.length > 0) formData.append('sizes', JSON.stringify(sizes));

            const url = productId ? `/admin/products/${productId}` : '/admin/products';
            const method = productId ? 'PUT' : 'POST';

            const res = await adminFetch(url, { method, body: formData });
            if (!res.ok) {
                let errorMessage = 'Failed to save product';
                try {
                    const err = await res.json();
                    errorMessage = err.error || errorMessage;
                } catch {
                    errorMessage = `Failed to save product (HTTP ${res.status})`;
                }
                throw new Error(errorMessage);
            }

            showToast(productId ? 'Product updated!' : 'Product created!', 'success');
            closeModal();
            loadProducts(currentPage);
        } catch (err) {
            showToast(err.message || 'Failed to save product', 'error');
        } finally {
            btn.disabled = false;
            text.textContent = document.getElementById('productId').value ? 'Save Changes' : 'Create Product';
            spinner.classList.add('hidden');
        }
    });
}

// ── Image Actions ──
async function setPrimaryImage(imageId) {
    try {
        const res = await adminFetch(`/admin/products/images/${imageId}/primary`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed');
        showToast('Primary image updated', 'success');
        // Refresh modal
        const productId = document.getElementById('productId').value;
        if (productId) editProduct(productId);
    } catch (err) { showToast('Failed to update image', 'error'); }
}

async function deleteImage(imageId, el) {
    if (!confirm('Delete this image?')) return;
    try {
        const res = await adminFetch(`/admin/products/images/${imageId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        el.closest('.relative')?.remove();
        showToast('Image deleted', 'info');
    } catch (err) { showToast('Failed to delete image', 'error'); }
}

// ── Delete Product ──
function openDeleteModal(id, name) {
    deleteProductId = id;
    document.getElementById('deleteMsg').textContent = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    deleteProductId = null;
}

async function confirmDelete() {
    if (!deleteProductId) return;
    try {
        const res = await adminFetch(`/admin/products/${deleteProductId}/hard`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        showToast('Product deleted permanently', 'success');
        closeDeleteModal();
        loadProducts(currentPage);
    } catch (err) {
        showToast('Failed to delete product', 'error');
    }
}
