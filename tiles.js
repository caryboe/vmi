// tiles.js version 9 – D-value thresholds + Shiller note + thresholds

// ---- Metric configuration (segments / ranges) ----

const metricConfigs = [
  {
    key: "shiller",
    title: "Shiller CAPE\u00AE Ratio",
    helpUrl: "https://www.longtermtrends.net/sp500-price-earnings-shiller-pe-ratio/",
    subtitle: "",
    type: "shiller-zero",
    neutral: true,
    value: 0.0,
    displayValue: "0.0",
    // Shiller CAPE bands:
    // Healthy: 5–20   -> -90° to -30°
    // Caution: 20–30 -> -30° to +30°
    // Risk: 30–50    -> +30° to +90°
    segments: [
      { min: 5,  max: 20, angleFrom: -90, angleTo: -30 }, // Healthy (D_low=5, D_hi=20)
      { min: 20, max: 30, angleFrom: -30, angleTo: 30 },  // Caution (D_mid=20, D_max=30)
      { min: 30, max: 50, angleFrom: 30,  angleTo: 90 }   // Risk   (30–50)
    ],
    thresholdsText:
      '<span class="metric-thresholds-title">Thresholds</span><br>' +
      'Healthy: 5–19.99<br>' +
      'Caution: 20–29.99<br>' +
      'Risk: ≥ 30'
  },
  {
    key: "breadth",
    title: "Market Breadth",
    /* subtitle: "(RSP/SPY)", */
    type: "gauge",
    neutral: false,
    // value: ratio 0–1; bubble shows %
    value: 0.0, // fallback default
    displayValue: "0.0%",
    // Bands in ratio units (D-values):
    // Risk:   0.00–0.2699 (D_low=0,  D_mid=0.27)   -> +30° to +90°
    // Caution:0.27–0.2999 (D_mid=0.27, D_hi=0.30)  -> -30° to +30°
    // Healthy: 0.30–0.40   (D_hi=0.30,  D_max=0.40)  -> -90° to -30°
    segments: [
      { min: 0.00, max: 0.27, angleFrom: 30,  angleTo: 90 },   // Risk
      { min: 0.27, max: 0.30, angleFrom: -30, angleTo: 30 },   // Caution
      { min: 0.30, max: 0.40, angleFrom: -90, angleTo: -30 }   // Healthy/green
    ],
    thresholdsText:
      '<span class="metric-thresholds-title">Thresholds</span><br>' +
      'Healthy: 30–40%<br>' +
      'Caution: 27–29.99%<br>' +
      'Risk: 0–26.99%',
    asOf: "—"
  },
  {
    key: "spreads",
    title: "Credit Spreads",
    /* subtitle: "(HYG/IEF)", */
    type: "gauge",
    neutral: false,
    value: 0.0,
    displayValue: "0.0",
    // D-values:
    // Risk:   0.75–0.8999 (D_low=0.75, D_mid=0.90) -> +30° to +90°
    // Caution:0.90–0.9499 (D_mid=0.90, D_hi=0.95)  -> -30° to +30°
    // Healthy: 0.95–1.10   (D_hi=0.95, D_max=1.10)  -> -90° to -30°
    segments: [
      { min: 0.75, max: 0.90, angleFrom: 30,  angleTo: 90 },   // Risk
      { min: 0.90, max: 0.95, angleFrom: -30, angleTo: 30 },   // Caution
      { min: 0.95, max: 1.10, angleFrom: -90, angleTo: -30 }   // Healthy/green
    ],
    thresholdsText:
      '<span class="metric-thresholds-title">Thresholds</span><br>' +
      'Healthy: 0.95–1.10<br>' +
      'Caution: 0.90–0.9499<br>' +
      'Risk: 0.75–0.8999',
    asOf: "—"
  },
  {
    key: "yield",
    title: "Yield Curve",
    /* subtitle: "(TLT/SGOV)", */
    type: "gauge",
    neutral: false,
    value: 0.0,
    displayValue: "0.0",
    // D-values:
    // Risk:   0.75–0.8999 (D_low=0.75, D_mid=0.90) -> +30° to +90°
    // Caution:0.90–1.1499 (D_mid=0.90, D_hi=1.15)  -> -30° to +30°
    // Healthy: 1.15–1.40   (D_hi=1.15, D_max=1.40)  -> -90° to -30°
    segments: [
      { min: 0.75, max: 0.90, angleFrom: 30,  angleTo: 90 },   // Risk
      { min: 0.90, max: 1.15, angleFrom: -30, angleTo: 30 },   // Caution
      { min: 1.15, max: 1.40, angleFrom: -90, angleTo: -30 }   // Healthy/green
    ],
    thresholdsText:
      '<span class="metric-thresholds-title">Thresholds</span><br>' +
      'Healthy: 1.15–1.40<br>' +
      'Caution: 0.90–1.1499<br>' +
      'Risk: 0.75–0.8999',
    asOf: "—"
  },
  {
    key: "vix",
    title: "VIX",
    /* subtitle: "(CBOE Volatility Index)", */ 
    type: "gauge",
    neutral: false,
    value: 0.0,
    displayValue: "0.0",
    // D-values:
    // Healthy: 10–21.99 (D_low=10, D_hi=22)    -> -90° to -30°
    // Caution:22–27.99 (D_hi=22, D_mid=28)    -> -30° to +30°
    // Risk:   28–40    (D_mid=28, D_max=40)   -> +30° to +90°
    segments: [
      { min: 10, max: 22, angleFrom: -90, angleTo: -30 },  // Healthy/green
      { min: 22, max: 28, angleFrom: -30, angleTo: 30 },   // Caution
      { min: 28, max: 40, angleFrom: 30,  angleTo: 90 }    // Risk
    ],
    thresholdsText:
      '<span class="metric-thresholds-title">Thresholds</span><br>' +
      'Healthy: 10–21.99<br>' +
      'Caution: 22–27.99<br>' +
      'Risk: ≥ 28',
    asOf: "—"
  }
];

