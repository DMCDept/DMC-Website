/**
 * DMC Medical Supplies - Careers Dynamic Loader
 */

document.addEventListener('DOMContentLoaded', () => {
    const careersContainer = document.getElementById('careers-list-container');
    if (careersContainer) {
        loadCareers(careersContainer);
    }
});

async function loadCareers(container) {
    let positions = [];
    try {
        const response = await fetch('/api/careers');
        if (!response.ok) throw new Error('Express API failed');
        positions = await response.json();
    } catch (e) {
        try {
            // Try cPanel PHP API bridge fallback
            const phpRes = await fetch('api.php?action=get_careers');
            if (phpRes.ok) {
                positions = await phpRes.json();
            } else {
                throw new Error('PHP API failed');
            }
        } catch (err) {
            try {
                // Static fallback
                const staticRes = await fetch('careers.json');
                positions = await staticRes.json();
            } catch (error) {
                console.error('Failed to load careers:', error);
            }
        }
    }

    if (!positions || positions.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="bi bi-briefcase display-3 opacity-50 mb-3"></i>
                <h4 class="fw-bold">No Open Positions Currently Listed</h4>
                <p>We are always looking for exceptional talent! Send your resume to <a href="mailto:info@dmc-eg.com" class="text-primary fw-semibold">info@dmc-eg.com</a>.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = positions.map(pos => `
        <div class="col-md-6 fade-in-up">
            <div class="bg-white p-4 rounded-4 shadow-sm border border-light h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <span class="badge bg-primary-light text-primary fw-bold mb-2 px-3 py-1 rounded-pill">${pos.division || 'General Medical'}</span>
                        <h3 class="h4 fw-bold text-dark mb-1">${pos.title}</h3>
                    </div>
                    <span class="badge bg-light text-muted border">${pos.type || 'Full Time'}</span>
                </div>
                <p class="text-muted mb-3">${pos.description}</p>
                ${pos.requirements ? `<div class="small text-secondary mb-4"><strong>Requirements:</strong> ${pos.requirements}</div>` : ''}
                <div class="mt-auto d-flex align-items-center justify-content-between pt-2 border-top">
                    <span class="small text-muted"><i class="bi bi-geo-alt me-1"></i> ${pos.location || 'Cairo, Egypt'}</span>
                    <a href="mailto:info@dmc-eg.com?subject=Application for ${encodeURIComponent(pos.title)}" class="btn btn-dmc-primary btn-sm">
                        Apply Now <i class="bi bi-send ms-1"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}
