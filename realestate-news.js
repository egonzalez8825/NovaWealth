// realestate-news.js - Real Estate News from News API
// Automatically updates Featured Analysis section with real estate articles

// ==============================================
// CONFIGURATION
// ==============================================

// Get your FREE API key from: https://newsapi.org/register
const NEWS_API_KEY = 'YOUR_NEWS_API_KEY_HERE'; // Replace with your actual key

// Cache duration (24 hours - news doesn't change that often)
const NEWS_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Search queries for different real estate topics
const SEARCH_TOPICS = {
    reits: 'multi-family REIT OR real estate investment trust',
    housing: 'housing market trends OR home prices',
    commercial: 'commercial real estate OR cap rates',
    zillow: 'Zillow housing data OR realtor market report'
};

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function isNewsCacheValid(timestamp) {
    if (!timestamp) return false;
    return (Date.now() - timestamp) < NEWS_CACHE_DURATION;
}

function getNewsFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const data = JSON.parse(cached);
        if (isNewsCacheValid(data.timestamp)) {
            console.log('✅ Using cached news data');
            return data.value;
        }
        return null;
    } catch (error) {
        return null;
    }
}

function saveNewsToCache(key, value) {
    try {
        const data = { timestamp: Date.now(), value: value };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Cache error:', error);
    }
}

// ==============================================
// NEWS API FUNCTIONS
// ==============================================

/**
 * Fetch articles from News API
 */
async function fetchNewsArticles(query, maxResults = 3) {
    const cacheKey = 'news_' + query.replace(/\s+/g, '_');
    
    // Check cache first
    const cached = getNewsFromCache(cacheKey);
    if (cached) return cached;
    
    // Calculate date range (last 30 days)
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = 'https://newsapi.org/v2/everything?' +
                'q=' + encodeURIComponent(query) +
                '&from=' + fromDate +
                '&to=' + toDate +
                '&language=en' +
                '&sortBy=relevancy' +
                '&pageSize=' + maxResults +
                '&apiKey=' + NEWS_API_KEY;
    
    try {
        console.log('🔄 Fetching real estate news...');
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        
        const data = await response.json();
        
        // Check for API errors
        if (data.status === 'error') {
            throw new Error(data.message || 'News API error');
        }
        
        const articles = data.articles || [];
        
        // Save to cache
        saveNewsToCache(cacheKey, articles);
        
        console.log('✅ Fetched ' + articles.length + ' articles');
        return articles;
        
    } catch (error) {
        console.error('Error fetching news:', error);
        throw error;
    }
}

/**
 * Fetch multiple topics and combine
 */
async function fetchAllRealEstateNews() {
    try {
        // Fetch REIT articles (main topic)
        const reitArticles = await fetchNewsArticles(SEARCH_TOPICS.reits, 3);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch housing market articles
        const housingArticles = await fetchNewsArticles(SEARCH_TOPICS.housing, 2);
        
        // Combine and deduplicate
        const allArticles = [...reitArticles, ...housingArticles];
        const uniqueArticles = deduplicateArticles(allArticles);
        
        return uniqueArticles.slice(0, 5); // Return top 5
        
    } catch (error) {
        console.error('Error fetching all news:', error);
        return [];
    }
}

/**
 * Remove duplicate articles
 */
