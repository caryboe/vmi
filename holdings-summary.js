// holdings-summary.js
// - Loads real holdings from /api/holdings
// - Optionally pulls live prices from /api/prices
// - Renders one card per holding into #holdings-summary-grid
// - Shows "Needs Details" badge for unknown / baseline-style holdings

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('holdings-summary-grid');
  if (!grid) {
    console.warn('No #holdings-summary-grid element found on this page.');
    return;
  }

  loadHoldingsIntoGrid();
});

// BEGIN Holdings Summary - Total Account Balance

function calculateAndDisplayTotals(holdings, pricesMap) {
  const grid = document.getElementById('holdings-summary-grid');
  if (!grid) return;
  
  // Create or find total card container
  let totalContainer = document.getElementById('holdings-total-container');
  
  if (!totalContainer) {
    totalContainer = document.createElement('div');
    totalContainer.id = 'holdings-total-container';
    totalContainer.className = 'holdings-total-container';
    grid.parentNode.insertBefore(totalContainer, grid);
  }
  
  let totalValue = 0;
  let totalCostBasis = 0;
  let holdingsCount = 0;
  
  // Calculate totals
  holdings.forEach(h => {
    const symbol = (h.symbol || '').trim();
    const priceInfo = symbol ? pricesMap[symbol] : null;
    const currentPrice = priceInfo?.price;
    
    // Get values
    const shares = Number(h.total_shares) || 0;
    const costBasis = Number(h.total_cost_basis) || 0;
    
    // Calculate current value
    let currentValue = 0;
    if (currentPrice && shares > 0) {
      currentValue = currentPrice * shares;
    } else if (costBasis > 0) {
      // For baseline holdings without price info
      currentValue = costBasis;
    }
    
    // Only add to totals if we have some value
    if (currentValue > 0 || costBasis > 0) {
      totalValue += currentValue;
      totalCostBasis += costBasis;
      holdingsCount++;
    }
  });
  
  // Calculate gain/loss
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? 
    (totalGainLoss / totalCostBasis * 100) : 0;
  
  // Format numbers
  const formatMoney = (v) => v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Determine color class
  let gainClass = 'gain-neutral';
  if (totalGainLoss > 0.01) gainClass = 'gain-positive';
  else if (totalGainLoss < -0.01) gainClass = 'gain-negative';
  
  // Build HTML
  totalContainer.innerHTML = `
    <div class="holdings-total-card">
      <h2 class="holdings-total-title">Total Balance Across All Accounts</h2>
      <div class="holdings-total-main ${gainClass}">
        ${formatMoney(totalValue)}
      </div>
      ${totalGainLoss !== 0 ? `
        <div class="holdings-total-sub ${gainClass}">
          ${totalGainLoss > 0 ? '+' : ''}${formatMoney(totalGainLoss)} 
          (${totalGainLossPercent > 0 ? '+' : ''}${totalGainLossPercent.toFixed(2)}%)
        </div>
      ` : ''}
      <div class="holdings-total-meta">
        ${holdingsCount} holding${holdingsCount !== 1 ? 's' : ''}
        • Total Cost Basis: ${formatMoney(totalCostBasis)}
      </div>
    </div>
  `;
}

// END Holdings Summary - Total Account Balance

// Add this helper function at the top of the file:
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Simple helper to show a reusable bottom-sheet style helper popup
 * for "Needs Details" on both desktop and mobile.
 */
function showHoldingHelpPopover(message) {
  let pop = document.getElementById('holding-help-popover');

  // Create once and reuse
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'holding-help-popover';
    pop.className = 'holding-help-popover';
    pop.innerHTML = `
      <div class="holding-help-popover-content">
        <button class="holding-help-close" aria-label="Close help">&times;</button>
        <h3 class="holding-help-title">Missing investment details</h3>
        <p class="holding-help-text"></p>
      </div>
    `;
    document.body.appendChild(pop);

    // Close button
    pop.querySelector('.holding-help-close').addEventListener('click', () => {
      pop.classList.remove('open');
    });

    // Click outside → close
    document.addEventListener('click', (evt) => {
      if (!pop.classList.contains('open')) return;
      if (!pop.contains(evt.target)) {
        pop.classList.remove('open');
      }
    });
  }

  const textEl = pop.querySelector('.holding-help-text');
  if (textEl) {
    textEl.textContent = message;
  }

  pop.classList.add('open');
}

