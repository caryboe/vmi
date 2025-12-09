// ledger.js
// Dummy data for now – later this will come from your API / DB.
const sampleTransactions = [
  {
    id: 1,
    account: "Roth IRA – Fidelity",
    type: "BUY",
    symbol: "VTI",
    date: "2025-12-01",
    shares: 23.5,
    price: 240,
    fees: 0,
    notes: "Rebalance from cash",
  },
  {
    id: 2,
    account: "Taxable – Schwab",
    type: "SELL",
    symbol: "NVDA",
    date: "2025-11-15",
    shares: 5,
    price: 130,
    fees: 1.5,
    notes: "Trim position",
  },
];

// Helpers
function formatCurrency(value) {
  if (value == null || isNaN(value)) return "—";
  return "$" + Number(value).toFixed(2);
}


// --- API helper: save a transaction to the backend ---
async function saveTransactionToApi(tx) {
  // TODO later: real mapping from account name → account_id
  // For now we know our one real account has id = 2
  const accountId = 2;

  const payload = {
    accountId,
    symbol: tx.symbol,
    transactionType: tx.type,
    transactionDate: tx.date,
    shares: tx.shares,
    price: tx.price,
    notes: tx.notes
  };

  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('POST /api/transactions response:', data);

  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to save transaction');
  }

  return data; // { success: true, transactionId: ... }
}


function calcTotal(tx) {
  const gross = tx.shares * tx.price;
  const fees = tx.fees || 0;
  return gross + (tx.type === "BUY" ? fees : -fees);
}

// Populate filters & account select
function populateAccounts(data) {
  const accounts = [...new Set(data.map((t) => t.account))];

  const accountFilter = document.getElementById("accountFilter");
  const accountSelect = document.getElementById("accountSelect");

  accounts.forEach((acc) => {
    const opt1 = document.createElement("option");
    opt1.value = acc;
    opt1.textContent = acc;
    accountFilter.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = acc;
    opt2.textContent = acc;
    accountSelect.appendChild(opt2);
  });
}

// Rendering: desktop table
function renderTable(transactions) {
  const tbody = document.querySelector("#ledgerTable tbody");
  tbody.innerHTML = "";

  transactions.forEach((tx) => {
    const tr = document.createElement("tr");

    const total = calcTotal(tx);

    tr.innerHTML = `
      <td>${tx.account}</td>
      <td>${tx.symbol}</td>
      <td>${tx.type}</td>
      <td>${tx.date}</td>
      <td>${tx.shares}</td>
      <td>${formatCurrency(tx.price)}</td>
      <td>${formatCurrency(total)}</td>
      <td>${formatCurrency(tx.fees)}</td>
      <td class="notes-cell">${tx.notes || ""}</td>
    `;

    tbody.appendChild(tr);
  });
}

// Rendering: mobile cards
function renderCards(transactions) {
  const container = document.getElementById("ledgerCards");
  container.innerHTML = "";

  transactions.forEach((tx) => {
    const total = calcTotal(tx);

    const card = document.createElement("div");
    card.className = "ledger-card";

    card.innerHTML = `
      <div class="ledger-card-header">
        <div>
          <div class="ledger-card-title">${tx.symbol} (${tx.type})</div>
          <div class="ledger-card-subtitle">${tx.account} • ${tx.date}</div>
        </div>
        <div style="text-align:right;">
          <div class="ledger-card-pill ${tx.type}">${tx.type}</div>
          <div class="ledger-card-gain">${formatCurrency(total)}</div>
        </div>
      </div>
      <div class="ledger-card-body">
        <div class="ledger-card-row">
          <span>Shares</span>
          <span>${tx.shares}</span>
        </div>
        <div class="ledger-card-row">
          <span>Price / share</span>
          <span>${formatCurrency(tx.price)}</span>
        </div>
        <div class="ledger-card-row">
          <span>Fees</span>
          <span>${formatCurrency(tx.fees)}</span>
        </div>
        ${
          tx.notes
            ? `<div class="ledger-card-row">
                 <span>Notes</span>
                 <span>${tx.notes}</span>
               </div>`
            : ""
        }
      </div>
    `;

    const header = card.querySelector(".ledger-card-header");
    header.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });

    container.appendChild(card);
  });
}

// Modal / form interactions
function setupModal() {
  const modal = document.getElementById("transactionModal");
  const openButtons = [
    document.getElementById("addTransactionBtn"),
    document.getElementById("floatingAddBtn"),
  ];
  const closeButtons = [
    document.getElementById("modalCloseBtn"),
    document.getElementById("modalCancelBtn"),
  ];
  const form = document.getElementById("transactionForm");
  const sharesInput = document.getElementById("sharesInput");
  const priceInput = document.getElementById("priceInput");
  const feesInput = document.getElementById("feesInput");
  const totalPreview = document.getElementById("totalPreview");
  const typeSelect = document.getElementById("typeSelect");

  function openModal() {
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
    form.reset();
    totalPreview.textContent = "—";
  }

  openButtons.forEach((btn) => {
    if (btn) btn.addEventListener("click", openModal);
  });

  closeButtons.forEach((btn) => {
    if (btn) btn.addEventListener("click", closeModal);
  });

  modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);

  function updateTotalPreview() {
    const shares = parseFloat(sharesInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const fees = parseFloat(feesInput.value) || 0;
    const type = typeSelect.value;

    if (!shares || !price) {
      totalPreview.textContent = "—";
      return;
    }

    const gross = shares * price;
    const total = gross + (type === "BUY" ? fees : -fees);
    totalPreview.textContent = formatCurrency(total);
  }

  [sharesInput, priceInput, feesInput, typeSelect].forEach((el) => {
    el.addEventListener("input", updateTotalPreview);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // For now, just log + close. Later we’ll POST to your API.
    const tx = {
      account: document.getElementById("accountSelect").value,
      symbol: document.getElementById("symbolInput").value.trim().toUpperCase(),
      type: typeSelect.value,
      date: document.getElementById("dateInput").value,
      shares: parseFloat(sharesInput.value),
      price: parseFloat(priceInput.value),
      fees: parseFloat(feesInput.value) || 0,
      notes: document.getElementById("notesInput").value.trim(),
    };

    console.log("Demo submit – new transaction:", tx);

    // For demo, you could also push into sampleTransactions and re-render:
    // sampleTransactions.unshift(tx);
    // renderTable(sampleTransactions);
    // renderCards(sampleTransactions);

    closeModal();
  });
}

// Filters (simple, client-side)
function setupFilters() {
  const accountFilter = document.getElementById("accountFilter");
  const typeFilter = document.getElementById("typeFilter");

  function applyFilters() {
    const acc = accountFilter.value;
    const type = typeFilter.value;

    const filtered = sampleTransactions.filter((tx) => {
      const matchAcc = !acc || tx.account === acc;
      const matchType = !type || tx.type === type;
      return matchAcc && matchType;
    });

    renderTable(filtered);
    renderCards(filtered);
  }

  [accountFilter, typeFilter].forEach((el) => {
    el.addEventListener("change", applyFilters);
  });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  populateAccounts(sampleTransactions);
  renderTable(sampleTransactions);
  renderCards(sampleTransactions);
  setupModal();
  setupFilters();
});