// ---- Rendering ----

document.addEventListener("DOMContentLoaded", () => {
  const board = document.getElementById("metric-board");
  if (!board) return;

  metricConfigs.forEach((cfg) => {
    const tile = document.createElement("div");
    tile.classList.add("metric-tile");

    const isShillerZero = cfg.type === "shiller-zero";
    if (isShillerZero) {
      tile.classList.add("metric-tile--shiller-zero");
    }

    const gaugeId = `gauge-${cfg.key}`;

    let inner = `
      <div class="metric-header">
        <div>
          <div class="metric-title">${cfg.title}</div>
          ${
            cfg.subtitle
              ? `<div class="metric-subtitle">${cfg.subtitle}</div>`
              : ""
          }
        </div>
              <a
              class="metric-help"
              href="${cfg.helpUrl}"
              target="_blank"
              rel="noopener noreferrer"
            >?</a>
      </div>

      <div class="metric-gauge" id="${gaugeId}">
        ${createGaugeSvg({
          id: cfg.key,
          neutral: isShillerZero ? true : cfg.neutral
        })}
      </div>
    `;

    const displayValue =
      typeof cfg.displayValue !== "undefined"
        ? cfg.displayValue
        : cfg.value.toFixed(2);

    inner += `
      <div class="metric-value-bubble" data-metric-key="${cfg.key}" title="Click to enter Shiller CAPE value">
        ${displayValue}
      </div>
   `;

    if (!isShillerZero) {
      inner += `
        <div class="metric-asof" data-metric-key="${cfg.key}">
          As of: ${cfg.asOf}
        </div>
      `;
    }

    // NOTE: Shiller now gets BOTH the note and the thresholds.
    if (isShillerZero) {
      inner += `
        <div class="metric-note">
          <b>Note:</b> This metric is updated daily. It cannot be fully automated
          due to licensing and data restrictions. Please click
          <a href="https://www.multpl.com/shiller-pe" target="_blank" rel="noopener noreferrer">here</a>
          to manually input this value.
        </div>
      `;
    }

    if (cfg.thresholdsText) {
      inner += `
        <div class="metric-thresholds">
          ${cfg.thresholdsText}
        </div>
      `;
    }

    tile.innerHTML = inner;
    board.appendChild(tile);

    // Initialize gauge needles with default values (will be updated with live data)
    if (!isShillerZero && !cfg.neutral) {
      const gaugeContainer = document.getElementById(gaugeId);
      updateGaugeNeedle(gaugeContainer, cfg.value, cfg.segments);
    }

    if (isShillerZero) {
      setupShillerEditing(tile, cfg);
    }
  });

  // After tiles are created, load live data
  loadLiveMetrics();
});

// ---- Shiller CAPE inline editing ----