async function loadHoldingsIntoGrid() {
  const grid = document.getElementById('holdings-summary-grid');
  if (!grid) {
    console.warn('No #holdings-summary-grid element found.');
    return;
  }

  try {
    console.log('🔍 holdings-summary.js: fetching /api/holdings ...');

    const res = await fetch('/api/holdings');
    if (!res.ok) {
      console.error('❌ /api/holdings responded with status', res.status);
      grid.innerHTML = `
        <div class="holding-card error-card">
          <div class="holding-symbol">Error</div>
          <div class="holding-meta">Could not load holdings.</div>
        </div>
      `;
      return;
    }

    const data = await res.json();
    console.log('✅ /api/holdings response:', data);

    const holdings = Array.isArray(data.holdings) ? data.holdings : [];

    // If no holdings, show a friendly empty state
    if (holdings.length === 0) {
      grid.innerHTML = `
        <div class="holding-card empty-card">
          <div class="holding-symbol">No holdings yet</div>
          <div class="holding-meta">Add some positions to see your totals here.</div>
        </div>
      `;
      return;
    }

    // ===== Fetch prices for all symbols that exist =====
    const symbols = [
      ...new Set(
        holdings
          .map((h) => (h.symbol || '').trim())
          .filter((s) => s.length > 0)
      )
    ];

    let pricesMap = {};

    if (symbols.length > 0) {
      const tickersParam = encodeURIComponent(symbols.join(','));
      console.log('🔍 holdings-summary.js: fetching /api/prices for', symbols);

      const priceRes = await fetch(`/api/prices?tickers=${tickersParam}`);
      if (priceRes.ok) {
        const priceJson = await priceRes.json();
        console.log('✅ /api/prices response:', priceJson);
        pricesMap = priceJson.prices || {};
      } else {
        console.error('❌ /api/prices responded with status', priceRes.status);
      }
    }

    // Helper formatters
    const formatMoney = (v) => {
      if (v == null) return '—';
      const num = Number(v);
      if (Number.isNaN(num)) return '—';
      return num.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      });
    };

    const formatPct = (v) => {
      if (v == null) return '—';
      const num = Number(v);
      if (Number.isNaN(num)) return '—';
      return num.toFixed(1) + '%';
    };

// BEGIN - calculation of Totals summary

// Calculate and display totals BEFORE clearing grid
calculateAndDisplayTotals(holdings, pricesMap);

// Clear any previous content (but keep the totals container)

	  const existingCards = grid.querySelectorAll('.holding-card');
	  existingCards.forEach(card => card.remove());
	  
