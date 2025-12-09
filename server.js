//server.js
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

// --- EODHD config for /api/prices ---
const EODHD_API_TOKEN = '*************************';
const EODHD_BASE_URL = 'https://eodhd.com/api/real-time';

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONFIGURATION ---
const dbConfig = {
    user: '*************************',
    password: '*************************', 
    socketPath: '/var/run/mysqld/mysqld.sock',
    database: 'vmi_primary'
};

let dbConnection;

async function connectToDatabase() {
    try {
        dbConnection = await mysql.createConnection(dbConfig);
        console.log('Successfully connected to the MySQL/MariaDB database.');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
}

connectToDatabase();

// --- MIDDLEWARE ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- UTILITY FUNCTION: Fetch quote from EODHD ---
async function fetchQuoteFromEod(symbol) {
    const normalizedSymbol = symbol.trim().toUpperCase();
    let eodSymbol;

    if (normalizedSymbol.includes('.')) {
        eodSymbol = normalizedSymbol;
    } else {
        eodSymbol = `${normalizedSymbol}.US`;
    }

    const url = `${EODHD_BASE_URL}/${encodeURIComponent(eodSymbol)}?api_token=${encodeURIComponent(
        EODHD_API_TOKEN
    )}&fmt=json`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${symbol}`);
        }

        const data = await response.json();

        if (!data || (typeof data.close === 'undefined' && typeof data.last_trade_price === 'undefined')) {
            throw new Error(`No price in response for ${symbol}`);
        }

        const price = typeof data.close !== 'undefined'
            ? data.close
            : data.last_trade_price;

        const asOf = data.timestamp
            ? new Date(data.timestamp * 1000).toISOString().slice(0, 10)
            : null;

        return {
            ok: true,
            symbol,
            price,
            asOf,
            raw: data,
        };
    } catch (err) {
        return {
            ok: false,
            symbol,
            error: err.message || 'Unknown error',
        };
    }
}

// --- ROUTES ---

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Transactions page
app.get("/app/transactions", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "ledger.html"));
});

// --- API ROUTES ---

// 1. /api/prices
app.get('/api/prices', async (req, res) => {
    const tickersParam = (req.query.tickers || '').trim();

    if (!tickersParam) {
        return res.status(400).json({
            success: false,
            prices: {},
            errors: { _global: 'No tickers parameter provided.' },
        });
    }

    const symbols = tickersParam
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

    if (symbols.length === 0) {
        return res.status(400).json({
            success: false,
            prices: {},
            errors: { _global: 'No valid tickers found.' },
        });
    }

    const prices = {};
    const errors = {};

    const results = await Promise.all(symbols.map((sym) => fetchQuoteFromEod(sym)));

    for (const r of results) {
        if (r.ok) {
            prices[r.symbol] = {
                price: r.price,
                asOf: r.asOf,
                raw: r.raw,
            };
        } else {
            errors[r.symbol] = r.error || 'Unknown error';
        }
    }

    res.json({
        success: Object.keys(prices).length > 0,
        prices,
        errors,
    });
});

// 2. /api/holdings (FIXED)
app.get('/api/holdings', async (req, res) => {
    try {
        if (!dbConnection) {
            throw new Error('Database not connected');
        }

        const userId = 1;

        const [rows] = await dbConnection.execute(
            `
            SELECT
                h.id,
                h.user_id,
                h.account_id,
                h.symbol,
                h.total_shares,
                h.total_cost_basis,
                h.price_paid,
                h.avg_cost_per_share,
                h.notes,
                a.account_type,
                a.nickname
            FROM holdings h
            LEFT JOIN accounts a ON h.account_id = a.id
            WHERE h.user_id = ?
            ORDER BY h.symbol
            `,
            [userId]
        );

        res.json({
            success: true,
            holdings: rows || []
        });
    } catch (error) {
        console.error('Database load failed in /api/holdings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load holdings from database.',
            error: error.message,
            code: error.code || 'UNKNOWN'
        });
    }
});

// 2a. /api/holdings/:ticker - Get single holding by ticker
app.get('/api/holdings/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const userId = 1;

        const [rows] = await dbConnection.execute(
            `
            SELECT
                h.id,
                h.user_id,
                h.account_id,
                h.symbol,
                h.total_shares,
                h.total_cost_basis,
                h.price_paid,
                h.avg_cost_per_share,
                h.notes,
                a.account_type,
                a.nickname
            FROM holdings h
            LEFT JOIN accounts a ON h.account_id = a.id
            WHERE h.user_id = ? AND h.symbol = ?
            `,
            [userId, ticker.toUpperCase()]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Holding with ticker ${ticker} not found.`
            });
        }

        res.json({
            success: true,
            holding: rows[0]
        });
    } catch (error) {
        console.error('Error fetching holding by ticker:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch holding details.',
            error: error.message
        });
    }
});

