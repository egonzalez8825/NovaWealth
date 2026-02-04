// stocks.js - Fetch Real Stock Market Data (Financial Modeling Prep API)

const FMP_API_KEY = 'cLdDw6rfrPX44T7A1HFNMxah2Ckb3Dk9';
const STOCK_CACHE_DURATION = 5 * 60 * 1000;
const STOCKS_TO_TRACK = ['AAPL', 'MSFT', 'O'];

function isStockCacheValid(timestamp) {
    if (!timestamp) return false;
    return (Date.now() - timestamp) < STOCK_CACHE_DURATION;
}

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
        return null;
    }
}

function saveStockToCache(key, value) {
    try {
        const data = { timestamp: Date.now(), value: value };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Cache error:', error);
    }
}

async function fetchFMPQuote(symbol) {
    const cacheKey = `fmp_quote_${symbol}`;
    const cached = getStockFromCache(cacheKey);
    if (cached) return cached;
    
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`;
    
    try {
        console.log(`🔄 Fetching quote for ${symbol}...`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data || data.length === 0) throw new Error(`No data for ${symbol}`);
        const quote = data[0];
        saveStockToCache(cacheKey, quote);
        return quote;
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        throw error;
    }
}

async function fetchFMPProfile(symbol) {
    const cacheKey = `fmp_profile_${symbol}`;
    const cached = getStockFromCache(cacheKey);
    if (cached) return cached;
    
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data || data.length === 0) return null;
        const profile = data[0];
        saveStockToCache(cacheKey, profile);
        return profile;
    } catch (error) {
        console.error(`Error fetching profile for ${symbol}:`, error);
        return null;
    }
}

function calculateStockMetrics(quote, profile) {
    return {
        symbol: quote.symbol,
        name: quote.name || profile?.companyName || quote.symbol,
        price: quote.price || 0,
        change: quote.change || 0,
        changePercent: quote.changesPercentage || 0,
        peRatio: quote.pe || profile?.pe || 'N/A',
        dividendYield: ((profile?.lastDiv || 0) / (quote.price || 1)) * 100,
        marketCap: formatMarketCap(quote.marketCap || profile?.mktCap || 0),
        fiftyTwoWeekHigh: quote.yearHigh || 0,
        fiftyTwoWeekLow: quote.yearLow || 0,
        volume: quote.volume || 0
    };
}

function formatMarketCap(value) {
    const num = parseFloat(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
}

function formatVolume(value) {
    const num = parseFloat(value);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toString();
}

function updateStockCard(stockData, cardIndex) {
    const cards = document.querySelectorAll('.card');
    const stockCards = Array.from(cards).filter(card => card.querySelector('.badge-stock'));
    
    if (stockCards[cardIndex]) {
        const card = stockCards[cardIndex];
        
        const title = card.querySelector('.card-title');
        if (title) {
            title.textContent = `${stockData.name} (${stockData.symbol})`;
        }
        
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
        
        const metricRows = card.querySelectorAll('.metric-row');
        if (metricRows.length >= 5) {
            metricRows[0].querySelector('.metric-value').textContent = 
                stockData.peRatio !== 'N/A' ? stockData.peRatio.toFixed(2) : 'N/A';
            
            const dividendValue = metricRows[1].querySelector('.metric-value');
            dividendValue.textContent = `${stockData.dividendYield.toFixed(2)}%`;
            dividendValue.className = 'metric-value ' + (stockData.dividendYield > 0 ? 'positive' : '');
            
            metricRows[4].querySelector('.metric-value').textContent = stockData.marketCap;
        }
        
        console.log(`✅ Updated card for ${stockData.symbol}`);
    }
}

function showStockLoadingState() {
    const stockCards = document.querySelectorAll('.badge-stock');
    stockCards.forEach(badge => {
        const card = badge.closest('.card');
        const chartPlaceholder = card?.querySelector('.chart-placeholder');
        if (chartPlaceholder) {
            chartPlaceholder.innerHTML = `
                <div style="text-align: center; color: var(--text-muted);">
                    <div style="font-size: 1.2rem;">Loading...</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">⏳</div>
                </div>
            `;
        }
    });
}

async function loadStockData() {
    console.log('🚀 Loading stock data...');
    showStockLoadingState();
    
    try {
        for (let i = 0; i < STOCKS_TO_TRACK.length; i++) {
            const symbol = STOCKS_TO_TRACK[i];
            
            try {
                const quote = await fetchFMPQuote(symbol);
                const profile = await fetchFMPProfile(symbol);
                const stockData = calculateStockMetrics(quote, profile);
                updateStockCard(stockData, i);
                
                if (i < STOCKS_TO_TRACK.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`Failed to load ${symbol}:`, error);
            }
        }
        
        console.log('✅ Stock data loaded successfully!');
    } catch (error) {
        console.error('Stock loading error:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStockData);
} else {
    loadStockData();
}

setInterval(loadStockData, 5 * 60 * 1000);

window.stockAPI = {
    refresh: loadStockData,
    clearCache: () => {
        STOCKS_TO_TRACK.forEach(symbol => {
            localStorage.removeItem(`fmp_quote_${symbol}`);
            localStorage.removeItem(`fmp_profile_${symbol}`);
        });
        console.log('🗑️ Cache cleared');
    }
};

console.log('📈 Stock API loaded!');
```

7. Scroll to bottom
8. Click **"Commit changes"**
9. Click **"Commit changes"** again in the popup

---

## ✅ **YOUR SITE IS NOW COMPLETE!**

After you commit:
1. Wait **1-2 minutes**
2. Go to **Actions** tab - wait for green checkmark ✅
3. Go to your live site
4. Press **Cmd+Shift+R** (hard refresh)
5. Open console (Cmd+Option+I)

**You should see:**
```
📈 Stock API loaded!
🚀 Loading stock data...
🔄 Fetching quote for AAPL...
✅ Updated card for AAPL
🔄 Fetching quote for MSFT...
✅ Updated card for MSFT
🔄 Fetching quote for O...
✅ Updated card for O
✅ Stock data loaded successfully!
🏈 Sports module loaded!
🏀 Loading sports data...
✅ Updated 4 news articles
✅ Sports data loaded!
