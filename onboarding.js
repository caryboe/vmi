
(function () {
  console.log('🚀 Onboarding wizard script loading...');
  
  const wizard = document.getElementById('vmi-onboarding-wizard');
  const btnOpen = document.getElementById('btn-add-what-i-own');
  
  console.log('Found wizard:', !!wizard);
  console.log('Found button:', !!btnOpen);
  
  if (!wizard || !btnOpen) {
    console.error('❌ CRITICAL: Wizard or Open button not found in DOM!');
    console.error('Wizard ID exists:', !!document.getElementById('vmi-onboarding-wizard'));
    console.error('Button ID exists:', !!document.getElementById('btn-add-what-i-own'));
    return;
  }
  
  // Make sure wizard is hidden initially
  wizard.style.display = 'none';
  
  const btnBack = document.getElementById('vmi-wizard-back');
  const btnClose = document.getElementById('vmi-wizard-close');
  const stepIndicator = document.getElementById('vmi-wizard-step-indicator');
  const summaryBox = document.getElementById('vmi-summary');
  const btnFinish = document.getElementById('vmi-finish');
  
  const steps = Array.from(document.querySelectorAll('.vmi-wizard-step'));
  let currentStep = 1;

  const state = {
    accountType: null,
    accountLabel: null,
    knowsInvestment: null,
    ticker: null,
    value: null,
    knowsShares: null,
    shares: null,
    hasContrib: null,
    contribAmount: null,
    contribFrequency: null,
	wantsNotes: null,
    notes: null
  };

// Update the showStep function to handle 8 steps:
function showStep(stepNumber) {
  console.log(`📱 Showing step ${stepNumber}`);
  currentStep = stepNumber;

  steps.forEach(stepEl => {
    const step = Number(stepEl.getAttribute('data-step'));
    stepEl.classList.toggle('vmi-hidden', step !== stepNumber);
  });

  if (stepIndicator) {
    // Update to 8 total steps
    stepIndicator.textContent = `Step ${stepNumber} of 8`;
  }
}

  function openWizard() {
    console.log('🎯 Opening wizard...');
    
    // Make absolutely sure wizard is visible
    wizard.style.display = 'flex';
    wizard.style.visibility = 'visible';
    wizard.style.opacity = '1';
    
    // Force reflow
    wizard.offsetHeight;
    
    // Add class for animations
    wizard.classList.add('open');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Reset and show first step
    resetWizard();
    showStep(1);
    
    console.log('✅ Wizard opened');
  }

  function closeWizard() {
    console.log('🔒 Closing wizard...');
    
    wizard.classList.remove('open');
    wizard.style.display = 'none';
    document.body.style.overflow = '';
    
    console.log('✅ Wizard closed');
  }

function resetWizard() {
  console.log('🔄 Resetting wizard...');
  
  // Clear state
  Object.keys(state).forEach(key => state[key] = null);
  
  // Clear selections
  document.querySelectorAll('.vmi-pill-btn.vmi-selected')
    .forEach(btn => btn.classList.remove('vmi-selected'));
  
  // Clear inputs
  const inputs = wizard.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    if (input.type !== 'button' && input.type !== 'submit') {
      input.value = '';
    }
  });
  
  // Hide optional sections
  ['vmi-account-other-wrapper', 'vmi-shares-wrapper', 'vmi-contrib-details', 'vmi-notes-wrapper']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('vmi-hidden');
    });
}

  // ========== EVENT LISTENERS ==========
  
  // MAIN OPEN BUTTON - This is critical!
  btnOpen.addEventListener('click', openWizard);
  console.log('✅ Added click listener to open button');
  
  // Close button
  if (btnClose) {
    btnClose.addEventListener('click', closeWizard);
    console.log('✅ Added close listener');
  }
  
  // Back button
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (currentStep === 1) {
        closeWizard();
      } else {
        showStep(currentStep - 1);
      }
    });
    console.log('✅ Added back listener');
  }

  // ========== STEP 1: Account Type ==========
  const step1Buttons = document.querySelectorAll('[data-step="1"] .vmi-pill-btn');
  const otherWrapper = document.getElementById('vmi-account-other-wrapper');
  const otherInput = document.getElementById('vmi-account-other-name');
  const btnStep1Next = document.getElementById('vmi-step1-next');
  
  if (step1Buttons.length && btnStep1Next) {
    console.log('✅ Step 1 elements found');
    
    step1Buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        step1Buttons.forEach(b => b.classList.remove('vmi-selected'));
        btn.classList.add('vmi-selected');
        state.accountType = btn.getAttribute('data-account');
        
        if (otherWrapper) {
          if (state.accountType === 'Other') {
            otherWrapper.classList.remove('vmi-hidden');
            if (otherInput) otherInput.focus();
          } else {
            otherWrapper.classList.add('vmi-hidden');
          }
        }
      });
    });
    
    btnStep1Next.addEventListener('click', () => {
      if (!state.accountType) {
        alert('Please select an account type.');
        return;
      }
      
      if (state.accountType === 'Other' && otherInput) {
        const label = otherInput.value.trim();
        if (!label) {
          alert('Please name this account.');
          otherInput.focus();
          return;
        }
        state.accountLabel = label;
      }
      
      showStep(2);
    });
  } else {
    console.warn('⚠️ Step 1 elements missing');
  }

  // ========== STEP 2: Account Value ==========
  const valueInput = document.getElementById('vmi-account-value');
  const btnStep2Next = document.getElementById('vmi-step2-next');
  
  if (valueInput && btnStep2Next) {
    btnStep2Next.addEventListener('click', () => {
      const raw = valueInput.value.trim();
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      
      if (!raw || isNaN(num) || num <= 0) {
        alert('Please enter a positive value.');
        valueInput.focus();
        return;
      }
      
      state.value = num;
      showStep(3);
    });
  }

  // ========== STEP 3: Know Investment? ==========
  const knowInvButtons = document.querySelectorAll('[data-step="3"] .vmi-pill-btn');
  const btnStep3Next = document.getElementById('vmi-step3-next');
  
  if (knowInvButtons.length && btnStep3Next) {
    knowInvButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        knowInvButtons.forEach(b => b.classList.remove('vmi-selected'));
        btn.classList.add('vmi-selected');
        state.knowsInvestment = btn.getAttribute('data-know-investment') === 'yes';
      });
    });
    
    btnStep3Next.addEventListener('click', () => {
      if (state.knowsInvestment === null) {
        alert('Please choose an option.');
        return;
      }
      
      showStep(state.knowsInvestment ? 4 : 5);
    });
  }

  // ========== STEP 4: Ticker ==========
  const tickerInput = document.getElementById('vmi-ticker');
  const btnStep4Next = document.getElementById('vmi-step4-next');
  
  if (tickerInput && btnStep4Next) {
    // Auto-uppercase
    tickerInput.addEventListener('input', function() {
      this.value = this.value.toUpperCase();
    });
    
    btnStep4Next.addEventListener('click', () => {
      const ticker = tickerInput.value.trim().toUpperCase();
      if (!ticker) {
        alert('Please enter a ticker symbol.');
        tickerInput.focus();
        return;
      }
      
      state.ticker = ticker;
      showStep(5);
    });
  }

  // ========== STEP 5: Know Shares? ==========
  const knowSharesButtons = document.querySelectorAll('[data-step="5"] .vmi-pill-btn');
  const sharesWrapper = document.getElementById('vmi-shares-wrapper');
  const sharesInput = document.getElementById('vmi-shares');
  const btnStep5Next = document.getElementById('vmi-step5-next');
  
  if (knowSharesButtons.length && btnStep5Next) {
    knowSharesButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        knowSharesButtons.forEach(b => b.classList.remove('vmi-selected'));
        btn.classList.add('vmi-selected');
        
        state.knowsShares = btn.getAttribute('data-know-shares') === 'yes';
        
        if (sharesWrapper) {
          if (state.knowsShares) {
            sharesWrapper.classList.remove('vmi-hidden');
            if (sharesInput) sharesInput.focus();
          } else {
            sharesWrapper.classList.add('vmi-hidden');
          }
        }
      });
    });
    
    btnStep5Next.addEventListener('click', () => {
      if (state.knowsShares === null) {
        alert('Please choose an option.');
        return;
      }
      
      if (state.knowsShares && sharesInput) {
        const raw = sharesInput.value.trim();
        const num = parseFloat(raw);
        if (!raw || isNaN(num) || num <= 0) {
          alert('Please enter a valid number of shares.');
          sharesInput.focus();
          return;
        }
        state.shares = num;
      }
      
      showStep(6);
    });
  }

  // ========== STEP 6: Contributions ==========
  const contribButtons = document.querySelectorAll('[data-step="6"] .vmi-pill-btn');
  const contribDetails = document.getElementById('vmi-contrib-details');
  const contribAmountInput = document.getElementById('vmi-contrib-amount');
  const contribFreqSelect = document.getElementById('vmi-contrib-frequency');
  const btnStep6Next = document.getElementById('vmi-step6-next');
  
  if (contribButtons.length && btnStep6Next) {
    contribButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        contribButtons.forEach(b => b.classList.remove('vmi-selected'));
        btn.classList.add('vmi-selected');
        
        const value = btn.getAttribute('data-contrib');
        
        if (value === 'yes') {
          state.hasContrib = true;
          if (contribDetails) contribDetails.classList.remove('vmi-hidden');
        } else if (value === 'no') {
          state.hasContrib = false;
          if (contribDetails) contribDetails.classList.add('vmi-hidden');
        } else { // later
          state.hasContrib = null;
          if (contribDetails) contribDetails.classList.add('vmi-hidden');
        }
      });
    });
    
    btnStep6Next.addEventListener('click', () => {
      if (state.hasContrib === null) {
        alert('Please choose an option.');
        return;
      }
      
      if (state.hasContrib) {
        if (!contribAmountInput || !contribFreqSelect) {
          alert('Contribution details not found.');
          return;
        }
        
        const rawAmt = contribAmountInput.value.trim();
        const numAmt = parseFloat(rawAmt.replace(/[^0-9.]/g, ''));
        if (!rawAmt || isNaN(numAmt) || numAmt <= 0) {
          alert('Please enter a valid contribution amount.');
          contribAmountInput.focus();
          return;
        }
        
        const freq = contribFreqSelect.value;
        if (!freq) {
          alert('Please select contribution frequency.');
          contribFreqSelect.focus();
          return;
        }
        
        state.contribAmount = numAmt;
        state.contribFrequency = freq;
      }
      
      buildSummary();
      showStep(7);
    });
  }

