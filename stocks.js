// stocks.js - Working Version
const FMP_API_KEY = 'cLdDw6rfrPX44T7A1HFNMxah2Ckb3Dk9';
const STOCK_CACHE_DURATION = 300000;
const STOCKS_TO_TRACK = ['AAPL', 'MSFT', 'O'];

function isStockCacheValid(t) {
    return t && (Date.now() - t) < STOCK_CACHE_DURATION;
}

function getStockFromCache(k) {
    try {
        const c = localStorage.getItem(k);
        if (!c) return null;
        const d = JSON.parse(c);
        if (isStockCacheValid(d.timestamp)) {
            console.log('✅ Using cached data for ' + k);
            return d.value;
        }
        return null;
    } catch (e) {
        return null;
    }
}

function saveStockToCache(k, v) {
    try {
        localStorage.setItem(k, JSON.stringify({timestamp: Date.now(), value: v}));
    } catch (e) {
        console.error('Cache error:', e);
    }
}

async function fetchFMPQuote(s) {
    const k = 'fmp_quote_' + s;
    const c = getStockFromCache(k);
    if (c) return c;
    
    const url = 'https://financialmodelingprep.com/api/v3/quote/' + s + '?apikey=' + FMP_API_KEY;
    
    try {
        console.log('🔄 Fetching quote for ' + s);
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!d || d.length === 0) throw new Error('No data for ' + s);
        const q = d[0];
        saveStockToCache(k, q);
        return q;
    } catch (e) {
        console.error('Error fetching ' + s + ':', e);
        throw e;
    }
}

async function fetchFMPProfile(s) {
    const k = 'fmp_profile_' + s;
    const c = getStockFromCache(k);
    if (c) return c;
    
    const url = 'https://financialmodelingprep.com/api/v3/profile/' + s + '?apikey=' + FMP_API_KEY;
    
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!d || d.length === 0) return null;
        const p = d[0];
        saveStockToCache(k, p);
        return p;
    } catch (e) {
        console.error('Error fetching profile:', e);
        return null;
    }
}

function calculateStockMetrics(q, p) {
    return {
        symbol: q.symbol,
        name: q.name || (p && p.companyName) || q.symbol,
        price: q.price || 0,
        change: q.change || 0,
        changePercent: q.changesPercentage || 0,
        peRatio: q.pe || (p && p.pe) || 'N/A',
        dividendYield: ((p && p.lastDiv) || 0) / (q.price || 1) * 100,
        marketCap: formatMarketCap(q.marketCap || (p && p.mktCap) || 0),
        volume: q.volume || 0
    };
}

function formatMarketCap(v) {
    const n = parseFloat(v);
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    return '$' + n.toFixed(2);
}

function formatVolume(v) {
    const n = parseFloat(v);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toString();
}

function updateStockCard(data, idx) {
    const cards = document.querySelectorAll('.card');
    const stockCards = Array.from(cards).filter(c => c.querySelector('.badge-stock'));
    
    if (stockCards[idx]) {
        const card = stockCards[idx];
        const title = card.querySelector('.card-title');
        if (title) {
            title.textContent = data.name + ' (' + data.symbol + ')';
        }
        
        const chart = card.querySelector('.chart-placeholder');
        if (chart) {
            const isPos = data.change >= 0;
            const color = isPos ? 'var(--green)' : 'var(--red)';
            const sign = isPos ? '+' : '';
            chart.innerHTML = '<div style="text-align: center;"><div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">$' + data.price.toFixed(2) + '</div><div style="font-size: 1.1rem; color: ' + color + '; margin-top: 0.5rem;">' + sign + data.change.toFixed(2) + ' (' + sign + data.changePercent.toFixed(2) + '%)</div><div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Volume: ' + formatVolume(data.volume) + '</div></div>';
        }
        
        const rows = card.querySelectorAll('.metric-row');
        if (rows.length >= 5) {
            rows[0].querySelector('.metric-value').textContent = data.peRatio !== 'N/A' ? data.peRatio.toFixed(2) : 'N/A';
            const divVal = rows[1].querySelector('.metric-value');
            divVal.textContent = data.dividendYield.toFixed(2) + '%';
            divVal.className = 'metric-value ' + (data.dividendYield > 0 ? 'positive' : '');
            rows[4].querySelector('.metric-value').textContent = data.marketCap;
        }
        
        console.log('✅ Updated card for ' + data.symbol);
    }
}

function showStockLoadingState() {
    const badges = document.querySelectorAll('.badge-stock');
    badges.forEach(b => {
        const card = b.closest('.card');
        const chart = card && card.querySelector('.chart-placeholder');
        if (chart) {
            chart.innerHTML = '<div style="text-align: center; color: var(--text-muted);"><div style="font-size: 1.2rem;">Loading...</div><div style="font-size: 0.9rem; margin-top: 0.5rem;">⏳</div></div>';
        }
    });
}

async function loadStockData() {
    console.log('🚀 Loading stock data...');
    showStockLoadingState();
    
    try {
        for (let i = 0; i < STOCKS_TO_TRACK.length; i++) {
            const sym = STOCKS_TO_TRACK[i];
            try {
                const quote = await fetchFMPQuote(sym);
                const profile = await fetchFMPProfile(sym);
                const data = calculateStockMetrics(quote, profile);
                updateStockCard(data, i);
                if (i < STOCKS_TO_TRACK.length - 1) {
                    await new Promise(r => setTimeout(r, 500));
                }
            } catch (e) {
                console.error('Failed to load ' + sym + ':', e);
            }
        }
        console.log('✅ Stock data loaded successfully!');
    } catch (e) {
        console.error('Stock loading error:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStockData);
} else {
    loadStockData();
}

setInterval(loadStockData, 300000);

window.stockAPI = {
    refresh: loadStockData,
    clearCache: function() {
        STOCKS_TO_TRACK.forEach(function(s) {
            localStorage.removeItem('fmp_quote_' + s);
            localStorage.removeItem('fmp_profile_' + s);
        });
        console.log('🗑️ Cache cleared');
    }
};

console.log('📈 Stock API loaded!');
```

### **Step 3: Save It**

1. Scroll to bottom
2. Click **"Commit changes"**
3. Click **"Commit changes"** again

### **Step 4: Test**

1. Wait **2 minutes**
2. Go to **Actions** tab - wait for green checkmark ✅
3. Go to your live site
4. Press **Cmd+Shift+R** (hard refresh)
5. Open console

---

## ✅ **WHAT YOU SHOULD SEE:**
```
📈 Stock API loaded!
🚀 Loading stock data...
🔄 Fetching quote for AAPL
✅ Updated card for AAPL
🔄 Fetching quote for MSFT
✅ Updated card for MSFT
🔄 Fetching quote for O
✅ Updated card for O
✅ Stock data loaded successfully!
🏈 Sports module loaded!
✅ Updated 6 news articles
✅ Sports data loaded!
