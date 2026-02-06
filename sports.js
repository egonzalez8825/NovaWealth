// sports.js - Simple ESPN News Version (No API Key Needed)

const SPORTS_CACHE_DURATION = 5 * 60 * 1000;

function isSportsCacheValid(timestamp) {
    if (!timestamp) return false;
    return (Date.now() - timestamp) < SPORTS_CACHE_DURATION;
}

function getSportsFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const data = JSON.parse(cached);
        if (isSportsCacheValid(data.timestamp)) {
            console.log(`✅ Using cached sports data`);
            return data.value;
        }
        return null;
    } catch (error) {
        return null;
    }
}

function saveSportsToCache(key, value) {
    try {
        const data = { timestamp: Date.now(), value: value };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Cache error:', error);
    }
}

async function fetchESPNNews() {
    const cached = getSportsFromCache('espn_news');
    if (cached) return cached;
    
    try {
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news');
        const data = await response.json();
        const articles = data.articles || [];
        saveSportsToCache('espn_news', articles);
        return articles;
    } catch (error) {
        console.error('ESPN error:', error);
        return [];
    }
}

function updateNewsSection(articles) {
    if (!articles || articles.length === 0) return;
    
    const featuredCard = document.querySelector('#sports-content .featured-card');
    if (featuredCard && articles[0]) {
        const titleEl = featuredCard.querySelector('.featured-title');
        const excerptEl = featuredCard.querySelector('.featured-excerpt');
        if (titleEl) titleEl.textContent = articles[0].headline;
        if (excerptEl) excerptEl.textContent = articles[0].description || articles[0].headline;
    }
    
    const newsCards = document.querySelectorAll('#sports-content .insight-item');
    articles.slice(0, 4).forEach((article, index) => {
        if (newsCards[index]) {
            const titleEl = newsCards[index].querySelector('.insight-title');
            const metaEl = newsCards[index].querySelector('.insight-meta');
            if (titleEl) titleEl.textContent = article.headline;
            if (metaEl) metaEl.textContent = 'ESPN • Just now';
        }
    });
    
    console.log(`✅ Updated ${articles.length} news articles`);
}

async function loadSportsData() {
    console.log('🏀 Loading sports data...');
    try {
        const news = await fetchESPNNews();
        updateNewsSection(news);
        console.log('✅ Sports data loaded!');
    } catch (error) {
        console.error('Sports error:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSportsData);
} else {
    loadSportsData();
}

console.log('🏈 Sports module loaded!');
