// sports.js - Fetch Sports Data & News (RapidAPI Version)
// This version uses RapidAPI's API-Football which is more reliable

// ==============================================
// CONFIGURATION
// ==============================================

// Get your FREE RapidAPI key from: https://rapidapi.com
// Subscribe to API-Football: https://rapidapi.com/api-sports/api/api-football
const RAPIDAPI_KEY = 'YOUR_RAPIDAPI_KEY_HERE'; // Replace with your actual key

// Cache duration (5 minutes for sports data)
const SPORTS_CACHE_DURATION = 5 * 60 * 1000;

// ==============================================
// HELPER FUNCTIONS
// ==============================================

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
            console.log(`✅ Using cached sports data for ${key}`);
            return data.value;
        }
        return null;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

function saveSportsToCache(key, value) {
    try {
        const data = {
            timestamp: Date.now(),
            value: value
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

// ==============================================
// ESPN NEWS FUNCTIONS (NO KEY NEEDED)
// ==============================================

/**
 * Fetch ESPN headlines
 */
async function fetchESPNNews(sport = 'nba') {
    const cacheKey = `espn_news_${sport}`;
    
    const cached = getSportsFromCache(cacheKey);
    if (cached) return cached;
    
    const endpoints = {
        nba: 'basketball/nba',
        nfl: 'football/nfl',
        mlb: 'baseball/mlb',
        nhl: 'hockey/nhl',
        soccer: 'soccer/usa.1'
    };
    
    const endpoint = endpoints[sport] || 'basketball/nba';
    const url = `https://site.api.espn.com/apis/site/v2/sports/${endpoint}/news`;
    
    try {
        console.log(`🔄 Fetching ESPN news for ${sport}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        const articles = data.articles || [];
        saveSportsToCache(cacheKey, articles);
        return articles;
        
    } catch (error) {
        console.error(`Error fetching ESPN news:`, error);
        return [];
    }
}

/**
 * Fetch ESPN scores
 */
async function fetchESPNScores(sport = 'nba') {
    const cacheKey = `espn_scores_${sport}`;
    
    const cached = getSportsFromCache(cacheKey);
    if (cached) return cached;
    
    const endpoints = {
        nba: 'basketball/nba',
        nfl: 'football/nfl',
        mlb: 'baseball/mlb',
        nhl: 'hockey/nhl'
    };
    
    const endpoint = endpoints[sport] || 'basketball/nba';
    const url = `https://site.api.espn.com/apis/site/v2/sports/${endpoint}/scoreboard`;
    
    try {
        console.log(`🔄 Fetching ${sport.toUpperCase()} scores...`);
        const response = await fetch(url);
        const data = await response.json();
        
        const events = data.events || [];
        saveSportsToCache(cacheKey, events);
        return events;
        
    } catch (error) {
        console.error(`Error fetching scores:`, error);
        return [];
    }
}

// ==============================================
// SAMPLE DATA (FALLBACK IF NO API)
// ==============================================

const SAMPLE_GAMES = [
    {
        sport: 'NBA',
        homeTeam: 'Lakers',
        awayTeam: 'Celtics',
        time: 'Tonight, 7:30 PM EST',
        venue: 'TD Garden, Boston',
        spread: 'Celtics -4.5',
        total: '223.5',
        moneyline: 'BOS -180 / LAL +155'
    },
    {
        sport: 'MLB',
        homeTeam: 'Red Sox',
        awayTeam: 'Yankees',
        time: 'Tonight, 8:10 PM EST',
        venue: 'Fenway Park',
        spread: 'Yankees -1.5',
        total: '8.5 Runs',
        moneyline: 'NYY -145 / BOS +125'
    },
    {
        sport: 'NBA',
        homeTeam: 'Warriors',
        awayTeam: 'Suns',
        time: 'Tonight, 10:00 PM EST',
        venue: 'Chase Center, SF',
        spread: 'Warriors -6.5',
        total: '231.5',
        moneyline: 'GSW -245 / PHX +200'
    }
];

// ==============================================
// UI UPDATE FUNCTIONS
// ==============================================

/**
 * Update ESPN news section
 */
function updateNewsSection(articles) {
    if (!articles || articles.length === 0) {
        console.log('⚠️ No news articles to display');
        return;
    }
    
    // Update featured news
    const featuredCard = document.querySelector('#sports-content .featured-card');
    if (featuredCard && articles[0]) {
        const titleEl = featuredCard.querySelector('.featured-title');
        const excerptEl = featuredCard.querySelector('.featured-excerpt');
        
        if (titleEl) titleEl.textContent = articles[0].headline;
        if (excerptEl) excerptEl.textContent = articles[0].description || articles[0].headline;
    }
    
    // Update sidebar news items
    const newsCards = document.querySelectorAll('#sports-content .insight-item');
    articles.slice(0, 4).forEach((article, index) => {
        if (newsCards[index]) {
            const titleEl = newsCards[index].querySelector('.insight-title');
            const metaEl = newsCards[index].querySelector('.insight-meta');
            
            if (titleEl) titleEl.textContent = article.headline;
            if (metaEl) {
                const publishedDate = new Date(article.published);
                const hoursAgo = Math.floor((Date.now() - publishedDate) / (1000 * 60 * 60));
                metaEl.textContent = `${article.type || 'News'} • ${hoursAgo}h ago`;
            }
        }
    });
    
    console.log(`✅ Updated ${articles.length} news articles`);
}

/**
 * Update betting cards with sample or real data
 */
function updateBettingCards(games) {
    const bettingCards = document.querySelectorAll('.badge-betting');
    
    games.forEach((game, index) => {
        if (bettingCards[index]) {
            const card = bettingCards[index].closest('.card');
            
            // Update title
            const title = card.querySelector('.card-title');
            if (title) {
                title.textContent = `${game.awayTeam} vs ${game.homeTeam}`;
            }
            
            // Update badge
            const badge = card.querySelector('.badge-betting');
            if (badge) {
                badge.textContent = game.sport;
            }
            
            // Update game time
            const timeDiv = card.querySelector('.card-header + div');
            if (timeDiv) {
                const timeSpan = timeDiv.querySelector('span');
                if (timeSpan) timeSpan.textContent = game.time;
                
                const venueSpan = timeDiv.querySelectorAll('span')[1];
                if (venueSpan) venueSpan.textContent = game.venue;
            }
            
            // Update metrics
            const metricRows = card.querySelectorAll('.metric-row');
            if (metricRows.length >= 3) {
                if (metricRows[0]) {
                    metricRows[0].querySelector('.metric-value').textContent = game.spread;
                }
                if (metricRows[1]) {
                    metricRows[1].querySelector('.metric-value').textContent = game.total;
                }
                if (metricRows[2]) {
                    metricRows[2].querySelector('.metric-value').textContent = game.moneyline;
                }
            }
        }
    });
    
    console.log(`✅ Updated ${games.length} betting cards`);
}

/**
 * Process ESPN scores into betting-friendly format
 */
function processESPNScores(events) {
    if (!events || events.length === 0) return [];
    
    return events.slice(0, 6).map(event => {
        const competition = event.competitions?.[0];
        const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
        const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
        
        return {
            sport: event.league?.abbreviation || 'NBA',
            homeTeam: homeTeam?.team?.displayName || 'Home Team',
            awayTeam: awayTeam?.team?.displayName || 'Away Team',
            time: new Date(event.date).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            }),
            venue: competition?.venue?.fullName || 'TBD',
            spread: 'Check sportsbook',
            total: 'Check sportsbook',
            moneyline: 'Check sportsbook'
        };
    });
}

/**
 * Show loading state
 */
function showSportsLoadingState() {
    console.log('⏳ Loading sports data...');
}

/**
 * Show error state
 */
function showSportsErrorState(message) {
    console.error('❌ Sports API Error:', message);
    console.log('ℹ️ Using sample data instead');
}

// ==============================================
// MAIN FUNCTION
// ==============================================

/**
 * Load all sports data
 */
async function loadSportsData() {
    console.log('🏀 Starting to load sports data...');
    
    showSportsLoadingState();
    
    try {
        // Always load ESPN news (doesn't require RapidAPI key)
        const nbaNews = await fetchESPNNews('nba');
        if (nbaNews.length > 0) {
            updateNewsSection(nbaNews);
        }
        
        // Try to load real scores from ESPN
        try {
            const nbaScores = await fetchESPNScores('nba');
            const mlbScores = await fetchESPNScores('mlb');
            const nflScores = await fetchESPNScores('nfl');
            
            const allScores = [
                ...processESPNScores(nbaScores),
                ...processESPNScores(mlbScores),
                ...processESPNScores(nflScores)
            ];
            
            if (allScores.length > 0) {
                updateBettingCards(allScores);
                console.log('✅ Loaded real game data from ESPN');
            } else {
                // Fallback to sample data
                updateBettingCards(SAMPLE_GAMES);
                console.log('ℹ️ Using sample betting data');
            }
        } catch (error) {
            console.error('Error loading scores:', error);
            updateBettingCards(SAMPLE_GAMES);
            console.log('ℹ️ Using sample betting data (ESPN scores unavailable)');
        }
        
        console.log('✅ Sports data loaded successfully!');
        
    } catch (error) {
        showSportsErrorState(error.message);
        // Use sample data as fallback
        updateBettingCards(SAMPLE_GAMES);
    }
}

// ==============================================
// AUTO-REFRESH
// ==============================================

/**
 * Set up automatic refresh
 */
function setupSportsAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
        console.log('🔄 Auto-refreshing sports data...');
        loadSportsData();
    }, 5 * 60 * 1000);
}

// ==============================================
// INITIALIZATION
// ==============================================

// Load data when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadSportsData();
        setupSportsAutoRefresh();
    });
} else {
    loadSportsData();
    setupSportsAutoRefresh();
}

// Export functions for manual use
window.sportsAPI = {
    refresh: loadSportsData,
    clearCache: () => {
        localStorage.removeItem('espn_news_nba');
        localStorage.removeItem('espn_scores_nba');
        localStorage.removeItem('espn_scores_mlb');
        localStorage.removeItem('espn_scores_nfl');
        console.log('🗑️ Sports cache cleared');
    },
    getNews: fetchESPNNews,
    getScores: fetchESPNScores
};

console.log('🏈 Sports API loaded! News from ESPN, using sample betting data.');
console.log('💡 For real betting odds, sign up at https://rapidapi.com/api-sports');
