// ============================================
// omniware-config.js - OmniWare Dark Mode Configuration
// ============================================

/**
 * CSS variable overrides for OmniWare wireframes in dark mode.
 * These override the --ow-* variables defined in omniware.js.
 */
const OMNIWARE_DARK_CSS = `
  .ow-page {
    --ow-bg: #2d2d2d;
    --ow-paper: #1a1a1a;
    --ow-border: #888888;
    --ow-border-light: #555555;
    --ow-text: #e0e0e0;
    --ow-text-light: #aaaaaa;
    --ow-grid: #3a3a3a;
    --ow-green-lt: #1a3a24;
    --ow-red-lt: #3a1a1a;
    --ow-yellow-lt: #3a3018;
    --ow-blue-lt: #1a2a3a;
    --ow-purple-lt: #2a2040;
    --ow-gray-lt: #333333;
  }
  .ow-page .ow-page-inner {
    background: var(--ow-paper);
  }
  .ow-page .ow-section-title {
    background: #2a2a2a;
  }
  .ow-page .ow-table th {
    background: #2a2a2a;
  }
  .ow-page .ow-table tr:hover td {
    background: #252525;
  }
  .ow-page .ow-form-input,
  .ow-page .ow-form-textarea,
  .ow-page .ow-form-file {
    background: #252525;
    color: var(--ow-text);
    border-color: var(--ow-border-light);
  }
  .ow-page .ow-form-input-readonly {
    background: #2a2a2a;
  }
  .ow-page .ow-footer {
    background: #1e1e1e;
  }
  .ow-page .ow-placeholder {
    background: repeating-linear-gradient(45deg, #2a2a2a, #2a2a2a 10px, #333333 10px, #333333 20px);
  }
  .ow-page .ow-formula {
    background: #252530;
  }
  .ow-page .ow-locked-overlay {
    background: rgba(0,0,0,0.6);
  }
  .ow-page .ow-note-info {
    background: #2a2818;
    border-color: #8a7e2f;
    color: #d4c85a;
  }
`;

/**
 * Get OmniWare dark mode CSS string
 * @param {boolean} isDark - Whether dark mode is enabled
 * @returns {string} CSS string to inject, or empty string for light mode
 */
function getOmniWareDarkCSS(isDark) {
  return isDark ? OMNIWARE_DARK_CSS : '';
}

// Export for use in other modules
module.exports = {
  OMNIWARE_DARK_CSS,
  getOmniWareDarkCSS
};
