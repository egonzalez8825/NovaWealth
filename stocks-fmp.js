// stocks.js - Fetch Real Stock Market Data (Financial Modeling Prep API)
// This file connects to Financial Modeling Prep for real stock prices and fundamentals
// FREE tier: 250 API calls per day (much better than Alpha Vantage's 25)

// ==============================================
// CONFIGURATION
// ==============================================

// Get your FREE API key from: https://site.financialmodelingprep.com/register
const FMP_API_KEY = 'YOUR_FMP_API_KEY_HERE'; // Replace with your actual key

// Cache duration (5 minutes = 300000 milliseconds)
const STOCK_CACHE_DURATION = 5 * 60 * 1000;

// Stocks to track
const STOCKS_TO_TRACK = ['AAPL', 'MSFT', 'O']; // Apple, Microsoft, Realty Income REIT

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Check if cached data is still valid
 */
function isStockCacheValid(timestamp) {
    if (!timestamp) return false;
    return (Date.now() - timestamp) < STOCK_CACHE_DURATION;
}

/**
 * Get data from cache
 */
function getStockFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        if (isStockCacheValid(data.timestamp)) {
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
function saveStockToCache(key, value) {
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
// API FUNCTIONS - FINANCIAL MODELING PREP
// ==============================================

/**
 * Fetch stock quote (price, change, etc.)
 */
async function fetchFMPQuote(symbol) {
    const cacheKey = `fmp_quote_${symbol}`;
    
    // Check cache first
    const cached = getStockFromCache(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`;
    
    try {
        console.log(`🔄 Fetching quote for ${symbol}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check for errors
        if (data.error || data['Error Message']) {
            throw new Error(data.error || data['Error Message']);
        }
        
        if (!data || data.length === 0) {
            throw new Error(`No quote data for ${symbol}`);
        }
        
        const quote = data[0]; // FMP returns array
        
        // Cache the result
        saveStockToCache(cacheKey, quote);
        return quote;
        
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch company profile (fundamentals)
 */
async function fetchFMPProfile(symbol) {
    const cacheKey = `fmp_profile_${symbol}`;
    
    // Check cache first
    const cached = getStockFromCache(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`;
    
    try {
        console.log(`🔄 Fetching profile for ${symbol}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error(`No profile data for ${symbol}`);
        }
        
        const profile = data[0]; // FMP returns array
        
        // Cache the result
        saveStockToCache(cacheKey, profile);
        return profile;
        
    } catch (error) {
        console.error(`Error fetching profile for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch key metrics (P/E ratio, etc.)
 */
async function fetchFMPMetrics(symbol) {
    const cacheKey = `fmp_metrics_${symbol}`;
    
    // Check cache first
    const cached = getStockFromCache(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const url = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${FMP_API_KEY}`;
    
    try {
        console.log(`🔄 Fetching metrics for ${symbol}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            // Metrics might not be available, return null but don't error
            return null;
        }
        
        const metrics = data[0];
        
        // Cache the result
        saveStockToCache(cacheKey, metrics);
        return metrics;
        
    } catch (error) {
        console.error(`Error fetching metrics for ${symbol}:`, error);
        return null; // Don't throw, just return null
    }
}

// ==============================================
// DATA PROCESSING
// ==============================================

/**
 * Calculate metrics from stock data
 */
function calculateStockMetrics(quote, profile, metrics) {
    return {
        symbol: quote.symbol,
        name: quote.name || profile?.companyName || quote.symbol,
        price: quote.price || 0,
        change: quote.change || 0,
        changePercent: quote.changesPercentage || 0,
        peRatio: quote.pe || profile?.pe || metrics?.peRatioTTM || 'N/A',
        dividendYield: (profile?.lastDiv || 0) / (quote.price || 1) * 100,
        marketCap: formatMarketCap(quote.marketCap || profile?.mktCap || 0),
        fiftyTwoWeekHigh: quote.yearHigh || 0,
        fiftyTwoWeekLow: quote.yearLow || 0,
        eps: quote.eps || profile?.eps || 'N/A',
        sector: profile?.sector || 'N/A',
        industry: profile?.industry || 'N/A',
        volume: quote.volume || 0
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
    // Find stock cards (cards with .badge-stock)
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
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
                        Volume: ${formatVolume(stockData.volume)}
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
            
            // 52 Week High/Low or other metric
            if (metricRows[2]) {
                const label = metricRows[2].querySelector('.metric-label');
                if (label && label.textContent.includes('5-Year CAGR')) {
                    // Keep the original metric
                } else {
                    metricRows[2].querySelector('.metric-label').textContent = '52 Week Range';
                    metricRows[2].querySelector('.metric-value').textContent = 
                        `$${stockData.fiftyTwoWeekLow.toFixed(2)} - $${stockData.fiftyTwoWeekHigh.toFixed(2)}`;
                }
            }
            
            // Market Cap
            metricRows[4].querySelector('.metric-value').textContent = stockData.marketCap;
        }
        
        console.log(`✅ Updated card for ${stockData.symbol}`);
    }
}

/**
 * Format volume numbers
 */
function formatVolume(value) {
    const num = parseFloat(value);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toString();
}

/**
 * Show loading state
 */
function showStockLoadingState() {
    const stockCards = document.querySelectorAll('.badge-stock');
    stockCards.forEach(badge => {
        const card = badge.closest('.card');
        const chartPlaceholder = card?.querySelector('.chart-placeholder');
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
function showStockErrorState(message) {
    console.error('❌ Error:', message);
    
    // Show friendly error in UI
    const stockCards = document.querySelectorAll('.badge-stock');
    if (stockCards.length > 0) {
        const card = stockCards[0].closest('.card');
        const chartPlaceholder = card?.querySelector('.chart-placeholder');
        if (chartPlaceholder) {
            chartPlaceholder.innerHTML = `
                <div style="text-align: center; color: var(--red); padding: 1rem;">
                    <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">⚠️ API Error</div>
                    <div style="font-size: 0.9rem;">${message}</div>
                </div>
            `;
        }
    }
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
    if (FMP_API_KEY === 'YOUR_FMP_API_KEY_HERE') {
        showStockErrorState('Please set your FMP API key in stocks.js');
        return;
    }
    
    showStockLoadingState();
    
    try {
        // Load each stock with minimal delay
        for (let i = 0; i < STOCKS_TO_TRACK.length; i++) {
            const symbol = STOCKS_TO_TRACK[i];
            
            try {
                // Fetch quote, profile, and metrics
                const quote = await fetchFMPQuote(symbol);
                const profile = await fetchFMPProfile(symbol);
                const metrics = await fetchFMPMetrics(symbol);
                
                // Calculate metrics
                const stockData = calculateStockMetrics(quote, profile, metrics);
                
                // Update UI
                updateStockCard(stockData, i);
                
                // Small delay between stocks (FMP has better limits, can be faster)
                if (i < STOCKS_TO_TRACK.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
                }
                
            } catch (error) {
                console.error(`Failed to load ${symbol}:`, error);
                // Continue with next stock even if one fails
            }
        }
        
        console.log('✅ Stock data loaded successfully!');
        
    } catch (error) {
        showStockErrorState(error.message);
    }
}

// ==============================================
// AUTO-REFRESH
// ==============================================

/**
 * Set up automatic refresh
 */
function setupStockAutoRefresh() {
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
        setupStockAutoRefresh();
    });
} else {
    loadStockData();
    setupStockAutoRefresh();
}

// Export functions for manual use
window.stockAPI = {
    refresh: loadStockData,
    clearCache: () => {
        STOCKS_TO_TRACK.forEach(symbol => {
            localStorage.removeItem(`fmp_quote_${symbol}`);
            localStorage.removeItem(`fmp_profile_${symbol}`);
            localStorage.removeItem(`fmp_metrics_${symbol}`);
        });
        console.log('🗑️ Stock cache cleared');
    }
};

console.log('📈 Stock API loaded! Use window.stockAPI.refresh() to manually refresh data.');
