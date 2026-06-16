// State Management
let releases = [];
let filteredReleases = [];
let activeCategory = 'all';
let searchQuery = '';
let selectedReleaseId = null;
let isFetching = false;

// DOM Elements
const elements = {
    releasesGrid: document.getElementById('releases-grid'),
    noResults: document.getElementById('no-results'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    filterChips: document.getElementById('filter-chips'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    spinnerIcon: document.getElementById('spinner-icon'),
    refreshBtnText: document.getElementById('refresh-btn-text'),
    syncStatus: document.getElementById('sync-status'),
    themeToggle: document.getElementById('theme-toggle'),
    sunIcon: document.getElementById('sun-icon'),
    moonIcon: document.getElementById('moon-icon'),
    
    // Share Drawer Elements
    shareDrawer: document.getElementById('share-drawer'),
    drawerBackdrop: document.getElementById('drawer-backdrop'),
    closeDrawer: document.getElementById('close-drawer'),
    drawerBadge: document.getElementById('drawer-note-badge'),
    drawerDate: document.getElementById('drawer-note-date'),
    drawerText: document.getElementById('drawer-note-text'),
    postTextarea: document.getElementById('post-textarea'),
    charCount: document.getElementById('char-count'),
    tweetBtn: document.getElementById('tweet-btn')
};

// ==========================================================================
// Initialization & Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initial theme setup
    initializeTheme();

    // Initial fetch from backend API
    fetchReleases();

    // Event: Theme toggle clicked
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Event: Refresh button clicked
    elements.refreshBtn.addEventListener('click', () => {
        if (!isFetching) {
            fetchReleases(true); // force-refresh feed
        }
    });

    // Event: Search input typed
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        
        // Show/hide clear button
        if (searchQuery.length > 0) {
            elements.clearSearch.classList.remove('hidden');
            elements.clearSearch.style.display = 'flex';
        } else {
            elements.clearSearch.classList.add('hidden');
            elements.clearSearch.style.display = 'none';
        }
        
        applyFiltersAndRender();
    });

    // Event: Clear search button clicked
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.clearSearch.classList.add('hidden');
        elements.clearSearch.style.display = 'none';
        elements.searchInput.focus();
        applyFiltersAndRender();
    });

    // Event: Filter chips clicked
    elements.filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        // Toggle active states on chips
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        activeCategory = chip.dataset.category;
        applyFiltersAndRender();
    });

    // Drawer closing events
    elements.closeDrawer.addEventListener('click', closeShareDrawer);
    elements.drawerBackdrop.addEventListener('click', closeShareDrawer);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.shareDrawer.classList.contains('active')) {
            closeShareDrawer();
        }
    });

    // Event: Character counting on textarea
    elements.postTextarea.addEventListener('input', updateCharCounter);

    // Event: Tweet button clicked
    elements.tweetBtn.addEventListener('click', shareToX);
});

// ==========================================================================
// API Fetching & Processing
// ==========================================================================
async function fetchReleases(force = false) {
    if (isFetching) return;
    
    // Set UI loading state
    isFetching = true;
    toggleLoadingState(true);

    try {
        const url = `/api/releases?refresh=${force}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            releases = data.releases;
            
            // Format last synced time
            const syncTime = new Date(data.cached_at * 1000);
            const timeString = syncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            elements.syncStatus.textContent = `同期済み (${timeString})`;
            elements.syncStatus.classList.remove('syncing');
        } else {
            console.error("API error:", data.error);
            showErrorState();
        }
    } catch (error) {
        console.error("Fetch failed:", error);
        showErrorState();
    } finally {
        isFetching = false;
        toggleLoadingState(false);
        applyFiltersAndRender();
    }
}

// Toggle UI components to load state
function toggleLoadingState(loading) {
    if (loading) {
        elements.refreshBtn.disabled = true;
        elements.refreshIcon.classList.add('hidden');
        elements.spinnerIcon.classList.remove('hidden');
        elements.refreshBtnText.textContent = "同期中...";
        elements.syncStatus.textContent = "同期中...";
        elements.syncStatus.classList.add('syncing');
        
        // Show skeleton loaders if grid is empty
        if (releases.length === 0) {
            renderSkeletons();
        }
    } else {
        elements.refreshBtn.disabled = false;
        elements.refreshIcon.classList.remove('hidden');
        elements.spinnerIcon.classList.add('hidden');
        elements.refreshBtnText.textContent = "更新する";
    }
}

// Shows error layout in container
function showErrorState() {
    elements.syncStatus.textContent = "同期エラー";
    elements.syncStatus.classList.remove('syncing');
    
    if (releases.length === 0) {
        elements.releasesGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; width: 100%;">
                <div class="no-results-icon" style="color: var(--color-issue);">❌</div>
                <h3>データの読み込みに失敗しました</h3>
                <p>ネットワーク接続を確認するか、しばらく経ってから再度お試しください。</p>
                <button class="btn btn-primary" onclick="fetchReleases(true)" style="margin-top: 16px;">再度読み込む</button>
            </div>
        `;
    }
}

