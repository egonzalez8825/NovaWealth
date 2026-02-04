// stocks.js - Fetch Real Stock Market Data
// This file connects to Alpha Vantage API to get real stock prices and fundamentals

// ==============================================
// CONFIGURATION
// ==============================================

// Get your FREE API key from: https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = 'PPZ3V8LYTG5BL27G'; // Replace with your actual key

// Cache duration (5 minutes = 300000 milliseconds)
const CACHE_DURATION = 5 * 60 * 1000;

// Stocks to track
const STOCKS_TO_TRACK = ['AAPL', 'MSFT', 'O']; // Apple, Microsoft, Realty Income REIT

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp) {
    if (!timestamp) return false;
    return (Date.now() - timestamp) < CACHE_DURATION;
}

/**
 * Get data from cache
 */
function getFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        if (isCacheValid(data.timestamp)) {
            console.log(`✅ Using cached data for ${key}`);
            return data.value;
        }
        return null;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

/**
 * Save data to cache
 */
function saveToCache(key, value) {
    try {
        const data = {
            timestamp: Date.now(),
            value: value
        };
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 Cached data for ${key}`);
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

// ==============================================
// API FUNCTIONS
// ==============================================

/**
 * Fetch stock overview data (fundamentals)
 */
async function fetchStockOverview(symbol) {
    const cacheKey = `stock_overview_${symbol}`;
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    try {
        console.log(`🔄 Fetching overview for ${symbol}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Note']) {
            throw new Error('API rate limit reached. Please wait a minute.');
        }
        
        if (data['Error Message']) {
            throw new Error(`Invalid symbol: ${symbol}`);
        }
        
        // Cache the result
        saveToCache(cacheKey, data);
        return data;
        
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch real-time stock quote
 */
async function fetchStockQuote(symbol) {
    const cacheKey = `stock_quote_${symbol}`;
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    try {
        console.log(`🔄 Fetching quote for ${symbol}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Note']) {
            throw new Error('API rate limit reached. Please wait a minute.');
        }
        
        const quote = data['Global Quote'];
        if (!quote) {
            throw new Error(`No quote data for ${symbol}`);
        }
        
        // Cache the result
        saveToCache(cacheKey, quote);
        return quote;
        
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        throw error;
    }
}

// ==============================================
// DATA PROCESSING
// ==============================================

/**
 * Calculate metrics from stock data
 */
function calculateMetrics(overview, quote) {
    return {
        symbol: overview.Symbol,
        name: overview.Name,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        peRatio: parseFloat(overview.PERatio) || 'N/A',
        dividendYield: parseFloat(overview.DividendYield) * 100 || 0,
        marketCap: formatMarketCap(overview.MarketCapitalization),
        fiftyTwoWeekHigh: parseFloat(overview['52WeekHigh']),
        fiftyTwoWeekLow: parseFloat(overview['52WeekLow']),
        beta: parseFloat(overview.Beta) || 'N/A',
        eps: parseFloat(overview.EPS) || 'N/A',
        sector: overview.Sector || 'N/A',
        industry: overview.Industry || 'N/A'
    };
}

/**
 * Format large numbers (market cap)
 */
function formatMarketCap(value) {
    const num = parseFloat(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
}

// ==============================================
// UI UPDATE FUNCTIONS
// ==============================================

/**
 * Update stock card in the HTML
 */
function updateStockCard(stockData, cardIndex) {
    // This function updates your HTML elements with real data
    // You'll need to adjust selectors based on your HTML structure
    
    const cards = document.querySelectorAll('.card');
    const stockCards = Array.from(cards).filter(card => 
        card.querySelector('.badge-stock')
    );
    
    if (stockCards[cardIndex]) {
        const card = stockCards[cardIndex];
        
        // Update title
        const title = card.querySelector('.card-title');
        if (title) {
            title.textContent = `${stockData.name} (${stockData.symbol})`;
        }
        
        // Update price in chart placeholder
        const chartPlaceholder = card.querySelector('.chart-placeholder');
        if (chartPlaceholder) {
            const isPositive = stockData.change >= 0;
            chartPlaceholder.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">
                        $${stockData.price.toFixed(2)}
                    </div>
                    <div style="font-size: 1.1rem; color: ${isPositive ? 'var(--green)' : 'var(--red)'}; margin-top: 0.5rem;">
                        ${isPositive ? '+' : ''}${stockData.change.toFixed(2)} (${isPositive ? '+' : ''}${stockData.changePercent.toFixed(2)}%)
                    </div>
                </div>
            `;
        }
        
        // Update metrics
        const metricRows = card.querySelectorAll('.metric-row');
        if (metricRows.length >= 5) {
            // P/E Ratio
            metricRows[0].querySelector('.metric-value').textContent = 
                stockData.peRatio !== 'N/A' ? stockData.peRatio.toFixed(2) : 'N/A';
            
            // Dividend Yield
            const dividendValue = metricRows[1].querySelector('.metric-value');
            dividendValue.textContent = `${stockData.dividendYield.toFixed(2)}%`;
            dividendValue.className = 'metric-value ' + (stockData.dividendYield > 0 ? 'positive' : '');
            
            // Market Cap or other metric
            metricRows[4].querySelector('.metric-value').textContent = stockData.marketCap;
        }
        
        console.log(`✅ Updated card for ${stockData.symbol}`);
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    const stockCards = document.querySelectorAll('.badge-stock');
    stockCards.forEach(badge => {
        const card = badge.closest('.card');
        const chartPlaceholder = card.querySelector('.chart-placeholder');
        if (chartPlaceholder) {
            chartPlaceholder.innerHTML = `
                <div style="text-align: center; color: var(--text-muted);">
                    <div style="font-size: 1.2rem;">Loading real-time data...</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">⏳</div>
                </div>
            `;
        }
    });
}

/**
 * Show error state
 */
function showErrorState(message) {
    console.error('❌ Error:', message);
    alert(`Error loading stock data: ${message}\n\nPlease check:\n1. Your API key is correct\n2. You haven't hit rate limits (25 calls/day for free tier)\n3. Internet connection is working`);
}

// ==============================================
// MAIN FUNCTION
// ==============================================

/**
 * Load all stock data
 */
async function loadStockData() {
    console.log('🚀 Starting to load stock data...');
    
    // Check if API key is set
    if (ALPHA_VANTAGE_API_KEY === 'YOUR_API_KEY_HERE') {
        showErrorState('Please set your Alpha Vantage API key in stocks.js');
        return;
    }
    
    showLoadingState();
    
    try {
        // Load each stock (with delay to avoid rate limits)
        for (let i = 0; i < STOCKS_TO_TRACK.length; i++) {
            const symbol = STOCKS_TO_TRACK[i];
            
            try {
                // Fetch overview and quote
                const [overview, quote] = await Promise.all([
                    fetchStockOverview(symbol),
                    fetchStockQuote(symbol)
                ]);
                
                // Calculate metrics
                const stockData = calculateMetrics(overview, quote);
                
                // Update UI
                updateStockCard(stockData, i);
                
                // Add delay between API calls (free tier limit: 5 calls/minute)
                if (i < STOCKS_TO_TRACK.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay
                }
                
            } catch (error) {
                console.error(`Failed to load ${symbol}:`, error);
            }
        }
        
        console.log('✅ Stock data loaded successfully!');
        
    } catch (error) {
        showErrorState(error.message);
    }
}

// ==============================================
// AUTO-REFRESH
// ==============================================

/**
 * Set up automatic refresh
 */
function setupAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
        console.log('🔄 Auto-refreshing stock data...');
        loadStockData();
    }, 5 * 60 * 1000);
}

// ==============================================
// INITIALIZATION
// ==============================================

// Load data when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadStockData();
        setupAutoRefresh();
    });
} else {
    loadStockData();
    setupAutoRefresh();
}

// Export functions for manual use
window.stockAPI = {
    refresh: loadStockData,
    clearCache: () => {
        STOCKS_TO_TRACK.forEach(symbol => {
            localStorage.removeItem(`stock_overview_${symbol}`);
            localStorage.removeItem(`stock_quote_${symbol}`);
        });
        console.log('🗑️ Cache cleared');
    }
};

console.log('📈 Stock API loaded! Use window.stockAPI.refresh() to manually refresh data.');
