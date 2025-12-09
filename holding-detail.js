// holding-detail.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('holding-detail.js loaded');
  
  const modal = document.getElementById('holding-detail-modal');
  if (!modal) {
    console.error('Modal not found!');
    return;
  }
  
  // Close function
  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  
  // Open when holding card clicked
  document.addEventListener('click', function(e) {
    const card = e.target.closest('.holding-card');
    if (card) {
      console.log('Card clicked, fetching data...');
      
      // Get the ticker from the card
      let ticker = null;
      
      // Try different ways to find the ticker
      if (card.dataset.ticker) {
        ticker = card.dataset.ticker;
      } 
      // Look for element with class that might contain ticker
      else if (card.querySelector('.ticker, .symbol, .holding-ticker, h3, h4')) {
        const tickerElement = card.querySelector('.ticker, .symbol, .holding-ticker, h3, h4');
        ticker = tickerElement.textContent.trim();
      }
      // Extract from card text
      else {
        const cardText = card.textContent || '';
        const tickerMatch = cardText.match(/\b([A-Z]{1,5})\b/);
        ticker = tickerMatch ? tickerMatch[1] : null;
      }
      
      if (ticker) {
        console.log(`Fetching details for ${ticker}`);
        fetchHoldingDetails(ticker);
      } else {
        console.error('Could not find ticker in card');
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      
      e.preventDefault();
    }
  });
  
  // Close on backdrop click
  modal.addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
  
  // Close on button click
  const closeBtn = modal.querySelector('.close-button');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
});

// ========== HAMBURGER MENU ==========
document.addEventListener('DOMContentLoaded', function() {
  const menuBtn = document.getElementById('holding-menu-btn');
  const menuDropdown = document.getElementById('holding-menu-dropdown');
  
  if (!menuBtn || !menuDropdown) {
    console.warn('Menu elements not found');
    return;
  }
  
  // Toggle menu on hamburger click
  menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    menuDropdown.classList.toggle('show');
  });
  
  // Close menu when clicking elsewhere
  document.addEventListener('click', function() {
    menuDropdown.classList.remove('show');
  });
  
  // Prevent menu from closing when clicking inside it
  menuDropdown.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // Menu item clicks
  menuDropdown.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
      const action = this.dataset.action;
      const isComingSoon = this.classList.contains('coming-soon');
      
      // Close menu
      menuDropdown.classList.remove('show');
      
      // Skip if coming soon
      if (isComingSoon) {
        console.log(`"${this.textContent.trim()}" - Coming soon!`);
        return;
      }
      
      // Handle active items
      switch(action) {
        case 'edit-notes':
          console.log('Opening Edit Notes form...');
          // We'll implement this next
          break;
          
        case 'see-transactions':
          console.log('Redirecting to transactions page...');
          window.location.href = '/ledger.html';
          break;
          
        default:
          console.log(`Action: ${action}`);
      }
    });
  });
});

// ========== HELPER FUNCTIONS ==========

function formatCurrency(value) {
  if (value == null || isNaN(value)) return '—';
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}

function openEditNotesForm() {
  const modal = document.getElementById('holding-detail-modal');
  const holdingId = modal.dataset.holdingId;
  const currentNotes = document.querySelector('.notes-content').textContent;
  
  // Create/edit form
  const formHTML = `
    <div class="edit-notes-modal">
      <h3>Edit Notes</h3>
      <textarea id="notes-edit-textarea">${currentNotes}</textarea>
      <div class="edit-notes-buttons">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-save" data-holding-id="${holdingId}">Save</button>
      </div>
    </div>
  `;
  
  // Show form overlay
  // Implement save to database
}

// ========== MAIN MODAL FUNCTIONS ==========

// Main function to open modal with real data
function openHoldingDetail(holding) {
  console.log('Opening modal for:', holding);
  
  // Populate modal with real data
  document.getElementById('modal-symbol').textContent = holding.symbol || '—';
  document.getElementById('modal-account').textContent = holding.account || '—';
  document.getElementById('modal-total-value').textContent = formatCurrency(holding.totalValue);
  document.getElementById('modal-shares').textContent = formatNumber(holding.shares);
  document.getElementById('modal-cost-basis').textContent = formatCurrency(holding.costBasis);
  document.getElementById('modal-current-price').textContent = formatCurrency(holding.currentPrice);
  
  // Gain/loss with color
  const gainEl = document.getElementById('modal-gain');
  const gainText = `${holding.gain >= 0 ? '+' : ''}${formatCurrency(Math.abs(holding.gain))} (${holding.gainPct ? holding.gainPct.toFixed(1) : '0.0'}%)`;
  gainEl.textContent = gainText;
  gainEl.className = `detail-value ${holding.gain >= 0 ? 'gain-positive' : 'gain-negative'}`;
  
  // Notes
  document.getElementById('modal-notes').textContent = holding.notes || 'No notes';
  
  // Store holding ID for editing
  document.getElementById('holding-detail-modal').dataset.holdingId = holding.id;
  
  // Show modal
  const modal = document.getElementById('holding-detail-modal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// New function to fetch holding details from API
// New function to fetch holding details from API
async function fetchHoldingDetails(ticker) {
  try {
    console.log(`Fetching /api/holdings/${ticker}`);
    const response = await fetch(`/api/holdings/${ticker}`);
    const data = await response.json();
    
    if (data.success && data.holding) {
      console.log('Holding data received:', data.holding);
      
      // First, get current price for this ticker
      let currentPrice = 0;
      try {
        const priceResponse = await fetch(`/api/prices?tickers=${ticker}`);
        const priceData = await priceResponse.json();
        if (priceData.success && priceData.prices[ticker]) {
          currentPrice = priceData.prices[ticker].price;
        }
      } catch (priceError) {
        console.error('Error fetching current price:', priceError);
      }
      
      // Calculate values
      const shares = data.holding.total_shares || 0;
      const costBasis = data.holding.total_cost_basis || 0;
      const currentValue = currentPrice * shares;
      const gain = currentValue - costBasis;
      const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0;
      
      // Transform data to match what openHoldingDetail expects
      const holding = {
        symbol: data.holding.symbol,
        account: data.holding.account_type || data.holding.nickname || '—',
        totalValue: currentValue,
        shares: shares,
        costBasis: costBasis,
        currentPrice: currentPrice,
        gain: gain,
        gainPct: gainPct,
        notes: data.holding.notes || 'No notes',
        id: data.holding.id
      };
      
      openHoldingDetail(holding);
    } else {
      console.error('No holding data returned');
      // Show empty modal
      const modal = document.getElementById('holding-detail-modal');
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  } catch (error) {
    console.error('Error fetching holding details:', error);
    // Show empty modal on error
    const modal = document.getElementById('holding-detail-modal');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}