// END - calculations of Totals Summary
	  
    // Clear any previous content
    grid.innerHTML = '';

    // ===== Render one card per holding =====
    holdings.forEach((h) => {
      // --- Symbol / header handling ---
      const rawSymbol = (h.symbol || '').trim();
      const hasSymbol = rawSymbol.length > 0;
      const symbol = hasSymbol ? rawSymbol : null;
      const displaySymbol = symbol || 'UNKNOWN';

      // Raw numbers from DB
      let totalShares =
        h.total_shares != null ? Number(h.total_shares) : 0;
      const totalCostBasis =
        h.total_cost_basis != null ? Number(h.total_cost_basis) : 0;

      // Look up price info for this symbol (only if we have one)
      const priceInfo = symbol ? pricesMap[symbol] : null;
      const currentPrice =
        priceInfo && typeof priceInfo.price === 'number'
          ? priceInfo.price
          : null;

      let currentValue = null;
      let gain = null;
      let gainPct = null;

      // 🔹 Treat “value typed, shares = 0” as a baseline snapshot
      let isBaselineLike =
        (!totalShares || totalShares <= 0) && totalCostBasis > 0;

      if (isBaselineLike) {
        // If we know ticker + current price, infer shares:
        if (hasSymbol && currentPrice != null && !Number.isNaN(currentPrice)) {
          totalShares = totalCostBasis / currentPrice;
        }

        // For onboarding, the value the user typed *is* the current value
        currentValue = totalCostBasis;

        // We CANNOT calculate gain without knowing purchase price
        gain = null;
        gainPct = null;
      }

      // Check if this is a "price-imputed" baseline (we used current price as cost basis)
      const isPriceImputed = isBaselineLike && hasSymbol && currentPrice != null;

      if (isPriceImputed) {
        // This happens when user knows "I have $52,000 in VTI"
        // We used current price as their cost basis, so gain would be 0 (wrong!)
        gain = null;      // Can't calculate real gain
        gainPct = null;   // Can't calculate real percentage

        // They DO know the investment, so don't show "Needs Details" just for that
        isBaselineLike = false;
      }

      // Normal holdings calculation (for non-baseline)
      if (!isBaselineLike && currentPrice != null && !Number.isNaN(currentPrice) && totalShares > 0) {
        // Normal holdings: standard gain math
        currentValue = currentPrice * totalShares;
        gain = currentValue - totalCostBasis;
        if (totalCostBasis > 0) {
          gainPct = (gain / totalCostBasis) * 100;
        }

        // Ignore microscopic gains from rounding errors
        // If gain is less than 1 cent OR less than 0.1%, treat as zero
        if (Math.abs(gain) < 0.01 || Math.abs(gainPct) < 0.1) {
          gain = 0;
          gainPct = 0;
        }
      }

      // Choose gain/loss CSS class
      let gainClass = 'gain-neutral';

      // Only apply color to REAL gains/losses (not rounding errors)
      if (gain != null) {
        if (gain > 0.005) {          // More than half a cent gain
          gainClass = 'gain-positive';
        } else if (gain < -0.005) {  // More than half a cent loss
          gainClass = 'gain-negative';
        }
      }

      // What goes in the big number at the top?
      let headerMainText;
      let headerPctHtml = '';

      // Top number shows CURRENT VALUE for everyone (if we have it)
      if (currentValue != null) {
        headerMainText = formatMoney(currentValue);
        headerPctHtml = '';
      } else {
        headerMainText = '—';
        headerPctHtml = '';
      }

      // Shares display
      const sharesDisplay =
        totalShares && totalShares > 0
          ? totalShares.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4
            })
          : '—';

      // Build the card
      const card = document.createElement('div');
      card.className = 'holding-card';

      const isUnknown = !hasSymbol;

      // Decide if we should show "Needs Details" and what message it has
      const needsDetails = isUnknown || isBaselineLike;
      let detailsMsg = '';

      if (isUnknown) {
        detailsMsg =
          'This holding is missing details regarding this investment. Please add its details so we can show accurate gains.';
      } else if (isBaselineLike) {
        detailsMsg =
          'This holding is missing details regarding this investments. Please add its details so we can show accurate gains.';
      }

		card.innerHTML = `
		  <div class="holding-header">
			<div class="holding-header-left">
			  <div class="holding-symbol">
				${displaySymbol}
				${
				  needsDetails
					? `<span class="holding-baseline-badge"
							 data-help-msg="${detailsMsg.replace(/"/g, '&quot;')}">
						 Needs Details
					   </span>`
					: ''
				}
			  </div>
			  <div class="holding-account">
				  ${h.nickname || h.account_type || 'Unknown Account'}
				</div>
			</div>
			<div class="holding-gain ${gainClass}">
			  ${headerMainText}${headerPctHtml}
			</div>
		  </div>
		  <div class="holding-body">
			<div class="holding-row">
			  <span class="label">Shares</span>
			  <span class="value">${sharesDisplay}</span>
			</div>
			<div class="holding-row">
			  <span class="label">Cost Basis</span>
			  <span class="value">${
				(isBaselineLike || !hasSymbol || isPriceImputed)
				  ? '—'
				  : formatMoney(totalCostBasis)
			  }</span>
			</div>
			<div class="holding-row">
			  <span class="label">Current Price</span>
			  <span class="value">${
				currentPrice == null ? '—' : formatMoney(currentPrice)
			  }</span>
			</div>
			<div class="holding-row">
			  <span class="label">Gain/Loss</span>
			  <span class="value gain-loss-value ${
				gainClass === 'gain-positive'
				  ? 'gain-positive'
				  : gainClass === 'gain-negative'
				  ? 'gain-negative'
				  : ''
			  }">
				${
				  (gain != null && !isBaselineLike && !isPriceImputed)
					? (
						gain === 0
						  ? '$0.00' // Show zero clearly
						  : (gain > 0 ? '+' : '') + formatMoney(Math.abs(gain))
					  )
					: '—'
				}
				${
				  (gainPct != null && !isBaselineLike && !isPriceImputed)
					? ` <span class="gain-loss-pct">(${formatPct(gainPct)})</span>`
					: ''
				}
			  </span>
			</div>
			<!-- NEW NOTES SECTION -->
			${h.notes ? `
			  <div class="holding-row notes-row">
				<span class="label">Notes</span>
				<span class="value notes-value">${escapeHtml(h.notes)}</span>
			  </div>
			` : ''}
		  </div>
		`;

      // Attach helper popup to the "Needs Details" badge
      card.querySelectorAll('.holding-baseline-badge').forEach((badgeEl) => {
        badgeEl.addEventListener('click', (evt) => {
          evt.stopPropagation();
          const msg =
            badgeEl.dataset.helpMsg ||
            'This holding is missing some details. Add them later for more accurate tracking.';
          showHoldingHelpPopover(msg);
        });
      });

      grid.appendChild(card);
    });
  } catch (err) {
    console.error('❌ Error calling /api/holdings:', err);
    const grid = document.getElementById('holdings-summary-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="holding-card error-card">
          <div class="holding-symbol">Error</div>
          <div class="holding-meta">Could not load holdings.</div>
        </div>
      `;
    }
  }
}
