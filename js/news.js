/**
 * DMC Medical Supplies - News Module
 */

document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');
    if (newsContainer) {
        loadNews(newsContainer);
    }
});

async function loadNews(container) {
    let newsItems = [];
    try {
        const response = await fetch('/api/news');
        if (!response.ok) throw new Error('API failed');
        newsItems = await response.json();
    } catch (e) {
        try {
            const staticRes = await fetch('news.json');
            newsItems = await staticRes.json();
        } catch (err) {
            console.error('Failed to load news:', err);
        }
    }

    if (!newsItems || newsItems.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-4">
                <p>No recent news articles available at the moment.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = newsItems.map(item => `
        <div class="col-md-4 fade-in-up">
            <div class="news-card">
                <img src="${item.image || 'images/default-news.jpg'}" alt="${item.title}" class="news-img" onerror="this.src='images/default-news.jpg'">
                <div class="news-body">
                    <div class="news-date">
                        <i class="bi bi-calendar3"></i> ${item.date || 'Latest Update'}
                    </div>
                    <h4 class="fw-bold mb-2 fs-5">${item.title}</h4>
                    <p class="text-muted small mb-3">${item.content ? item.content.substring(0, 120) + '...' : ''}</p>
                    <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="openNewsModal('${encodeURIComponent(JSON.stringify(item))}')">
                        Read Announcement <i class="bi bi-arrow-right ms-1"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

window.openNewsModal = function(newsJsonStr) {
    const item = JSON.parse(decodeURIComponent(newsJsonStr));
    
    let modalEl = document.getElementById('newsModalPopup');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'newsModalPopup';
        modalEl.className = 'modal fade';
        modalEl.tabIndex = -1;
        document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <div class="modal-header border-0 bg-light">
                    <h5 class="modal-title fw-bold text-primary">${item.title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <img src="${item.image || 'images/default-news.jpg'}" alt="${item.title}" class="img-fluid rounded-3 mb-3 w-100" style="max-height: 250px; object-fit: cover;" onerror="this.src='images/default-news.jpg'">
                    <div class="text-muted small mb-3"><i class="bi bi-calendar3"></i> Published: ${item.date || 'N/A'}</div>
                    <p class="text-secondary leading-relaxed">${item.content}</p>
                </div>
            </div>
        </div>
    `;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};
