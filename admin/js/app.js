/**
 * DMC Medical Supplies - Admin Control Center JS
 */

let productsData = [];
let newsData = [];
let careersData = [];
let editingProductIndex = null;
let editingNewsIndex = null;
let editingCareerIndex = null;
let currentProductGallery = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap tooltips for collapsed sidebar icons
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el, { trigger: 'hover' }));

    loadDashboardStats();
    loadProducts();
    loadNews();
    loadCareers();

    // Attach search filters in admin
    const prodSearch = document.getElementById('adminProdSearch');
    if (prodSearch) prodSearch.addEventListener('input', renderProductsTable);

    const newsSearch = document.getElementById('adminNewsSearch');
    if (newsSearch) newsSearch.addEventListener('input', renderNewsTable);

    const careerSearch = document.getElementById('adminCareerSearch');
    if (careerSearch) careerSearch.addEventListener('input', renderCareersTable);
});

// Toast notification helper
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success text-white' : 'bg-danger text-white';
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 show shadow-lg" role="alert">
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center gap-2">
                    <i class="bi ${icon} fs-5"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);
    setTimeout(() => {
        const el = document.getElementById(toastId);
        if (el) el.remove();
    }, 4000);
}

// Image File Upload Handler (Express or cPanel PHP)
async function uploadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;
            try {
                // Try Express API upload first
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64: base64Data })
                });

                if (res.ok) {
                    const data = await res.json();
                    return resolve(data.url);
                }

                // Fallback to PHP API upload for standard cPanel
                const phpRes = await fetch('../api.php?action=upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'upload', base64: base64Data })
                });

                if (phpRes.ok) {
                    const phpData = await phpRes.json();
                    return resolve(phpData.url);
                }

                resolve(base64Data); // Fallback to base64 if server unavailable
            } catch (err) {
                resolve(base64Data);
            }
        };
        reader.onerror = () => reject('Failed to read file');
        reader.readAsDataURL(file);
    });
}

// 1. Dashboard KPI Metrics
async function loadDashboardStats() {
    try {
        let res = await fetch('/api/stats');
        if (!res.ok) res = await fetch('../api.php?action=get_stats');
        
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('statTotalProducts').textContent = stats.totalProducts || 0;
            document.getElementById('statTotalPartners').textContent = stats.totalPartners || 0;
            document.getElementById('statTotalNews').textContent = stats.totalNews || 0;
            document.getElementById('statTotalCareers').textContent = stats.totalCareers || 0;
        }
    } catch (e) {
        console.warn('Stats API unavailable');
    }
}

// 2. Load & Render Products
async function loadProducts() {
    try {
        let res = await fetch('/api/products');
        if (!res.ok) res = await fetch('../api.php?action=get_products');
        
        if (res.ok) {
            productsData = await res.json();
        } else {
            throw new Error('API failed');
        }
    } catch (err) {
        try {
            const staticRes = await fetch('../products.json');
            productsData = await staticRes.json();
        } catch (e) {
            productsData = [];
        }
    }
    renderProductsTable();
}