// ========== NEW STEP 7: Notes ==========
const notesButtons = document.querySelectorAll('[data-step="7"] .vmi-pill-btn');
const notesWrapper = document.getElementById('vmi-notes-wrapper');
const notesTextarea = document.getElementById('vmi-notes');
const btnStep7Next = document.getElementById('vmi-step7-next');

if (notesButtons.length && btnStep7Next) {
  console.log('✅ Step 7 (Notes) elements found');
  
  notesButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      notesButtons.forEach(b => b.classList.remove('vmi-selected'));
      btn.classList.add('vmi-selected');
      
      state.wantsNotes = btn.getAttribute('data-notes') === 'yes';
      
      if (notesWrapper) {
        if (state.wantsNotes) {
          notesWrapper.classList.remove('vmi-hidden');
          if (notesTextarea) notesTextarea.focus();
        } else {
          notesWrapper.classList.add('vmi-hidden');
        }
      }
    });
  });
  
  btnStep7Next.addEventListener('click', () => {
    if (state.wantsNotes === null) {
      alert('Please choose an option.');
      return;
    }
    
    if (state.wantsNotes && notesTextarea) {
      const notes = notesTextarea.value.trim();
      if (!notes) {
        alert('Please add notes or choose "No, skip notes".');
        notesTextarea.focus();
        return;
      }
      state.notes = notes;
    } else {
      state.notes = null;
    }
    
	  // REBUILD SUMMARY WITH THE NEW NOTES BEFORE SHOWING STEP 8
	  buildSummary();  // ← ADD THIS LINE	  
	  
    // Show summary (now step 8)
    showStep(8);
  });
}

