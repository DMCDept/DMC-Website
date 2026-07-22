/**
 * DMC Medical Supplies - Portfolio & Products Manager
 */

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 12;
let selectedPartner = 'all';
let selectedDivision = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    const productContainer = document.getElementById('product-container');
    if (!productContainer) return; // Only run on portfolio page

    initPortfolio();
});

async function initPortfolio() {
    await fetchProducts();
    setupEventListeners();
    applyFilters();
}

async function fetchProducts() {
    try {
        // Try fetching from Express API first
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('API request failed');
        allProducts = await response.json();
    } catch (err) {
        console.warn('Backend API unavailable, falling back to static products.json');
        try {
            const staticRes = await fetch('products.json');
            allProducts = await staticRes.json();
        } catch (e) {
            console.error('Failed to load products:', e);
            allProducts = [];
        }
    }

    // Clean products list (filter out empty entries)
    allProducts = allProducts.filter(p => p.productName && p.productName.trim() !== '');
    filteredProducts = [...allProducts];
    populateDivisions();
}

function populateDivisions() {
    const divisionSelect = document.getElementById('divisionFilter');
    if (!divisionSelect) return;

    const divisions = [...new Set(allProducts.map(p => p.division).filter(Boolean))].sort();
    
    divisionSelect.innerHTML = '<option value="all">All Divisions</option>';
    divisions.forEach(div => {
        const option = document.createElement('option');
        option.value = div;
        option.textContent = div;
        divisionSelect.appendChild(option);
    });
}

function setupEventListeners() {
    // Partner filter pills
    const partnerPills = document.querySelectorAll('.partner-pill');
    partnerPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            partnerPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            selectedPartner = e.target.getAttribute('data-partner') || 'all';
            currentPage = 1;
            applyFilters();
        });
    });

    // Division Filter select
    const divisionSelect = document.getElementById('divisionFilter');
    if (divisionSelect) {
        divisionSelect.addEventListener('change', (e) => {
            selectedDivision = e.target.value;
            currentPage = 1;
            applyFilters();
        });
    }

    // Search input
    const searchInput = document.getElementById('productSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            currentPage = 1;
            applyFilters();
        });
    }

    // Pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderProducts();
                window.scrollTo({ top: 300, behavior: 'smooth' });
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const maxPages = Math.ceil(filteredProducts.length / itemsPerPage);
            if (currentPage < maxPages) {
                currentPage++;
                renderProducts();
                window.scrollTo({ top: 300, behavior: 'smooth' });
            }
        });
    }
}