// Renders visual skeleton placeholders
function renderSkeletons() {
    let html = '';
    for (let i = 0; i < 6; i++) {
        html += `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-date"></div>
                </div>
                <div class="skeleton-body">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
                <div class="skeleton-footer"></div>
            </div>
        `;
    }
    elements.releasesGrid.innerHTML = html;
}

// ==========================================================================
// Filtering & Rendering Core
// ==========================================================================
function applyFiltersAndRender() {
    if (releases.length === 0) return;

    filteredReleases = releases.filter(release => {
        // Category Filter matching
        const matchCategory = activeCategory === 'all' || 
            release.category.toLowerCase() === activeCategory;
            
        // Search Query matching (across date, category title, and details body text)
        const matchSearch = searchQuery === '' || 
            release.date.toLowerCase().includes(searchQuery) ||
            release.category.toLowerCase().includes(searchQuery) ||
            release.details_text.toLowerCase().includes(searchQuery);
            
        return matchCategory && matchSearch;
    });

    renderReleases();
}

function renderReleases() {
    if (filteredReleases.length === 0) {
        elements.releasesGrid.style.display = 'none';
        elements.noResults.classList.remove('hidden');
        elements.noResults.style.display = 'flex';
        return;
    }

    elements.noResults.classList.add('hidden');
    elements.noResults.style.display = 'none';
    elements.releasesGrid.style.display = 'grid';

    elements.releasesGrid.innerHTML = filteredReleases.map(release => {
        const badgeClass = `badge-${release.category.toLowerCase()}`;
        const isSelected = release.id === selectedReleaseId ? 'selected' : '';
        
        return `
            <div class="release-card ${isSelected}" 
                 data-id="${release.id}" 
                 data-category="${release.category.toLowerCase()}"
                 role="button"
                 tabindex="0"
                 aria-pressed="${release.id === selectedReleaseId}">
                
                <div class="release-card-header">
                    <span class="badge ${badgeClass}">${release.category}</span>
                    <div class="date-badge">
                        <svg class="date-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>${release.date}</span>
                    </div>
                </div>

                <div class="release-card-body">
                    ${release.details_html}
                </div>

                <div class="release-card-footer">
                    <a href="${release.link}" target="_blank" rel="noopener noreferrer" class="source-link" onclick="event.stopPropagation();">
                        <span>詳細を見る</span>
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                    </a>
                    
                    <div class="card-actions" onclick="event.stopPropagation();">
                        <button class="action-btn copy-btn" title="クリップボードにコピー" data-id="${release.id}" aria-label="クリップボードにコピー">
                            <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            <svg class="check-icon hidden" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button class="action-btn csv-btn" title="CSVエクスポート" data-id="${release.id}" aria-label="CSVエクスポート">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                        </button>
                        <button class="action-btn x-share-btn" title="𝕏で共有" data-id="${release.id}" aria-label="𝕏で共有">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach click listeners to cards
    document.querySelectorAll('.release-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn') || e.target.closest('.source-link')) return;
            
            const releaseId = card.dataset.id;
            const release = releases.find(r => r.id === releaseId);
            if (release) {
                openShareDrawer(release);
            }
        });
        
        // Accessibility press Enter to select
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Attach Copy buttons action
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const releaseId = btn.dataset.id;
            const release = releases.find(r => r.id === releaseId);
            if (release) {
                copyReleaseToClipboard(release, btn);
            }
        });
    });

    // Attach CSV export action
    document.querySelectorAll('.csv-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const releaseId = btn.dataset.id;
            const release = releases.find(r => r.id === releaseId);
            if (release) {
                exportReleaseToCSV(release);
            }
        });
    });

    // Attach X Share action button
    document.querySelectorAll('.x-share-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const releaseId = btn.dataset.id;
            const release = releases.find(r => r.id === releaseId);
            if (release) {
                openShareDrawer(release);
            }
        });
    });
}

// ==========================================================================
// Sharing Drawer Operations
// ==========================================================================
function openShareDrawer(release) {
    selectedReleaseId = release.id;
    
    // Highlight selected card visually
    document.querySelectorAll('.release-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
    });
    const cardEl = document.querySelector(`.release-card[data-id="${release.id}"]`);
    if (cardEl) {
        cardEl.classList.add('selected');
        cardEl.setAttribute('aria-pressed', 'true');
    }

    // Populate drawer values
    elements.drawerBadge.className = `badge badge-${release.category.toLowerCase()}`;
    elements.drawerBadge.textContent = release.category;
    elements.drawerDate.textContent = release.date;
    elements.drawerText.textContent = release.details_text;

    // Compose Tweet Content with character allocation
    const tweetText = composeDefaultTweet(release);
    elements.postTextarea.value = tweetText;
    
    // Activate Drawer
    elements.shareDrawer.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock body scroll

    updateCharCounter();
}

function closeShareDrawer() {
    selectedReleaseId = null;
    document.querySelectorAll('.release-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
    });
    
    elements.shareDrawer.classList.remove('active');
    document.body.style.overflow = ''; // Unlock body scroll
}

function composeDefaultTweet(release) {
    const maxChars = 280;
    
    // Static formatting parts
    const prefix = `BigQueryアップデート: `;
    const dateCat = `【${release.date} | ${release.category.toUpperCase()}】\n`;
    const suffix = `\n#GoogleCloud #BigQuery`;
    const url = `\n👉 ${release.link}`;
    
    // Calculate space left for the release content
    const overhead = prefix.length + dateCat.length + suffix.length + url.length;
    const allowedDetailLength = maxChars - overhead - 4; // 4 extra chars buffer for "..." etc.
    
    let detailsText = release.details_text;
    if (detailsText.length > allowedDetailLength) {
        detailsText = detailsText.substring(0, allowedDetailLength) + '...';
    }
    
    return `${prefix}${dateCat}${detailsText}${url}${suffix}`;
}

function updateCharCounter() {
    const text = elements.postTextarea.value;
    const length = text.length;
    
    elements.charCount.textContent = length;
    
    if (length > 280) {
        elements.charCount.classList.add('warning');
        elements.tweetBtn.disabled = true;
    } else {
        elements.charCount.classList.remove('warning');
        elements.tweetBtn.disabled = false;
    }
}

function shareToX() {
    const tweetText = elements.postTextarea.value;
    if (tweetText.length > 280) return;
    
    const encodedText = encodeURIComponent(tweetText);
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    // Open Web Intent in new tab/window
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
}

// ==========================================================================
// Theme Utilities
// ==========================================================================
function initializeTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        elements.sunIcon.classList.add('hidden');
        elements.moonIcon.classList.remove('hidden');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    if (isLight) {
        elements.sunIcon.classList.add('hidden');
        elements.moonIcon.classList.remove('hidden');
    } else {
        elements.sunIcon.classList.remove('hidden');
        elements.moonIcon.classList.add('hidden');
    }
}

// ==========================================================================
// Copy & CSV Utilities
// ==========================================================================
function copyReleaseToClipboard(release, btn) {
    const formattedText = `BigQueryアップデート 【${release.date} | ${release.category.toUpperCase()}】\n${release.details_text}\n詳細: ${release.link}`;
    
    navigator.clipboard.writeText(formattedText).then(() => {
        // Visual micro-feedback
        btn.classList.add('copied');
        const copyIcon = btn.querySelector('.copy-icon');
        const checkIcon = btn.querySelector('.check-icon');
        
        if (copyIcon && checkIcon) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
        }
        
        setTimeout(() => {
            btn.classList.remove('copied');
            if (copyIcon && checkIcon) {
                copyIcon.classList.remove('hidden');
                checkIcon.classList.add('hidden');
            }
        }, 2000);
    }).catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err);
    });
}

function exportReleaseToCSV(release) {
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const formatted = val.toString().replace(/"/g, '""');
        return `"${formatted}"`;
    };
    
    // Headers and values row
    const headers = ['Date', 'Category', 'URL', 'Content'];
    const row = [release.date, release.category, release.link, release.details_text];
    
    // Prefix UTF-8 BOM for Japanese Excel compatibility
    const csvContent = "\uFEFF" + 
        headers.map(escapeCSV).join(',') + '\n' +
        row.map(escapeCSV).join(',');
        
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeCategoryName = release.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeDate = release.date.replace(/,?\s+/g, '_');
    link.setAttribute('download', `bigquery_release_${safeDate}_${safeCategoryName}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
