// config.js - Centralized API Configuration
// ⚠️ IMPORTANT: Never commit this file to GitHub with real API keys!

// ==============================================
// API KEYS
// ==============================================

const API_CONFIG = {
    // STOCK MARKET DATA
    // Get free key: https://www.alphavantage.co/support/#api-key
    // Free tier: 25 calls/day, 5 calls/minute
    alphaVantage: {
        apiKey: 'YOUR_ALPHA_VANTAGE_KEY_HERE',
        baseUrl: 'https://www.alphavantage.co/query',
        rateLimit: {
            callsPerDay: 25,
            callsPerMinute: 5
        }
    },

    // Alternative: Financial Modeling Prep
    // Get free key: https://financialmodelingprep.com
    // Free tier: 250 calls/day
    financialModelingPrep: {
        apiKey: 'YOUR_FMP_KEY_HERE',
        baseUrl: 'https://financialmodelingprep.com/api/v3',
        rateLimit: {
            callsPerDay: 250
        }
    },

    // SPORTS & BETTING DATA
    // Get free key: https://the-odds-api.com
    // Free tier: 500 calls/month
    oddsApi: {
        apiKey: 'YOUR_ODDS_API_KEY_HERE',
        baseUrl: 'https://api.the-odds-api.com/v4',
        rateLimit: {
            callsPerMonth: 500
        }
    },

    // ESPN (No key needed - unofficial API)
    espn: {
        baseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
        // No authentication required
    },

    // REAL ESTATE DATA
    // Option 1: RapidAPI Real Estate APIs
    // Get key: https://rapidapi.com
    rapidApi: {
        apiKey: 'YOUR_RAPIDAPI_KEY_HERE',
        // Subscribe to specific real estate APIs on RapidAPI
    },

    // Option 2: Attom Data (Professional)
    // https://www.attomdata.com
    attomData: {
        apiKey: 'YOUR_ATTOM_KEY_HERE',
        baseUrl: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0'
    }
};

// ==============================================
// FEATURE FLAGS
// ==============================================

const FEATURES = {
    // Enable/disable data sources
    useStockData: true,
    useSportsData: true,
    useRealEstateData: false, // Set to true when you have API access
    
    // Auto-refresh settings
    autoRefresh: true,
    stockRefreshInterval: 5 * 60 * 1000,  // 5 minutes
    sportsRefreshInterval: 2 * 60 * 1000, // 2 minutes
    
    // Caching
    enableCache: true,
    cacheExpiration: 5 * 60 * 1000, // 5 minutes
    
    // Debug mode
    debugMode: true, // Set to false in production
};

// ==============================================
// SYMBOLS & MARKETS TO TRACK
// ==============================================

const TRACKED_ASSETS = {
    // Stocks to display
    stocks: [
        'AAPL',  // Apple
        'MSFT',  // Microsoft
        'GOOGL', // Google
        'AMZN',  // Amazon
        'TSLA',  // Tesla
    ],
    
    // REITs to display
    reits: [
        'O',     // Realty Income
        'VNQ',   // Vanguard Real Estate ETF
        'PLD',   // Prologis
        'AMT',   // American Tower
    ],
    
    // Sports to track
    sports: [
        'basketball_nba',
        'baseball_mlb',
        'americanfootball_nfl',
        'icehockey_nhl',
        'soccer_epl'
    ],
    
    // Real estate markets (for when you have API access)
    realEstateMarkets: [
        'Phoenix, AZ',
        'Dallas, TX',
        'Atlanta, GA',
        'Nashville, TN',
        'Austin, TX'
    ]
};

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Check if an API key is configured
 */
function isApiKeyConfigured(service) {
    const keys = {
        stocks: API_CONFIG.alphaVantage.apiKey,
        sports: API_CONFIG.oddsApi.apiKey,
        realEstate: API_CONFIG.rapidApi.apiKey || API_CONFIG.attomData.apiKey
    };
    
    return keys[service] && !keys[service].includes('YOUR_') && !keys[service].includes('_HERE');
}

/**
 * Get API configuration for a service
 */
function getApiConfig(service) {
    const configs = {
        alphaVantage: API_CONFIG.alphaVantage,
        fmp: API_CONFIG.financialModelingPrep,
        odds: API_CONFIG.oddsApi,
        espn: API_CONFIG.espn,
        rapidApi: API_CONFIG.rapidApi,
        attom: API_CONFIG.attomData
    };
    
    return configs[service] || null;
}

/**
 * Log debug information
 */
function debugLog(message, data) {
    if (FEATURES.debugMode) {
        console.log(`🔧 [DEBUG] ${message}`, data || '');
    }
}

/**
 * Check API rate limits
 */
function checkRateLimit(service, callsMade) {
    const config = getApiConfig(service);
    if (!config || !config.rateLimit) return true;
    
    // Simple check - you can enhance this with actual tracking
    debugLog(`Rate limit check for ${service}:`, callsMade);
    return true;
}

// ==============================================
// VALIDATION
// ==============================================

/**
 * Validate configuration on load
 */
function validateConfig() {
    console.log('🔍 Validating API Configuration...');
    
    const warnings = [];
    const errors = [];
    
    // Check stock API
    if (FEATURES.useStockData) {
        if (!isApiKeyConfigured('stocks')) {
            warnings.push('Stock API key not configured. Stock data will not load.');
        } else {
            console.log('✅ Stock API configured');
        }
    }
    
    // Check sports API
    if (FEATURES.useSportsData) {
        if (!isApiKeyConfigured('sports')) {
            warnings.push('Sports API key not configured. Betting odds will not load.');
        } else {
            console.log('✅ Sports API configured');
        }
    }
    
    // Check real estate API
    if (FEATURES.useRealEstateData) {
        if (!isApiKeyConfigured('realEstate')) {
            warnings.push('Real Estate API key not configured. Property data will not load.');
        } else {
            console.log('✅ Real Estate API configured');
        }
    }
    
    // Display warnings
    if (warnings.length > 0) {
        console.warn('⚠️ Configuration Warnings:');
        warnings.forEach(w => console.warn(`   - ${w}`));
    }
    
    // Display errors (if any)
    if (errors.length > 0) {
        console.error('❌ Configuration Errors:');
        errors.forEach(e => console.error(`   - ${e}`));
    }
    
    if (warnings.length === 0 && errors.length === 0) {
        console.log('✅ Configuration validated successfully!');
    }
}

// Run validation on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', validateConfig);
} else {
    validateConfig();
}

// ==============================================
// EXPORTS
// ==============================================

// Make config available globally
window.NovaWealthConfig = {
    api: API_CONFIG,
    features: FEATURES,
    assets: TRACKED_ASSETS,
    isConfigured: isApiKeyConfigured,
    getConfig: getApiConfig,
    debug: debugLog
};

console.log('⚙️ NovaWealth Configuration loaded!');
console.log('💡 Access config via: window.NovaWealthConfig');
