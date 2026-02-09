// ============================================
// mermaid-config.js - Mermaid Theme Configuration
// ============================================

/**
 * Light theme variables for Mermaid diagrams
 */
const MERMAID_LIGHT_THEME = {
  primaryColor: '#279EA7',
  primaryTextColor: '#1F3244',
  primaryBorderColor: '#279EA7',
  lineColor: '#279EA7',
  secondaryColor: '#1F3244',
  tertiaryColor: '#f5f5f5',
  background: '#ffffff',
  mainBkg: '#ffffff',
  secondBkg: '#f5f5f5',
  textColor: '#1F3244',
  border1: '#d0d0d0',
  border2: '#d0d0d0',
  fontSize: '13px',
  fontFamily: 'Fira Code Local, Fira Code, Segoe UI, Calibri, Arial, sans-serif'
};

/**
 * Dark theme variables for Mermaid diagrams
 */
const MERMAID_DARK_THEME = {
  primaryColor: '#3DBDC6',
  primaryTextColor: '#e8e8e8',
  primaryBorderColor: '#3DBDC6',
  lineColor: '#3DBDC6',
  secondaryColor: '#2d2d2d',
  tertiaryColor: '#1a1a1a',
  background: '#242424',
  mainBkg: '#242424',
  secondBkg: '#2d2d2d',
  textColor: '#e8e8e8',
  border1: '#404040',
  border2: '#404040',
  fontSize: '13px',
  fontFamily: 'Fira Code Local, Fira Code, Segoe UI, Calibri, Arial, sans-serif'
};

/**
 * Get full Mermaid configuration object
 * @param {boolean} isDark - Whether dark mode is enabled
 * @returns {object} Mermaid configuration object
 */
function getMermaidConfig(isDark) {
  return {
    startOnLoad: true,
    theme: isDark ? 'dark' : 'default',
    themeVariables: isDark ? MERMAID_DARK_THEME : MERMAID_LIGHT_THEME
  };
}

// Export for use in other modules
module.exports = {
  MERMAID_LIGHT_THEME,
  MERMAID_DARK_THEME,
  getMermaidConfig
};