// ========== UPDATED STEP 8: Summary (was step 7) ==========
function buildSummary() {
  if (!summaryBox) return;
  
  const lines = [];
  
  // Account
  const accountDisplay = state.accountLabel || state.accountType || 'Not specified';
  lines.push(`<strong>Account:</strong> ${accountDisplay}`);
  
  // Investment
  if (state.knowsInvestment && state.ticker) {
    lines.push(`<strong>Investment:</strong> ${state.ticker}`);
  } else {
    lines.push(`<strong>Investment:</strong> Not yet added`);
  }
  
  // Value
  if (state.value) {
    lines.push(`<strong>Value:</strong> $${state.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  
  // Shares
  if (state.knowsShares && state.shares) {
    lines.push(`<strong>Shares:</strong> ${state.shares.toFixed(4)}`);
  } else {
    lines.push(`<strong>Shares:</strong> Will be calculated automatically`);
  }
  
  // Contributions
  if (state.hasContrib && state.contribAmount && state.contribFrequency) {
    lines.push(`<strong>Contributions:</strong> $${state.contribAmount} ${state.contribFrequency}`);
  } else {
    lines.push(`<strong>Contributions:</strong> Not set up (can add later)`);
  }
  
  // Notes (NEW)
  if (state.notes) {
    lines.push(`<strong>Notes:</strong> ${state.notes}`);
  } else {
    lines.push(`<strong>Notes:</strong> None`);
  }
  
  summaryBox.innerHTML = lines.join('<br>');
}

// Update the finish button payload to include notes:
if (btnFinish) {
  btnFinish.addEventListener('click', () => {
    console.log('💾 Saving baseline...', state);
    
    const payload = {
      accountType: state.accountType,
      accountLabel: state.accountLabel,
      ticker: state.knowsInvestment ? state.ticker : null,
      accountValue: state.value,
      shares: state.knowsShares ? state.shares : null,
      hasContrib: state.hasContrib,
      contribAmount: state.hasContrib ? state.contribAmount : null,
      contribFrequency: state.hasContrib ? state.contribFrequency : null,
      notes: state.notes  // ← ADD THIS LINE
    };
      
      // Show loading
      btnFinish.disabled = true;
      btnFinish.textContent = 'Saving...';
      
      // Send to backend
      fetch('/api/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(data => {
        console.log('✅ Saved:', data);
        alert('Account added successfully!');
        closeWizard();
        setTimeout(() => location.reload(), 500);
      })
      .catch(err => {
        console.error('❌ Error:', err);
        alert('Error saving. Please try again.');
      })
      .finally(() => {
        btnFinish.disabled = false;
        btnFinish.textContent = 'Finish & Save';
      });
    });
  }
  

	
	
	
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wizard.style.display === 'flex') {
      closeWizard();
    }
  });
  
  console.log('✅ Onboarding wizard fully loaded and ready!');

// Add this to your onboarding.js file, at the end of the IIFE:

// Prevent form submission on Enter key in inputs
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && wizard.style.display === 'flex') {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
      e.preventDefault();
      // Find the next button in the current step and click it
      const currentStep = document.querySelector('.vmi-wizard-step:not(.vmi-hidden)');
      const nextBtn = currentStep.querySelector('.vmi-primary-btn');
      if (nextBtn) nextBtn.click();
    }
  }
});

})();