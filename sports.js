// sports.js - Fetch Real Sports & Betting Data
// This file connects to The Odds API for betting odds and ESPN for news

// ==============================================
// CONFIGURATION
// ==============================================

// Get your FREE API key from: https://the-odds-api.com
const ODDS_API_KEY = '5350de570a70d264994c428b70b24c1d'; // Replace with your actual key

// Cache duration (2 minutes for odds - they change frequently)
const CACHE_DURATION = 2 * 60 * 1000;

// Sports to track
const SPORTS = {
    NBA: 'basketball_nba',
    MLB: 'baseball_mlb',
    NFL: 'americanfootball_nfl',
    NHL: 'icehockey_nhl',
    EPL: 'soccer_epl'
};

// Markets to fetch
const MARKETS = 'h2h,spreads,totals'; // Moneyline, spreads, over/under

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function isCacheValid(timestamp) {
    if (!timestamp) return false;
    return (Date.now() - timestamp) < CACHE_DURATION;
}

function getFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        if (isCacheValid(data.timestamp)) {
            console.log(`✅ Using cached sports data for ${key}`);
            return data.value;
        }
        return null;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

function saveToCache(key, value) {
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
// THE ODDS API FUNCTIONS
// ==============================================

/**
 * Fetch odds for a specific sport
 */
async function fetchOdds(sportKey) {
    const cacheKey = `odds_${sportKey}`;
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?` + 
                `apiKey=${ODDS_API_KEY}&` +
                `regions=us&` +
                `markets=${MARKETS}&` +
                `oddsFormat=american`;
    
    try {
        console.log(`🔄 Fetching odds for ${sportKey}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check remaining API calls
        const remaining = response.headers.get('x-requests-remaining');
        console.log(`📊 API calls remaining: ${remaining}`);
        
        saveToCache(cacheKey, data);
        return data;
        
    } catch (error) {
        console.error(`Error fetching odds for ${sportKey}:`, error);
        throw error;
    }
}

/**
 * Fetch list of upcoming games
 */
async function fetchUpcomingGames(sportKey) {
    const cacheKey = `games_${sportKey}`;
    
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?` +
                `apiKey=${ODDS_API_KEY}&` +
                `daysFrom=1`;
    
    try {
        console.log(`🔄 Fetching games for ${sportKey}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        saveToCache(cacheKey, data);
        return data;
        
    } catch (error) {
        console.error(`Error fetching games for ${sportKey}:`, error);
        return [];
    }
}

// ==============================================
// ESPN NEWS FUNCTIONS
// ==============================================

/**
 * Fetch ESPN headlines (using unofficial API)
 */