function deduplicateArticles(articles) {
    const seen = new Set();
    return articles.filter(article => {
        const key = article.title + article.source.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ==============================================
// UI UPDATE FUNCTIONS
// ==============================================

/**
 * Update the featured analysis section
 */
function updateFeaturedAnalysis(article) {
    if (!article) return;
    
    const featuredCard = document.querySelector('.featured-card');
    if (!featuredCard) return;
    
    // Update title
    const titleEl = featuredCard.querySelector('.featured-title');
    if (titleEl) {
        titleEl.textContent = article.title;
    }
    
    // Update excerpt/description
    const excerptEl = featuredCard.querySelector('.featured-excerpt');
    if (excerptEl) {
        const description = article.description || article.content || article.title;
        // Limit to ~200 characters
        const trimmed = description.length > 200 ? 
            description.substring(0, 200) + '...' : description;
        excerptEl.textContent = trimmed;
    }
    
    // Update read more link
    const linkEl = featuredCard.querySelector('.read-more');
    if (linkEl && article.url) {
        linkEl.href = article.url;
        linkEl.target = '_blank';
        linkEl.textContent = 'Read Full Article at ' + article.source.name + ' →';
    }
    
    // Update tag
    const tagEl = featuredCard.querySelector('.analysis-tag');
    if (tagEl) {
        const publishedDate = new Date(article.publishedAt);
        const daysAgo = Math.floor((Date.now() - publishedDate) / (1000 * 60 * 60 * 24));
        tagEl.textContent = daysAgo === 0 ? 'TODAY' : daysAgo + ' DAYS AGO';
    }
    
    console.log('✅ Updated featured article: ' + article.title.substring(0, 50) + '...');
}

/**
 * Update market insights sidebar
 */
function updateMarketInsights(articles) {
    if (!articles || articles.length === 0) return;
    
    const insightItems = document.querySelectorAll('.sidebar-card .insight-item');
    
    // Update up to 4 insight items
    articles.slice(0, 4).forEach((article, index) => {
        if (insightItems[index]) {
            const titleEl = insightItems[index].querySelector('.insight-title');
            const metaEl = insightItems[index].querySelector('.insight-meta');
            
            if (titleEl) {
                // Limit title length
                const shortTitle = article.title.length > 60 ? 
                    article.title.substring(0, 60) + '...' : article.title;
                titleEl.textContent = shortTitle;
            }
            
            if (metaEl) {
                const publishedDate = new Date(article.publishedAt);
                const hoursAgo = Math.floor((Date.now() - publishedDate) / (1000 * 60 * 60));
                const timeText = hoursAgo < 24 ? hoursAgo + ' hours ago' : 
                    Math.floor(hoursAgo / 24) + ' days ago';
                metaEl.textContent = article.source.name + ' • ' + timeText;
            }
            
            // Make it clickable
            if (article.url) {
                insightItems[index].style.cursor = 'pointer';
                insightItems[index].onclick = function() {
                    window.open(article.url, '_blank');
                };
            }
        }
    });
    
    console.log('✅ Updated ' + Math.min(articles.length, 4) + ' market insights');
}

/**
 * Update "More Headlines" section (bottom of page)
 */
function updateMoreHeadlines(articles) {
    if (!articles || articles.length === 0) return;
    
    // Find the "More Sports Headlines" section - we'll add real estate headlines here or create new section
    const sportsSection = document.querySelector('#sports-content');
    if (!sportsSection) return;
    
    // Look for headline cards
    const headlineCards = sportsSection.querySelectorAll('[style*="background: var(--card-bg)"][style*="border: 1px solid var(--border)"][style*="padding: 1.5rem"]');
    
    // Update first few cards with real estate news
    articles.slice(0, Math.min(3, headlineCards.length)).forEach((article, index) => {
        if (headlineCards[index]) {
            const card = headlineCards[index];
            
            // Update badge
            const badge = card.querySelector('.card-badge');
            if (badge) {
                badge.textContent = 'REAL ESTATE';
                badge.style.background = 'rgba(201, 169, 97, 0.15)';
                badge.style.color = '#8b6d3a';
            }
            
            // Update title
            const titleEl = card.querySelector('h4');
            if (titleEl) {
                titleEl.textContent = article.title;
            }
            
            // Update description
            const descEl = card.querySelector('p[style*="color: var(--text-muted)"]');
            if (descEl && article.description) {
                const shortDesc = article.description.length > 120 ? 
                    article.description.substring(0, 120) + '...' : article.description;
                descEl.textContent = shortDesc;
            }
            
            // Update time
            const timeEl = card.querySelector('span[style*="font-size: 0.85rem"]');
            if (timeEl) {
                const publishedDate = new Date(article.publishedAt);
                const hoursAgo = Math.floor((Date.now() - publishedDate) / (1000 * 60 * 60));
                timeEl.textContent = hoursAgo < 24 ? hoursAgo + ' hours ago' : 
                    Math.floor(hoursAgo / 24) + ' days ago';
            }
            
            // Make card clickable
            if (article.url) {
                card.style.cursor = 'pointer';
                card.onclick = function() {
                    window.open(article.url, '_blank');
                };
            }
        }
    });
    
    console.log('✅ Updated headline cards with real estate news');
}

// ==============================================
// MAIN FUNCTION
// ==============================================

/**
 * Load all real estate news and update UI
 */
async function loadRealEstateNews() {
    console.log('📰 Loading real estate news...');
    
    // Check if API key is set
    if (NEWS_API_KEY === 'YOUR_NEWS_API_KEY_HERE') {
        console.warn('⚠️ News API key not set. Using placeholder content.');
        return;
    }
    
    try {
        // Fetch articles
        const articles = await fetchAllRealEstateNews();
        
        if (articles.length === 0) {
            console.warn('⚠️ No articles found');
            return;
        }
        
        // Update different sections
        updateFeaturedAnalysis(articles[0]); // Top article goes to featured
        updateMarketInsights(articles.slice(1)); // Rest go to sidebar
        updateMoreHeadlines(articles); // Also update headline section
        
        console.log('✅ Real estate news loaded successfully!');
        
    } catch (error) {
        console.error('❌ Error loading real estate news:', error);
        
        // Show error message
        if (error.message.includes('401')) {
            console.error('⚠️ Invalid News API key. Please check your key at newsapi.org');
        } else if (error.message.includes('429')) {
            console.error('⚠️ API rate limit reached (100/day). Using cached data or try tomorrow.');
        }
    }
}

// ==============================================
// AUTO-REFRESH
// ==============================================

/**
 * Set up automatic refresh (once per day)
 */
function setupNewsAutoRefresh() {
    // Refresh every 24 hours
    setInterval(() => {
        console.log('🔄 Auto-refreshing real estate news...');
        loadRealEstateNews();
    }, 24 * 60 * 60 * 1000);
}

// ==============================================
// INITIALIZATION
// ==============================================

// Load data when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadRealEstateNews();
        setupNewsAutoRefresh();
    });
} else {
    loadRealEstateNews();
    setupNewsAutoRefresh();
}

// Export functions for manual use
window.realEstateNewsAPI = {
    refresh: loadRealEstateNews,
    clearCache: () => {
        localStorage.removeItem('news_reits');
        localStorage.removeItem('news_housing');
        localStorage.removeItem('news_commercial');
        localStorage.removeItem('news_zillow');
        console.log('🗑️ News cache cleared');
    },
    search: fetchNewsArticles
};

console.log('📰 Real Estate News API loaded!');
console.log('💡 Use window.realEstateNewsAPI.refresh() to manually refresh news');