function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;

    const query = (document.getElementById('adminProdSearch')?.value || '').toLowerCase().trim();
    
    const filtered = productsData.filter(p => {
        return !query || 
            (p.productName && p.productName.toLowerCase().includes(query)) ||
            (p.partner && p.partner.toLowerCase().includes(query)) ||
            (p.division && p.division.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No products found</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((p) => {
        const actualIndex = productsData.indexOf(p);
        const galleryCount = Array.isArray(p.gallery) ? p.gallery.length : 0;
        return `
            <tr>
                <td>
                    <img src="../${p.image || 'images/default-product.jpg'}" alt="${p.productName}" class="rounded shadow-sm" style="width: 45px; height: 45px; object-fit: contain;" onerror="this.src='../images/default-product.jpg'">
                </td>
                <td>
                    <strong class="text-dark">${p.productName || 'Untitled'}</strong>
                    ${galleryCount > 1 ? `<span class="badge bg-info-subtle text-info ms-2"><i class="bi bi-images me-1"></i>${galleryCount} photos</span>` : ''}
                    <div class="small text-muted">${p.description ? p.description.substring(0, 45) + '...' : ''}</div>
                </td>
                <td><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">${p.partner || 'N/A'}</span></td>
                <td><span class="badge bg-secondary-subtle text-secondary border px-2 py-1">${p.division || 'Uncategorized'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openProductModal(${actualIndex})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${actualIndex})">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Open Product Modal (Add or Edit)
window.openProductModal = function(index = null) {
    editingProductIndex = index;
    const modalLabel = document.getElementById('productModalLabel');
    const form = document.getElementById('productForm');

    if (index !== null && productsData[index]) {
        modalLabel.textContent = 'Edit Product';
        const p = productsData[index];
        document.getElementById('productName').value = p.productName || '';
        document.getElementById('productPartner').value = p.partner || '';
        document.getElementById('productDivision').value = p.division || '';
        document.getElementById('productLink').value = p.partnerLink || '';
        document.getElementById('productDescription').value = p.description || '';
        document.getElementById('productImage').value = p.image || '';
        document.getElementById('productImgPreview').src = p.image ? `../${p.image}` : '../images/default-product.jpg';
        
        currentProductGallery = Array.isArray(p.gallery) ? [...p.gallery] : [];
    } else {
        modalLabel.textContent = 'Add New Product';
        form.reset();
        document.getElementById('productImgPreview').src = '../images/default-product.jpg';
        currentProductGallery = [];
        editingProductIndex = null;
    }

    renderGalleryPreviews();
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
};

// Handle Main Product File Upload
window.handleProductMainFileUpload = async function(input) {
    if (input.files && input.files[0]) {
        showToast('Uploading image file...', 'info');
        const fileUrl = await uploadImageFile(input.files[0]);
        document.getElementById('productImage').value = fileUrl;
        document.getElementById('productImgPreview').src = fileUrl.startsWith('data:') ? fileUrl : `../${fileUrl}`;
        showToast('Image uploaded successfully!');
    }
};

// Handle Gallery Files Upload (Multiple Images)
window.handleProductGalleryFileUpload = async function(input) {
    if (input.files && input.files.length > 0) {
        showToast(`Uploading ${input.files.length} gallery image(s)...`, 'info');
        for (let i = 0; i < input.files.length; i++) {
            const fileUrl = await uploadImageFile(input.files[i]);
            currentProductGallery.push(fileUrl);
        }
        renderGalleryPreviews();
        showToast('Gallery images added!');
    }
};

function renderGalleryPreviews() {
    const container = document.getElementById('galleryPreviewContainer');
    if (!container) return;

    if (currentProductGallery.length === 0) {
        container.innerHTML = `<span class="text-muted small">No gallery images added yet.</span>`;
        return;
    }

    container.innerHTML = currentProductGallery.map((img, idx) => `
        <div class="position-relative d-inline-block me-2 mb-2">
            <img src="${img.startsWith('data:') ? img : '../' + img}" class="rounded border p-1" style="width: 65px; height: 65px; object-fit: contain;" onerror="this.src='../images/default-product.jpg'">
            <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 p-0 rounded-circle" style="width: 20px; height: 20px; font-size: 10px;" onclick="removeGalleryImg(${idx})">×</button>
        </div>
    `).join('');
}

window.removeGalleryImg = function(idx) {
    currentProductGallery.splice(idx, 1);
    renderGalleryPreviews();
};

// Save Product
window.saveProduct = async function() {
    const mainImg = document.getElementById('productImage').value.trim() || 'images/default-product.jpg';
    if (currentProductGallery.length === 0) {
        currentProductGallery = [mainImg];
    }

    const productPayload = {
        productName: document.getElementById('productName').value.trim(),
        partner: document.getElementById('productPartner').value.trim(),
        division: document.getElementById('productDivision').value.trim(),
        partnerLink: document.getElementById('productLink').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        image: mainImg,
        gallery: currentProductGallery
    };

    if (!productPayload.productName) {
        showToast('Please enter a product name.', 'danger');
        return;
    }

    if (editingProductIndex !== null) {
        productsData[editingProductIndex] = { ...productsData[editingProductIndex], ...productPayload };
    } else {
        productsData.unshift(productPayload);
    }

    await saveBulkProducts();

    const modalEl = document.getElementById('productModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    loadProducts();
    loadDashboardStats();
};

// Delete Product
window.deleteProduct = async function(index) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    productsData.splice(index, 1);
    await saveBulkProducts();
    loadProducts();
    loadDashboardStats();
};

async function saveBulkProducts() {
    try {
        let res = await fetch('/api/products/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productsData)
        });

        if (!res.ok) {
            // PHP fallback for cPanel
            await fetch('../api.php?action=save_products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_products', products: productsData })
            });
        }
        showToast('Products saved & synchronized successfully!');
    } catch (e) {
        console.error('Bulk save failed:', e);
    }
}

// 3. Load & Render News
async function loadNews() {
    try {
        let res = await fetch('/api/news');
        if (!res.ok) res = await fetch('../api.php?action=get_news');
        
        if (res.ok) {
            newsData = await res.json();
        } else {
            throw new Error('API Error');
        }
    } catch (err) {
        try {
            const staticRes = await fetch('../news.json');
            newsData = await staticRes.json();
        } catch (e) {
            newsData = [];
        }
    }
    renderNewsTable();
}

function renderNewsTable() {
    const tbody = document.querySelector('#newsTable tbody');
    if (!tbody) return;

    const query = (document.getElementById('adminNewsSearch')?.value || '').toLowerCase().trim();
    
    const filtered = newsData.filter(n => {
        return !query || 
            (n.title && n.title.toLowerCase().includes(query)) ||
            (n.content && n.content.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No news articles found</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((n) => {
        const actualIndex = newsData.indexOf(n);
        return `
            <tr>
                <td>
                    <img src="../${n.image || 'images/default-news.jpg'}" alt="${n.title}" class="rounded shadow-sm" style="width: 50px; height: 35px; object-fit: cover;" onerror="this.src='../images/default-news.jpg'">
                </td>
                <td>
                    <strong class="text-dark">${n.title || 'Untitled'}</strong>
                </td>
                <td><span class="small text-muted"><i class="bi bi-calendar3 me-1"></i>${n.date || 'N/A'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openNewsModal(${actualIndex})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteNews(${actualIndex})">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.openNewsModal = function(index = null) {
    editingNewsIndex = index;
    const modalLabel = document.getElementById('newsModalLabel');
    const form = document.getElementById('newsForm');

    if (index !== null && newsData[index]) {
        modalLabel.textContent = 'Edit News Article';
        const n = newsData[index];
        document.getElementById('newsTitle').value = n.title || '';
        document.getElementById('newsDate').value = n.date || '';
        document.getElementById('newsContent').value = n.content || '';
        document.getElementById('newsImage').value = n.image || '';
        document.getElementById('newsImgPreview').src = n.image ? `../${n.image}` : '../images/default-news.jpg';
    } else {
        modalLabel.textContent = 'Add News Article';
        form.reset();
        document.getElementById('newsDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('newsImgPreview').src = '../images/default-news.jpg';
        editingNewsIndex = null;
    }

    const modal = new bootstrap.Modal(document.getElementById('newsModal'));
    modal.show();
};

window.handleNewsFileUpload = async function(input) {
    if (input.files && input.files[0]) {
        showToast('Uploading news image file...', 'info');
        const fileUrl = await uploadImageFile(input.files[0]);
        document.getElementById('newsImage').value = fileUrl;
        document.getElementById('newsImgPreview').src = fileUrl.startsWith('data:') ? fileUrl : `../${fileUrl}`;
        showToast('News cover image uploaded!');
    }
};

window.saveNews = async function() {
    const newsPayload = {
        title: document.getElementById('newsTitle').value.trim(),
        date: document.getElementById('newsDate').value || new Date().toISOString().split('T')[0],
        content: document.getElementById('newsContent').value.trim(),
        image: document.getElementById('newsImage').value.trim() || 'images/default-news.jpg'
    };

    if (!newsPayload.title) {
        showToast('Please enter an article title.', 'danger');
        return;
    }

    if (editingNewsIndex !== null) {
        newsData[editingNewsIndex] = { ...newsData[editingNewsIndex], ...newsPayload };
    } else {
        newsData.unshift(newsPayload);
    }

    await saveBulkNews();

    const modalEl = document.getElementById('newsModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    loadNews();
    loadDashboardStats();
};

window.deleteNews = async function(index) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    newsData.splice(index, 1);
    await saveBulkNews();
    loadNews();
    loadDashboardStats();
};

async function saveBulkNews() {
    try {
        let res = await fetch('/api/news/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newsData)
        });

        if (!res.ok) {
            await fetch('../api.php?action=save_news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_news', news: newsData })
            });
        }
        showToast('News articles saved & synchronized!');
    } catch (e) {
        console.error('Bulk save news failed:', e);
    }
}

// 4. Load & Render Careers
async function loadCareers() {
    try {
        let res = await fetch('/api/careers');
        if (!res.ok) res = await fetch('../api.php?action=get_careers');
        
        if (res.ok) {
            careersData = await res.json();
        } else {
            throw new Error('API Error');
        }
    } catch (err) {
        try {
            const staticRes = await fetch('../careers.json');
            careersData = await staticRes.json();
        } catch (e) {
            careersData = [];
        }
    }
    renderCareersTable();
}

function renderCareersTable() {
    const tbody = document.querySelector('#careersTable tbody');
    if (!tbody) return;

    const query = (document.getElementById('adminCareerSearch')?.value || '').toLowerCase().trim();
    
    const filtered = careersData.filter(c => {
        return !query || 
            (c.title && c.title.toLowerCase().includes(query)) ||
            (c.division && c.division.toLowerCase().includes(query)) ||
            (c.location && c.location.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No open job positions found</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((c) => {
        const actualIndex = careersData.indexOf(c);
        return `
            <tr>
                <td><strong class="text-dark">${c.title || 'Untitled Role'}</strong></td>
                <td><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">${c.division || 'General'}</span></td>
                <td><span class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${c.location || 'Cairo'}</span></td>
                <td><span class="badge bg-light text-dark border">${c.type || 'Full Time'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openCareerModal(${actualIndex})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCareer(${actualIndex})">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.openCareerModal = function(index = null) {
    editingCareerIndex = index;
    const modalLabel = document.getElementById('careerModalLabel');
    const form = document.getElementById('careerForm');

    if (index !== null && careersData[index]) {
        modalLabel.textContent = 'Edit Job Opening';
        const c = careersData[index];
        document.getElementById('careerTitle').value = c.title || '';
        document.getElementById('careerDivision').value = c.division || '';
        document.getElementById('careerLocation').value = c.location || 'Cairo, Egypt';
        document.getElementById('careerType').value = c.type || 'Full Time';
        document.getElementById('careerDescription').value = c.description || '';
        document.getElementById('careerRequirements').value = c.requirements || '';
    } else {
        modalLabel.textContent = 'Add New Job Opening';
        form.reset();
        document.getElementById('careerLocation').value = 'Cairo, Egypt';
        document.getElementById('careerType').value = 'Full Time';
        editingCareerIndex = null;
    }

    const modal = new bootstrap.Modal(document.getElementById('careerModal'));
    modal.show();
};

window.saveCareer = async function() {
    const careerPayload = {
        title: document.getElementById('careerTitle').value.trim(),
        division: document.getElementById('careerDivision').value.trim(),
        location: document.getElementById('careerLocation').value.trim() || 'Cairo, Egypt',
        type: document.getElementById('careerType').value,
        description: document.getElementById('careerDescription').value.trim(),
        requirements: document.getElementById('careerRequirements').value.trim()
    };

    if (!careerPayload.title) {
        showToast('Please enter a job title.', 'danger');
        return;
    }

    if (editingCareerIndex !== null) {
        careersData[editingCareerIndex] = { ...careersData[editingCareerIndex], ...careerPayload };
    } else {
        careersData.unshift(careerPayload);
    }

    await saveBulkCareers();

    const modalEl = document.getElementById('careerModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    loadCareers();
    loadDashboardStats();
};

window.deleteCareer = async function(index) {
    if (!confirm('Are you sure you want to delete this job opening?')) return;
    careersData.splice(index, 1);
    await saveBulkCareers();
    loadCareers();
    loadDashboardStats();
};

async function saveBulkCareers() {
    try {
        let res = await fetch('/api/careers/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(careersData)
        });

        if (!res.ok) {
            await fetch('../api.php?action=save_careers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_careers', careers: careersData })
            });
        }
        showToast('Job openings saved & synchronized!');
    } catch (e) {
        console.error('Bulk save careers failed:', e);
    }
}
