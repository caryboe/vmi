/**
 * Create an SVG gauge (semi-circle) as a string.
 * @param {Object} cfg
 * @param {string} cfg.id - unique id for gradient, etc.
 * @param {boolean} cfg.neutral - if true, use neutral arc and no gradient.
 * @returns {string} SVG markup
 */
function createGaugeSvg(cfg) {
  const id = cfg.id;
  const neutral = !!cfg.neutral;

  const gradientId = `gaugeGradient-${id}`;

  // ViewBox: 0,0,200,120
  // Arc path: from (20,100) to (180,100) with radius 80 (top semi-circle)
  const defs = neutral
    ? ""
    : `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#22c55e"/>
        <stop offset="50%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#ef4444"/>
      </linearGradient>
    </defs>`;

  const arcStroke = neutral ? "#50627a" : `url(#${gradientId})`;

  return `
    <svg viewBox="0 0 200 120" class="gauge-svg" style="font-family: Arial, sans-serif;">
      ${defs}
      <!-- Outline -->
      <path
        class="gauge-arc-outline"
        d="M20 100 A80 80 0 0 1 180 100"
      ></path>
      <!-- Colored/neutral arc -->
      <path
        class="gauge-arc-fill ${neutral ? "gauge-arc-neutral" : ""}"
        d="M20 100 A80 80 0 0 1 180 100"
        stroke="${arcStroke}"
      ></path>

      <!-- Needle group (center at 100,100) -->
      <g class="gauge-needle" transform="rotate(0 100 100)">
        <line x1="100" y1="100" x2="100" y2="25"></line>
        <circle class="gauge-needle-center" cx="100" cy="100" r="6"></circle>
      </g>
    </svg>
  `;
}

/**
 * Update needle rotation based on a set of numeric→angle segments.
 * Each segment: { min, max, angleFrom, angleTo }
 * Segments must be sorted by min ascending and non-overlapping.
 */
function updateGaugeNeedle(gaugeContainer, value, segments) {
  const svg = gaugeContainer.querySelector("svg");
  if (!svg || !segments || !segments.length) return;

  const needle = svg.querySelector(".gauge-needle");
  if (!needle) return; // neutral/zero-state SVG has no needle

  // Clamp below lowest segment
  if (value <= segments[0].min) {
    const a = segments[0].angleFrom;
    needle.setAttribute("transform", `rotate(${a} 100 100)`);
    return;
  }

  // Clamp above highest segment
  const last = segments[segments.length - 1];
  if (value >= last.max) {
    const a = last.angleTo;
    needle.setAttribute("transform", `rotate(${a} 100 100)`);
    return;
  }

  // Find segment where min <= value <= max
  let seg = null;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (value >= s.min && value <= s.max) {
      seg = s;
      break;
    }
  }

  if (!seg) {
    // Fallback: if somehow not found, just don't move
    return;
  }

  const { min, max, angleFrom, angleTo } = seg;
  const span = max - min;
  if (span <= 0) {
    // Avoid division by zero
    needle.setAttribute("transform", `rotate(${angleFrom} 100 100)`);
    return;
  }

  const t = (value - min) / span; // 0..1 within this band
  const angle = angleFrom + t * (angleTo - angleFrom);

  needle.setAttribute("transform", `rotate(${angle} 100 100)`);
}

// ============================================
// MOBILE GAUGE TEXT SIZE FIX
// ============================================

/**
 * Adjust gauge text sizes for mobile devices
 */
function adjustGaugeForMobile() {
  // Only apply on mobile screens
  if (window.innerWidth <= 768) {
    console.log('📱 Applying mobile gauge text adjustments');
    
    // Fix value bubbles (the numbers like "15.4", "23%", etc.)
    document.querySelectorAll('.metric-value-bubble').forEach(bubble => {
      bubble.style.fontSize = '16px';
      bubble.style.fontWeight = '700';
      bubble.style.color = '#111827'; // Dark text
      bubble.style.textShadow = '0 1px 1px rgba(255, 255, 255, 0.8)';
    });
    
    // Also fix "As of:" dates
    document.querySelectorAll('.metric-asof').forEach(date => {
      date.style.fontSize = '12px';
      date.style.fontWeight = '600';
      date.style.color = '#374151'; // Dark gray
    });
    
    // Fix thresholds text
    document.querySelectorAll('.metric-thresholds').forEach(threshold => {
      threshold.style.fontSize = '11px';
      threshold.style.color = '#4b5563'; // Dark gray
    });
    
    // Also fix any text inside SVGs (if there is any)
    document.querySelectorAll('.gauge-svg text').forEach(text => {
      text.style.fontSize = '14px';
      text.style.fontWeight = '600';
      text.style.fill = '#111827';
      text.style.textShadow = '0 1px 1px rgba(255, 255, 255, 0.8)';
    });
  }
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', adjustGaugeForMobile);
} else {
  adjustGaugeForMobile();
}

// Also run when window resizes
window.addEventListener('resize', adjustGaugeForMobile);

// Run after a delay in case gauges load dynamically
setTimeout(adjustGaugeForMobile, 1000);