async function fetchESPNNews(sport = 'nba') {
    const cacheKey = `espn_news_${sport}`;
    
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    // ESPN unofficial API endpoints
    const endpoints = {
        nba: 'basketball/nba',
        nfl: 'football/nfl',
        mlb: 'baseball/mlb',
        soccer: 'soccer/eng.1'
    };
    
    const endpoint = endpoints[sport] || 'basketball/nba';
    const url = `https://site.api.espn.com/apis/site/v2/sports/${endpoint}/news`;
    
    try {
        console.log(`🔄 Fetching ESPN news for ${sport}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        saveToCache(cacheKey, data.articles || []);
        return data.articles || [];
        
    } catch (error) {
        console.error(`Error fetching ESPN news:`, error);
        return [];
    }
}

// ==============================================
// DATA PROCESSING
// ==============================================

/**
 * Format odds for display
 */
function formatOdds(americanOdds) {
    if (!americanOdds) return 'N/A';
    return americanOdds > 0 ? `+${americanOdds}` : americanOdds.toString();
}

/**
 * Find best odds from bookmakers
 */
function getBestOdds(bookmakers, market, outcome) {
    if (!bookmakers || bookmakers.length === 0) return null;
    
    let bestOdds = null;
    
    for (const bookmaker of bookmakers) {
        const marketData = bookmaker.markets.find(m => m.key === market);
        if (!marketData) continue;
        
        const outcomeData = marketData.outcomes.find(o => o.name === outcome);
        if (!outcomeData) continue;
        
        if (!bestOdds || Math.abs(outcomeData.price) < Math.abs(bestOdds)) {
            bestOdds = outcomeData.price;
        }
    }
    
    return bestOdds;
}

/**
 * Process game data for display
 */
function processGameData(game) {
    const bookmakers = game.bookmakers || [];
    
    // Get team names
    const homeTeam = game.home_team;
    const awayTeam = game.away_team;
    
    // Get spread
    const spreadMarket = bookmakers[0]?.markets.find(m => m.key === 'spreads');
    const spread = spreadMarket?.outcomes[0] || null;
    
    // Get totals (over/under)
    const totalsMarket = bookmakers[0]?.markets.find(m => m.key === 'totals');
    const total = totalsMarket?.outcomes[0] || null;
    
    // Get moneyline
    const h2hMarket = bookmakers[0]?.markets.find(m => m.key === 'h2h');
    const homeOdds = h2hMarket?.outcomes.find(o => o.name === homeTeam)?.price;
    const awayOdds = h2hMarket?.outcomes.find(o => o.name === awayTeam)?.price;
    
    return {
        id: game.id,
        sport: game.sport_title,
        homeTeam,
        awayTeam,
        startTime: new Date(game.commence_time),
        spread: spread ? {
            team: spread.name,
            points: spread.point,
            odds: spread.price
        } : null,
        total: total ? {
            points: total.point,
            over: total.price,
            under: totalsMarket.outcomes.find(o => o.name === 'Under')?.price
        } : null,
        moneyline: {
            home: homeOdds,
            away: awayOdds
        }
    };
}

// ==============================================
// UI UPDATE FUNCTIONS
// ==============================================

/**
 * Update betting card in the HTML
 */
function updateBettingCard(gameData, cardIndex) {
    const bettingCards = document.querySelectorAll('.badge-betting');
    
    if (bettingCards[cardIndex]) {
        const card = bettingCards[cardIndex].closest('.card');
        
        // Update game title
        const title = card.querySelector('.card-title');
        if (title) {
            title.textContent = `${gameData.awayTeam} @ ${gameData.homeTeam}`;
        }
        
        // Update game time
        const gameTime = card.querySelector('.card-header + div');
        if (gameTime) {
            const timeStr = gameData.startTime.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/New_York'
            });
            gameTime.querySelector('span').textContent = timeStr;
        }
        
        // Update metrics
        const metricRows = card.querySelectorAll('.metric-row');
        
        if (gameData.spread && metricRows[0]) {
            metricRows[0].querySelector('.metric-value').textContent = 
                `${gameData.spread.team} ${gameData.spread.points > 0 ? '+' : ''}${gameData.spread.points}`;
        }
        
        if (gameData.total && metricRows[1]) {
            metricRows[1].querySelector('.metric-value').textContent = 
                `${gameData.total.points}`;
        }
        
        if (gameData.moneyline && metricRows[2]) {
            metricRows[2].querySelector('.metric-value').textContent = 
                `${gameData.homeTeam.split(' ').pop()} ${formatOdds(gameData.moneyline.home)} / ` +
                `${gameData.awayTeam.split(' ').pop()} ${formatOdds(gameData.moneyline.away)}`;
        }
        
        console.log(`✅ Updated betting card: ${gameData.awayTeam} @ ${gameData.homeTeam}`);
    }
}

/**
 * Update ESPN news section
 */
function updateNewsSection(articles) {
    // Find news cards in the sports section
    const newsCards = document.querySelectorAll('#sports-content .insight-item');
    
    articles.slice(0, 4).forEach((article, index) => {
        if (newsCards[index]) {
            const titleEl = newsCards[index].querySelector('.insight-title');
            const metaEl = newsCards[index].querySelector('.insight-meta');
            
            if (titleEl) titleEl.textContent = article.headline;
            if (metaEl) {
                const publishedDate = new Date(article.published);
                const hoursAgo = Math.floor((Date.now() - publishedDate) / (1000 * 60 * 60));
                metaEl.textContent = `${article.type || 'News'} • ${hoursAgo} hours ago`;
            }
        }
    });
    
    console.log(`✅ Updated ${articles.length} news articles`);
}

/**
 * Update featured sports news
 */
function updateFeaturedNews(article) {
    const featuredCard = document.querySelector('#sports-content .featured-card');
    if (!featuredCard || !article) return;
    
    const titleEl = featuredCard.querySelector('.featured-title');
    const excerptEl = featuredCard.querySelector('.featured-excerpt');
    
    if (titleEl) titleEl.textContent = article.headline;
    if (excerptEl) excerptEl.textContent = article.description || article.headline;
    
    console.log(`✅ Updated featured news`);
}

/**
 * Show loading state
 */
function showLoadingState() {
    console.log('⏳ Loading sports data...');
}

/**
 * Show error state
 */
function showErrorState(message) {
    console.error('❌ Sports API Error:', message);
    alert(`Error loading sports data: ${message}\n\nPlease check:\n1. Your Odds API key is correct\n2. You have API calls remaining\n3. Internet connection is working`);
}

// ==============================================
// MAIN FUNCTION
// ==============================================

/**
 * Load all sports and betting data
 */
async function loadSportsData() {
    console.log('🏀 Starting to load sports data...');
    
    // Check if API key is set
    if (ODDS_API_KEY === 'YOUR_ODDS_API_KEY_HERE') {
        console.warn('⚠️ Odds API key not set. Using demo data.');
        // Could still load ESPN news
    }
    
    showLoadingState();
    
    try {
        // Load ESPN news (doesn't require auth)
        const nbaNews = await fetchESPNNews('nba');
        if (nbaNews.length > 0) {
            updateFeaturedNews(nbaNews[0]);
            updateNewsSection(nbaNews);
        }
        
        // Load betting odds if API key is set
        if (ODDS_API_KEY !== 'YOUR_ODDS_API_KEY_HERE') {
            // Load NBA games
            const nbaOdds = await fetchOdds(SPORTS.NBA);
            if (nbaOdds && nbaOdds.length > 0) {
                // Process first few games
                const processedGames = nbaOdds.slice(0, 3).map(processGameData);
                processedGames.forEach((game, index) => {
                    updateBettingCard(game, index);
                });
            }
            
            // Add delay before next API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Load MLB games
            const mlbOdds = await fetchOdds(SPORTS.MLB);
            if (mlbOdds && mlbOdds.length > 0) {
                const mlbGame = processGameData(mlbOdds[0]);
                updateBettingCard(mlbGame, 1); // Update second betting card
            }
        }
        
        console.log('✅ Sports data loaded successfully!');
        
    } catch (error) {
        showErrorState(error.message);
    }
}

// ==============================================
// AUTO-REFRESH
// ==============================================

/**
 * Set up automatic refresh for live odds
 */
function setupAutoRefresh() {
    // Refresh every 2 minutes (odds change frequently)
    setInterval(() => {
        console.log('🔄 Auto-refreshing sports data...');
        loadSportsData();
    }, 2 * 60 * 1000);
}

// ==============================================
// INITIALIZATION
// ==============================================

// Load data when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadSportsData();
        setupAutoRefresh();
    });
} else {
    loadSportsData();
    setupAutoRefresh();
}

// Export functions for manual use
window.sportsAPI = {
    refresh: loadSportsData,
    clearCache: () => {
        Object.values(SPORTS).forEach(sport => {
            localStorage.removeItem(`odds_${sport}`);
            localStorage.removeItem(`games_${sport}`);
        });
        localStorage.removeItem('espn_news_nba');
        console.log('🗑️ Sports cache cleared');
    },
    getOdds: (sport) => fetchOdds(SPORTS[sport] || sport),
    getNews: fetchESPNNews
};

console.log('🏈 Sports API loaded! Use window.sportsAPI.refresh() to manually refresh data.');