// 3. /api/transactions (CREATE)
app.post('/api/transactions', async (req, res) => {
    try {
        const userId = 1;
        const {
            accountId,
            symbol,
            transactionType,
            transactionDate,
            shares,
            price,
            notes
        } = req.body;

        // Basic validation for non-baseline transactions
        if (!accountId || !transactionType || !transactionDate) {
            return res.status(400).json({
                success: false,
                message: 'accountId, transactionType, and transactionDate are required.'
            });
        }

        const normalizedType = transactionType.trim().toUpperCase();
        const isBaseline = normalizedType === 'BASELINE';

        if (!isBaseline) {
            if (!symbol || shares == null || price == null) {
                return res.status(400).json({
                    success: false,
                    message: 'symbol, shares, and price are required for non-baseline transactions.'
                });
            }

            const numericShares = Number(shares);
            const numericPrice = Number(price);

            if (numericShares <= 0 || Number.isNaN(numericShares)) {
                return res.status(400).json({
                    success: false,
                    message: 'shares must be a positive number.'
                });
            }
            if (numericPrice <= 0 || Number.isNaN(numericPrice)) {
                return res.status(400).json({
                    success: false,
                    message: 'price must be a positive number.'
                });
            }
        }

        const sql = `
            INSERT INTO transactions (
                user_id,
                account_id,
                symbol,
                transaction_type,
                transaction_date,
                shares,
                price,
                notes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        const [result] = await dbConnection.execute(sql, [
            userId,
            parseInt(accountId, 10),
            symbol ? symbol.trim().toUpperCase() : null,
            normalizedType,
            transactionDate,
            shares != null ? parseFloat(shares) : null,
            price != null ? parseFloat(price) : null,
            notes || null
        ]);

        res.json({
            success: true,
            transactionId: result.insertId
        });
    } catch (error) {
        console.error('Error in /api/transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save transaction.'
        });
    }
});

// 4. /api/metrics (MACRO DATA)
app.get('/api/metrics', async (req, res) => {
    const metricSymbols = {
        breadth: { symbol: 'RSP', divisor: 'SPY' },
        spreads: { symbol: 'HYG', divisor: 'IEF' },
        yield: { symbol: 'TLT', divisor: 'SGOV' },
        vix: { symbol: 'VIX.INDX', divisor: null },
    };

    const symbolsToFetch = new Set();
    Object.values(metricSymbols).forEach(m => {
        symbolsToFetch.add(m.symbol);
        if (m.divisor) symbolsToFetch.add(m.divisor);
    });

    const symbolArray = Array.from(symbolsToFetch);
    const results = await Promise.all(symbolArray.map(sym => fetchQuoteFromEod(sym)));

    const priceMap = results.reduce((acc, r) => {
        if (r.ok) {
            acc[r.symbol] = { price: r.price, asOf: r.asOf };
        }
        return acc;
    }, {});

    const metricsData = {};
    let success = true;

    for (const [key, config] of Object.entries(metricSymbols)) {
        const symbolData = priceMap[config.symbol];
        const divisorData = config.divisor ? priceMap[config.divisor] : null;

        if (key === 'vix') {
            if (symbolData) {
                metricsData[key] = { value: symbolData.price, asOf: symbolData.asOf };
            } else {
                success = false;
            }
        } else if (symbolData && divisorData) {
            const value = symbolData.price / divisorData.price;
            metricsData[key] = { value: value, asOf: symbolData.asOf };
        } else {
            success = false;
        }
    }

    res.json({
        success: success,
        metrics: metricsData,
    });
});

// 5. /api/baseline (onboarding)
app.post('/api/baseline', async (req, res) => {
    const userId = 1;
    const {
        accountType,
        accountLabel,
        ticker,
        accountValue,
        shares,
        hasContrib,
        contribAmount,
        contribFrequency,
        notes
    } = req.body || {};

    if (!accountType || accountValue == null) {
        return res.status(400).json({
            success: false,
            message: 'accountType and accountValue are required.'
        });
    }

    let totalCostBasis = Number(accountValue);
    if (Number.isNaN(totalCostBasis) || totalCostBasis < 0) {
        return res.status(400).json({
            success: false,
            message: 'accountValue must be a positive number.'
        });
    }

    let totalShares = null;
    let avgCostPerShare = null;
    let pricePaid = null;
    const normalizedTicker = ticker ? ticker.trim().toUpperCase() : null;

    if (shares !== null && shares !== undefined && `${shares}`.trim() !== '') {
        totalShares = Number(shares);
        if (Number.isNaN(totalShares) || totalShares <= 0) {
            return res.status(400).json({
                success: false,
                message: 'shares must be a positive number when provided.'
            });
        }
        avgCostPerShare = totalCostBasis / totalShares;
        pricePaid = avgCostPerShare;
    } else if (normalizedTicker) {
        try {
            const quote = await fetchQuoteFromEod(normalizedTicker);
            if (quote.ok && typeof quote.price === 'number' && quote.price > 0) {
                pricePaid = quote.price;
                totalShares = totalCostBasis / pricePaid;
                avgCostPerShare = pricePaid;
                totalShares = Number(totalShares.toFixed(6));
            }
        } catch (e) {
            console.error('[baseline] Error calling fetchQuoteFromEod:', e);
        }
    }

    try {
        await dbConnection.beginTransaction();

        const [accountResult] = await dbConnection.execute(
            `
            INSERT INTO accounts (user_id, account_type, nickname, currency)
            VALUES (?, ?, ?, ?)
            `,
            [userId, accountType, accountLabel || null, 'USD']
        );
        const accountId = accountResult.insertId;

        const [holdingResult] = await dbConnection.execute(
            `
            INSERT INTO holdings (
                user_id,
                account_id,
                symbol,
                price_paid,
                total_cost_basis,
                total_shares,
                avg_cost_per_share,
                is_baseline,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                accountId,
                normalizedTicker || null,
                pricePaid,
                totalCostBasis,
                totalShares,
                avgCostPerShare,
                1,
                notes || null
            ]
        );

        const [txResult] = await dbConnection.execute(
            `
            INSERT INTO transactions (
                user_id,
                account_id,
                symbol,
                shares,
                price,
                fees,
                notes,
                transaction_date,
                transaction_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
            `,
            [
                userId,
                accountId,
                normalizedTicker || null,
                totalShares,
                pricePaid,
                0,
                notes || 'Baseline imported balance',
                'BASELINE'
            ]
        );

        if (hasContrib && contribAmount && contribFrequency) {
            try {
                await dbConnection.execute(
                    `
                    INSERT INTO contribution_schedules (
                        user_id,
                        account_id,
                        amount,
                        frequency,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, NOW())
                    `,
                    [
                        userId,
                        accountId,
                        parseFloat(contribAmount),
                        contribFrequency,
                    ]
                );
            } catch (scheduleErr) {
                console.error('⚠️ Could not save contribution schedule:', scheduleErr.message);
            }
        }

        await dbConnection.commit();

        return res.json({
            success: true,
            accountId,
            holdingId: holdingResult.insertId,
            transactionId: txResult.insertId
        });

    } catch (err) {
        console.error('Error in /api/baseline:', err);

        try {
            await dbConnection.rollback();
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
        }

        return res.status(500).json({
            success: false,
            message: err.message || 'Unknown error in /api/baseline',
            code: err.code || null
        });
    }
});

// 6. /api/contribution-schedules
app.get('/api/contribution-schedules', async (req, res) => {
    try {
        const userId = 1;

        const [rows] = await dbConnection.execute(
            `
            SELECT 
                cs.schedule_id,
                cs.account_id,
                cs.amount,
                cs.frequency,
                cs.created_at,
                a.account_type,
                a.nickname
            FROM contribution_schedules cs
            LEFT JOIN accounts a ON cs.account_id = a.id
            WHERE cs.user_id = ?
            ORDER BY cs.created_at DESC
            `,
            [userId]
        );

        res.json({
            success: true,
            schedules: rows || []
        });
    } catch (error) {
        console.error('Error in /api/contribution-schedules:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load contribution schedules.'
        });
    }
});

// --- ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