function setupShillerEditing(tile, cfg) {
  // Use the bubble as the click target, which now has the title attribute
  const bubble = tile.querySelector(".metric-value-bubble");
  if (!bubble) return;

  bubble.addEventListener("click", () => {
    // Prevent opening twice
    if (tile.querySelector(".shiller-edit-container")) return;

    bubble.style.display = "none";

    const edit = document.createElement("div");
    edit.className = "shiller-edit-container";

    // Use the current value in the bubble if it's not the default "0.0"
    const initialValue =
      bubble.textContent.trim() === "0.0" ? "" : bubble.textContent.trim();

    edit.innerHTML = `
      <input
        type="number"
        step="0.01"
        class="shiller-input"
        placeholder="29.34"
        value="${initialValue}"
        min="5"
        max="50"
      />
      <button type="button" class="shiller-confirm">✔</button>
    `;

    bubble.insertAdjacentElement("afterend", edit);

    const input = edit.querySelector(".shiller-input");
    const confirmBtn = edit.querySelector(".shiller-confirm");

    // Attempt to focus the input - this is the mobile issue spot
    input.focus();

    const handleConfirm = () => {
      const raw = input.value.trim();
      const val = parseFloat(raw);
      
      // Basic validation
      if (Number.isNaN(val) || val < 5 || val > 50) {
        input.focus();
        return;
      }

      // Update config and UI
      cfg.value = val;
      bubble.textContent = val.toFixed(2);
      bubble.style.display = "block";
      edit.remove();
      
      // Update gauge
      const gaugeContainer = tile.querySelector(".metric-gauge");
      gaugeContainer.innerHTML = createGaugeSvg({
        id: cfg.key,
        neutral: false
      });

      tile.classList.remove("metric-tile--shiller-zero");

      updateGaugeNeedle(gaugeContainer, val, cfg.segments);
      
      // Clean up event listener
      document.removeEventListener('click', closeHandler);
    };


    confirmBtn.addEventListener("click", handleConfirm);
    
    // Auto-save on Enter keypress 
    input.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            handleConfirm();
        }
    });
    
    // Close on click outside (this should work on mobile simulator)
    const closeHandler = (e) => {
      // If the click is not inside the edit container AND not on the bubble itself
      if (!edit.contains(e.target) && e.target !== bubble) {
          // Revert to original state
          bubble.style.display = 'block';
          edit.remove();
          document.removeEventListener('click', closeHandler);
      }
    };
    
    // Use a short delay before adding the listener to prevent the *click that opened* it from closing it
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
    }, 10);
  });
}

// ---- Load live metrics from /api/metrics and update tiles ----

function loadLiveMetrics() {
  // ✅ FIX: Corrected the endpoint to use the correct /api/metrics route
  fetch("/api/metrics") 
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      console.log("EODHD live metrics from /api/metrics:", data);

      if (!data || !data.metrics) return;

      const m = data.metrics;

      if (m.breadth) {
        updateMetricFromLive("breadth", m.breadth.value, m.breadth.asOf);
      }
      if (m.spreads) {
        updateMetricFromLive("spreads", m.spreads.value, m.spreads.asOf);
      }
      if (m.yield) {
        updateMetricFromLive("yield", m.yield.value, m.yield.asOf);
      }
      if (m.vix) {
        updateMetricFromLive("vix", m.vix.value, m.vix.asOf);
      }
    })
    .catch((err) => {
      console.error("Error loading live metrics:", err);
    });
}

function updateMetricFromLive(key, value, asOf) {
  const cfg = metricConfigs.find((c) => c.key === key);
  if (!cfg) return;

  cfg.value = value;
  cfg.asOf = asOf || cfg.asOf;

  // Decide how to display the value in the bubble
  if (key === "breadth") {
    const pct = Math.round(value * 100);
    cfg.displayValue = `${pct}%`;
  } else if (key === "vix") {
    cfg.displayValue = value.toFixed(1);
  } else {
    cfg.displayValue = value.toFixed(2);
  }

  const bubble = document.querySelector(
    `.metric-value-bubble[data-metric-key="${key}"]`
  );
  if (bubble) {
    bubble.textContent = cfg.displayValue;
  }

  const asofEl = document.querySelector(
    `.metric-asof[data-metric-key="${key}"]`
  );
  if (asofEl && cfg.asOf) {
    asofEl.textContent = `As of: ${cfg.asOf}`;
  }

  const gaugeContainer = document.getElementById(`gauge-${key}`);
  if (gaugeContainer) {
    updateGaugeNeedle(gaugeContainer, cfg.value, cfg.segments);
  }
}
