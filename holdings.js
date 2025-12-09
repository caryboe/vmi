// holdings.js
// - Adds per-row Add (+) and Delete (–)
// - Supports Clear All
// - Implements persistent save toggle (ON/OFF pill) using database calls
//   Stores only: account type, ticker, shares, price paid per share.

function formatCurrency(value) {
    if (isNaN(value)) return "—";
    return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#holdings-table tbody");
    const clearAllBtn = document.getElementById("clear-all");
    const storeToggleBtn = document.getElementById("store-toggle");

    if (!tableBody) return;

    // Keys are still used in localStorage to track the TOGGLE STATE, 
    // but not the actual ROWS data anymore.
    const STORAGE_ENABLED_KEY = "mm_store_local_enabled"; 
    const PRICE_API_URL = "/api/prices"; // This is the Node.js route

    let storeLocalEnabled = false;
    let latestPriceMap = {}; // { "SPMO": { price: 123.45, asOf: "2025-11-29" }, ... }


    // ---------- ACCOUNT TYPE HELPERS (NO CHANGE) ----------

    function normalizeAccountLabel(label) {
        if (!label) return "";
        return label.replace(/\s+/g, " ").trim();
    }

    function ensureCustomAccountOption(selectEl, label) {
        const normalized = normalizeAccountLabel(label);
        if (!normalized) return;

        const options = Array.from(selectEl.options);
        const exists = options.some((opt) => opt.value === normalized);
        if (exists) return;

        const newOpt = document.createElement("option");
        newOpt.value = normalized;
        newOpt.textContent = normalized;

        // Insert before the last option ("Other Account")
        const lastIndex = selectEl.options.length - 1;
        const lastOpt = selectEl.options[lastIndex];
        selectEl.insertBefore(newOpt, lastOpt);
    }

    function handleNewAccountType(selectEl) {
        const input = window.prompt(
            "Name this account (for example: 'Vacation Fund'):"
        );

        if (!input) {
            // user canceled or blank: reset to empty
            selectEl.value = "";
            return;
        }

        const label = normalizeAccountLabel(input);
        if (!label) {
            selectEl.value = "";
            return;
        }

        ensureCustomAccountOption(selectEl, label);
        // Select the new label as this row's account type
        selectEl.value = label;
    }


    // ---------- PRICE FETCHING (NO CHANGE) ----------

    function collectUniqueTickers() {
        const set = new Set();
        const rows = tableBody.querySelectorAll("tr");
        rows.forEach((tr) => {
            const input = tr.querySelector(".ticker-input");
            if (!input) return;
            const symbol = (input.value || "").trim().toUpperCase();
            if (symbol) set.add(symbol);
        });
        return Array.from(set);
    }

    async function refreshPrices() {
        const tickers = collectUniqueTickers();
        if (tickers.length === 0) {
            // No tickers → clear current prices and recompute rows
            const rows = tableBody.querySelectorAll("tr");
            rows.forEach((tr) => {
                const currentPriceCell = tr.querySelector(".current-price-cell");
                if (currentPriceCell) currentPriceCell.textContent = "—";
                updateRowCalculations(tr);
            });
            return;
        }

        // Uses the corrected PRICE_API_URL /api/prices
        const url = `${PRICE_API_URL}?mode=prices&tickers=${encodeURIComponent(
            tickers.join(",")
        )}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();

            if (!data || !data.prices) return;

            latestPriceMap = data.prices;

            const rows = tableBody.querySelectorAll("tr");
            rows.forEach((tr) => {
                const input = tr.querySelector(".ticker-input");
                const currentPriceCell = tr.querySelector(".current-price-cell");
                if (!input || !currentPriceCell) return;

                const symbol = (input.value || "").trim().toUpperCase();
                const info = latestPriceMap[symbol];

                if (info && typeof info.price === "number") {
                    currentPriceCell.textContent = formatCurrency(info.price);
                } else {
                    currentPriceCell.textContent = "—";
                }

                updateRowCalculations(tr);
            });
        } catch (err) {
            console.error("Error loading holdings prices:", err);
        }
    }


    // ---------- TOGGLE HELPERS (MINOR CHANGE: REMOVED STORAGE_ROWS_KEY handling) ----------

    function applyToggleVisualState() {
        if (!storeToggleBtn) return;

        if (storeLocalEnabled) {
            storeToggleBtn.textContent = "ON";
            storeToggleBtn.classList.remove("store-toggle-off");
            storeToggleBtn.classList.add("store-toggle-on");
        } else {
            storeToggleBtn.textContent = "OFF";
            storeToggleBtn.classList.remove("store-toggle-on");
            storeToggleBtn.classList.add("store-toggle-off");
        }
    }

    function setStoreLocalEnabled(enabled) {
        storeLocalEnabled = enabled;
        applyToggleVisualState();

        if (storeLocalEnabled) {
            // Remember that DB save is enabled
            try {
                window.localStorage.setItem(STORAGE_ENABLED_KEY, "true");
            } catch (e) {
                console.warn("Unable to access localStorage:", e);
            }
            // Save current rows immediately to DB
            saveAllRowsToStorage();
        } else {
            // Turned OFF: mark disabled, but DON'T clear DB data (we clear it only on 'Clear All')
            try {
                window.localStorage.setItem(STORAGE_ENABLED_KEY, "false");
                // window.localStorage.removeItem(STORAGE_ROWS_KEY); <-- REMOVED
            } catch (e) {
                console.warn("Unable to access localStorage:", e);
            }
            // Refresh: loads empty if DB is disabled
            loadRowsFromStorage();
        }
    }


    // ---------- CALCULATIONS PER ROW (NO CHANGE) ----------

    function updateRowCalculations(tr) {
        const sharesInput = tr.querySelector(".shares-input");
        const priceInput = tr.querySelector(".price-paid-input");
        const totalPaidCell = tr.querySelector(".total-paid-cell");
        const currentPriceCell = tr.querySelector(".current-price-cell");
        const currentTotalCell = tr.querySelector(".current-total-cell");
        const gainLossCell = tr.querySelector(".gain-loss-cell");

        if (!sharesInput || !priceInput || !totalPaidCell) return;

        const shares = parseFloat(sharesInput.value);
        const pricePaid = parseFloat(priceInput.value);

        // ----- Total Paid -----
        if (!isNaN(shares) && !isNaN(pricePaid)) {
            const totalPaid = shares * pricePaid;
            totalPaidCell.textContent = formatCurrency(totalPaid);
        } else {
            totalPaidCell.textContent = "—";
        }

        // ----- Current Price from cell text -----
        let currentPrice = NaN;
        if (currentPriceCell) {
            const raw = currentPriceCell.textContent.replace(/[^0-9.\-]/g, "");
            if (raw) currentPrice = parseFloat(raw);
        }

        // ----- Current Total + Gain/Loss -----
        if (
            !isNaN(shares) &&
            !isNaN(pricePaid) &&
            !isNaN(currentPrice) &&
            currentTotalCell &&
            gainLossCell
        ) {
            const totalPaid = shares * pricePaid;
            const currentTotal = shares * currentPrice;
            const gainLoss = currentTotal - totalPaid;

            currentTotalCell.textContent = formatCurrency(currentTotal);

            // Reset classes
            gainLossCell.classList.remove(
                "gain-positive",
                "gain-negative",
                "gain-neutral"
            );

            if (gainLoss > 0.005) {
                gainLossCell.textContent = formatCurrency(gainLoss); // shows +$1.23
                gainLossCell.classList.add("gain-positive");
            } else if (gainLoss < -0.005) {
                gainLossCell.textContent = formatCurrency(gainLoss); // shows -$1.23
                gainLossCell.classList.add("gain-negative");
            } else {
                gainLossCell.textContent = "$0.00";
                gainLossCell.classList.add("gain-neutral");
            }

        } else {
            if (currentTotalCell) currentTotalCell.textContent = "—";
            if (gainLossCell) {
                gainLossCell.textContent = "—";
                gainLossCell.classList.remove(
                    "gain-positive",
                    "gain-negative",
                    "gain-neutral"
                );
            }
        }
    }


    // ---------- ROW CREATION / HOOKUP (NO CHANGE) ----------

    function attachRowInputListeners(tr) {
        const accountSelect = tr.querySelector(".account-type-select");
        const tickerInput = tr.querySelector(".ticker-input");
        const sharesInput = tr.querySelector(".shares-input");
        const priceInput = tr.querySelector(".price-paid-input");

        const onChange = () => {
            updateRowCalculations(tr);
            saveAllRowsToStorage(); // Now calls the DB save function
        };

        if (accountSelect) {
            accountSelect.addEventListener("change", () => {
                if (accountSelect.value === "new-custom") {
                    handleNewAccountType(accountSelect);
                }
                onChange();
            });
        }

        if (tickerInput) {
            tickerInput.addEventListener("input", onChange);
            tickerInput.addEventListener("blur", () => {
                refreshPrices();
            });
        }

        if (sharesInput) {
            sharesInput.addEventListener("input", onChange);
        }
        if (priceInput) {
            priceInput.addEventListener("input", onChange);
            priceInput.addEventListener("blur", () => {
                const v = parseFloat(priceInput.value);
                if (!isNaN(v)) {
                    priceInput.value = v.toFixed(2);
                }
            });
        }
    }


    function createRow() {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <select class="account-type-select">
                    <option value="">Select...</option>
                    <option value="401k">401k/403b</option>
                    <option value="roth">Roth IRA</option>
                    <option value="traditional">Traditional IRA</option>
                    <option value="taxable">Taxable Brokerage</option>
                    <option value="new-custom">Other Account</option>
                </select>
            </td>

            <td>
                <input type="text" class="ticker-input" placeholder="e.g. VTI" />
            </td>
            <td class="numeric">
                <input
                    type="number"
                    class="shares-input"
                    min="0"
                    max="99999.999"
                    step="0.001"
                    placeholder="0.000"
                />
            </td>
            <td class="numeric">
                <input
                    type="number"
                    class="price-paid-input"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                />
            </td>
            <td class="numeric total-paid-cell">—</td>
            <td class="numeric current-price-cell">—</td>
            <td class="numeric current-total-cell">—</td>
            <td class="numeric gain-loss-cell">—</td>
            <td class="holdings-actions-cell">
                <button type="button" class="row-btn row-btn-add">+</button>
                <button type="button" class="row-btn row-btn-delete">&minus;</button>
            </td>
        `;

        const addBtn = tr.querySelector(".row-btn-add");
        const deleteBtn = tr.querySelector(".row-btn-delete");

        if (addBtn) {
            addBtn.addEventListener("click", () => {
                const newRow = createRow();
                tr.parentNode.insertBefore(newRow, tr.nextSibling);
                saveAllRowsToStorage();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
                const confirmDelete = window.confirm(
                    "Are you sure you want to delete this row?"
                );
                if (confirmDelete) {
                    tr.remove();
                    saveAllRowsToStorage();
                    // If all rows deleted, optionally add a blank one
                    if (!tableBody.querySelector("tr")) {
                        const blank = createRow();
                        tableBody.appendChild(blank);
                        saveAllRowsToStorage();
                    }
                }
            });
        }

        attachRowInputListeners(tr);
        updateRowCalculations(tr);
        return tr;

    }

    function addRowToEnd(data) {
        const newRow = createRow();
        tableBody.appendChild(newRow);

        // If we were passed data (from DB), populate it.
        if (data) {
            const accountSelect = newRow.querySelector(".account-type-select");
            const tickerInput = newRow.querySelector(".ticker-input");
            const sharesInput = newRow.querySelector(".shares-input");
            const priceInput = newRow.querySelector(".price-paid-input");

            if (accountSelect && data.accountType !== undefined) {
                if (data.accountType) {
                    // Make sure this account type exists in the dropdown
                    ensureCustomAccountOption(accountSelect, data.accountType);
                }
                accountSelect.value = data.accountType;
            }

            if (tickerInput && data.ticker !== undefined) {
                tickerInput.value = data.ticker;
            }
            if (sharesInput && data.shares !== undefined) {
                sharesInput.value = data.shares;
            }
            if (priceInput && data.pricePaid !== undefined) {
                priceInput.value = data.pricePaid;
            }
        }

        updateRowCalculations(newRow);
        return newRow;

    }

    // ---------- SAVE / LOAD FROM DATABASE (replacing LocalStorage) ----------
    
    // Function to collect data from the UI (NO CHANGE)
    function collectRowsData() {
        const rows = Array.from(tableBody.querySelectorAll("tr"));
        const data = [];

        rows.forEach((tr) => {
            const accountSelect = tr.querySelector(".account-type-select");
            const tickerInput = tr.querySelector(".ticker-input");
            const sharesInput = tr.querySelector(".shares-input");
            const priceInput = tr.querySelector(".price-paid-input");

            if (!accountSelect || !tickerInput || !sharesInput || !priceInput) {
                return;
            }

            const accountType = (accountSelect.value || "").trim();
            const ticker = (tickerInput.value || "").trim().toUpperCase();
            const shares = (sharesInput.value || "").trim();
            const pricePaid = (priceInput.value || "").trim();

            // Skip completely empty rows
            if (!accountType && !ticker && !shares && !pricePaid) {
                return;
            }

            data.push({
                accountType,
                ticker,
                shares,
                pricePaid,
            });
        });

        return data;
    }

    // NEW FUNCTION: Sends holding data to the Express POST /api/holdings endpoint
    async function saveAllRowsToStorage() {
        // Only save if the toggle is ON
        if (!storeLocalEnabled) {
            return;
        }
        try {
            const rowsData = collectRowsData();

            const res = await fetch('/api/holdings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ holdings: rowsData }),
            });

            const data = await res.json();

            if (data.success) {
                console.log(`Successfully saved ${data.count} holdings to the database.`);
            } else {
                console.error('Failed to save holdings to the database:', data.message);
            }

        } catch (e) {
            console.error("Error saving holdings to database:", e);
        }
    }

    // NEW FUNCTION: Fetches holding data from the Express GET /api/holdings endpoint
    async function loadRowsFromStorage() {
        let loadedAny = false;

        // Only load from DB if the toggle is ON
        if (!storeLocalEnabled) {
            // If not enabled, we fallback to just adding one blank row
            addRowToEnd();
            return;
        }
        
        // Clear all existing table rows before loading new ones
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }

        try {
            const res = await fetch('/api/holdings');
            const data = await res.json();

            if (data.success && Array.isArray(data.holdings) && data.holdings.length > 0) {
                // Load data from the database response
                data.holdings.forEach((row) => addRowToEnd(row));
                loadedAny = true;

            } else {
                console.warn("No holdings loaded from database or failed to fetch.");
            }
        } catch (e) {
            console.error("Error loading holdings from database:", e);
        }

        if (!loadedAny) {
            // Ensure at least one blank row is present if loading fails or returns nothing
            addRowToEnd();
        }
    }


    // ---------- INITIALIZE TOGGLE FROM STORAGE (NO CHANGE) ----------

    (function initToggleFromStorage() {
        let initialEnabled = false;

        try {
            const stored = window.localStorage.getItem(STORAGE_ENABLED_KEY);
            if (stored === "true") {
                initialEnabled = true;
            }
        } catch (e) {
            console.warn("Unable to read localStorage:", e);
        }

        // Just set state + visuals on load; DON'T save yet
        storeLocalEnabled = initialEnabled;
        applyToggleVisualState();

        if (storeToggleBtn) {
            storeToggleBtn.addEventListener("click", () => {
                setStoreLocalEnabled(!storeLocalEnabled);
            });
        }
    })();


    // ---------- CLEAR ALL BUTTON (MINOR CHANGE: Added DB Clear Logic) ----------

    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", async () => {
            const confirmClear = window.confirm(
                "Are you sure you want to delete ALL rows?\nThis will remove all holdings.\n(You may delete individual rows instead.)\nThis action cannot be undone."
            );
            if (!confirmClear) return;

            while (tableBody.firstChild) {
                tableBody.removeChild(tableBody.firstChild);
            }

            // Optionally add a blank row back
            addRowToEnd();

            // If DB save is enabled, explicitly save an empty set to clear the database
            if (storeLocalEnabled) {
                // Calling saveAllRowsToStorage with zero rows will trigger the 
                // DELETE FROM holdings statement on the server side.
                await saveAllRowsToStorage(); 
            }
        });
    }

    // ---------- INITIAL ROWS (NO CHANGE in logic) ----------
    
    // loadRowsFromStorage now handles DB loading or fallback to blank row
    loadRowsFromStorage();

    // Try to load prices for any existing tickers
    refreshPrices();


});