function applyFilters() {
    filteredProducts = allProducts.filter(p => {
        const matchesPartner = (selectedPartner === 'all') || 
            (p.partner && p.partner.toLowerCase() === selectedPartner.toLowerCase());
        
        const matchesDivision = (selectedDivision === 'all') || 
            (p.division === selectedDivision);

        const matchesSearch = !searchQuery || 
            (p.productName && p.productName.toLowerCase().includes(searchQuery)) ||
            (p.description && p.description.toLowerCase().includes(searchQuery)) ||
            (p.partner && p.partner.toLowerCase().includes(searchQuery)) ||
            (p.division && p.division.toLowerCase().includes(searchQuery));

        return matchesPartner && matchesDivision && matchesSearch;
    });

    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('product-container');
    const countBadge = document.getElementById('productCountBadge');
    
    if (!container) return;

    if (countBadge) {
        countBadge.textContent = `${filteredProducts.length} Products Found`;
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-box-seam display-1 text-muted opacity-50"></i>
                <h4 class="mt-3 text-muted">No products found</h4>
                <p class="text-muted">Try adjusting your search query or filter selection.</p>
            </div>
        `;
        renderPaginationControls(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredProducts.slice(startIndex, endIndex);

    container.innerHTML = pageItems.map(p => {
        const imgSrc = p.image || 'images/default-product.jpg';
        const partnerName = p.partner || 'DMC Partner';
        const partnerClass = partnerName.toLowerCase();
        
        return `
            <div class="col-lg-3 col-md-4 col-sm-6 fade-in-up">
                <div class="product-card">
                    <div class="product-img-wrapper">
                        <span class="partner-tag ${partnerClass}">${partnerName}</span>
                        <img src="${imgSrc}" alt="${p.productName}" onerror="this.src='images/default-product.jpg'">
                    </div>
                    <div class="product-body">
                        <div class="product-division">${p.division || 'Medical Category'}</div>
                        <h3 class="product-title">${p.productName}</h3>
                        <p class="product-desc">${p.description || 'High quality therapeutic and medical equipment supplied by DMC.'}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            ${p.partnerLink ? 
                                `<a href="${p.partnerLink}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary rounded-pill">
                                    Official Specs <i class="bi bi-box-arrow-up-right ms-1"></i>
                                 </a>` : ''
                            }
                            <button class="btn btn-sm btn-primary rounded-pill ms-auto" onclick="openProductDetailModal('${encodeURIComponent(JSON.stringify(p))}')">
                                Quick Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    renderPaginationControls(Math.ceil(filteredProducts.length / itemsPerPage));
}

function renderPaginationControls(totalPages) {
    const pageInfo = document.getElementById('currentPage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    }

    if (prevBtn) prevBtn.disabled = (currentPage <= 1);
    if (nextBtn) nextBtn.disabled = (currentPage >= totalPages || totalPages === 0);
}

window.openProductDetailModal = function(productJsonStr) {
    const product = JSON.parse(decodeURIComponent(productJsonStr));
    const mainImg = product.image || 'images/default-product.jpg';
    const gallery = Array.isArray(product.gallery) && product.gallery.length > 0 ? product.gallery : [mainImg];

    let galleryThumbnailsHtml = '';
    if (gallery.length > 1) {
        galleryThumbnailsHtml = `
            <div class="d-flex gap-2 justify-content-center mt-2 overflow-auto py-1">
                ${gallery.map((img, i) => `
                    <img src="${img}" alt="Thumbnail ${i+1}" class="rounded border p-1 modal-thumb" style="width: 50px; height: 50px; object-fit: contain; cursor: pointer;" onclick="document.getElementById('modalMainImage').src='${img}'" onerror="this.src='images/default-product.jpg'">
                `).join('')}
            </div>
        `;
    }

    let modalEl = document.getElementById('productDetailModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'productDetailModal';
        modalEl.className = 'modal fade';
        modalEl.tabIndex = -1;
        document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <div class="modal-header border-0 bg-light">
                    <h5 class="modal-title fw-bold text-primary">${product.partner || 'Product Details'} - ${product.productName}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <div class="row align-items-center">
                        <div class="col-md-5 text-center mb-3 mb-md-0">
                            <img id="modalMainImage" src="${mainImg}" alt="${product.productName}" class="img-fluid rounded-3 shadow-sm" style="max-height: 250px; object-fit: contain;" onerror="this.src='images/default-product.jpg'">
                            ${galleryThumbnailsHtml}
                        </div>
                        <div class="col-md-7">
                            <span class="badge bg-info text-dark mb-2">${product.division || 'Medical Category'}</span>
                            <h3 class="fw-bold mb-3">${product.productName}</h3>
                            <p class="text-muted fs-6">${product.description || 'High quality therapeutic solution distributed in Egypt by DMC.'}</p>
                            
                            <hr>
                            
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <span class="text-secondary small d-block">Authorized Partner</span>
                                    <strong class="text-dark fs-5">${product.partner}</strong>
                                </div>
                                ${product.partnerLink ? `
                                    <a href="${product.partnerLink}" target="_blank" class="btn btn-primary rounded-pill px-4">
                                        Visit Partner Page <i class="bi bi-box-arrow-up-right ms-1"></i>
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};
