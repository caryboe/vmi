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
			openEditNotesForm();  // ← THIS LINE MUST BE CHANGED!
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
  
  // Get current notes from the display
  const currentNotes = document.getElementById('modal-notes').textContent;
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'edit-notes-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  // Create modal content
  const editModal = document.createElement('div');
  editModal.className = 'edit-notes-modal';
  editModal.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  `;
  
  editModal.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 16px;">Edit Notes</h3>
    <textarea 
      id="notes-edit-textarea" 
      style="
        width: 100%;
        height: 150px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
      "
      placeholder="Add notes about this holding..."
    >${currentNotes === 'No notes' ? '' : currentNotes}</textarea>
    
    <div style="
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    ">
      <button id="cancel-edit-notes" style="
        padding: 8px 16px;
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
      ">Cancel</button>
      
      <button id="save-edit-notes" style="
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">Save Notes</button>
    </div>
  `;
  
  overlay.appendChild(editModal);
  document.body.appendChild(overlay);
  
  // Focus the textarea
  setTimeout(() => {
    document.getElementById('notes-edit-textarea').focus();
  }, 100);
  
  // Event listeners
  document.getElementById('cancel-edit-notes').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  document.getElementById('save-edit-notes').addEventListener('click', async () => {
    const newNotes = document.getElementById('notes-edit-textarea').value.trim();
    
    try {
      const response = await fetch(`/api/holdings/${holdingId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: newNotes })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update the display
        document.getElementById('modal-notes').textContent = 
          newNotes || 'No notes';
        
        // Close the edit modal
        document.body.removeChild(overlay);
        
        // Optional: Show success message
        alert('Notes updated successfully!');
      } else {
        alert('Failed to update notes: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Error saving notes. Please try again.');
    }
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
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
  
  // Notes - handle empty string correctly
const notesText = (holding.notes !== null && holding.notes !== undefined) ? holding.notes : 'No notes';
document.getElementById('modal-notes').textContent = notesText;
  
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
        notes: (data.holding.notes !== null && data.holding.notes !== undefined) ? data.holding.notes : 'No notes',
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
