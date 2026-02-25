/**
 * Custom Theme Selector
 * Replaces the upstream binary Dark Mode toggle with a three-way submenu:
 *   Light | Dark | Follow Desktop
 *
 * Overlay file — safe across upstream merges.
 * Load after renderer.js in index.html.
 *
 * Strategy: keep the original #darkModeToggle hidden but intact so its click
 * handler (which re-renders Mermaid diagrams, updates OmniWare, etc.) is still
 * called when we need to actually change the theme.  We only trigger it when
 * the desired state differs from the current state.
 */

(function initCustomTheme() {
  "use strict";

  const PREF_KEY = "themeMode"; // 'light' | 'dark' | 'desktop'

  // ─── Apply a theme mode ────────────────────────────────────────────────────

  function applyTheme(mode) {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const wantDark = mode === "dark" || (mode === "desktop" && prefersDark);
    const isDark = document.body.classList.contains("dark-mode");

    localStorage.setItem(PREF_KEY, mode);

    // Delegate to the original toggle so Mermaid / OmniWare side-effects run
    if (wantDark !== isDark) {
      const toggle = document.getElementById("darkModeToggle");
      if (toggle) toggle.click();
    }

    // Mark the active option in our submenu
    document.querySelectorAll(".custom-theme-option").forEach((el) => {
      el.classList.toggle("active", el.dataset.mode === mode);
    });
  }

  // ─── Build the replacement submenu ────────────────────────────────────────

  function buildThemeMenuItem() {
    const item = document.createElement("div");
    item.className = "tools-menu-item has-submenu";
    item.id = "customThemeMenuItem";

    item.innerHTML = `
      <span>Theme</span>
      <span class="submenu-arrow">›</span>
      <div class="tools-submenu" id="customThemeSubmenu">
        <div class="tools-submenu-item custom-theme-option" data-mode="light">Light</div>
        <div class="tools-submenu-item custom-theme-option" data-mode="dark">Dark</div>
        <div class="tools-submenu-item custom-theme-option" data-mode="desktop">Follow Desktop</div>
      </div>
    `;

    const submenu = item.querySelector("#customThemeSubmenu");

    // ── JS-controlled hover with a grace-period delay ──────────────────────
    // Pure CSS :hover fires the submenu close the instant the mouse crosses
    // the 4 px gap between the parent item and the submenu panel.
    // Using mouseenter/mouseleave + a 200 ms timeout gives the user time to
    // move diagonally without the panel vanishing.
    let hideTimer = null;

    function showSubmenu() {
      clearTimeout(hideTimer);
      item.classList.add("theme-open");
    }

    function scheduleHide() {
      hideTimer = setTimeout(() => item.classList.remove("theme-open"), 200);
    }

    item.addEventListener("mouseenter", showSubmenu);
    item.addEventListener("mouseleave", scheduleHide);
    submenu.addEventListener("mouseenter", showSubmenu); // keep open while inside panel
    submenu.addEventListener("mouseleave", scheduleHide);

    item.querySelectorAll(".custom-theme-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        applyTheme(opt.dataset.mode);
        item.classList.remove("theme-open");
        // Close the parent dropdown by simulating an outside click
        setTimeout(() => document.body.click(), 10);
      });
    });

    return item;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    const originalToggle = document.getElementById("darkModeToggle");
    if (!originalToggle || document.getElementById("customThemeMenuItem"))
      return;

    // Hide the upstream toggle — our submenu replaces it in the UI
    originalToggle.style.display = "none";

    // Insert the new submenu item right before the hidden toggle
    const themeMenuItem = buildThemeMenuItem();
    originalToggle.parentNode.insertBefore(themeMenuItem, originalToggle);

    // React to OS theme changes when the user has chosen "Follow Desktop"
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if ((localStorage.getItem(PREF_KEY) || "desktop") === "desktop") {
          applyTheme("desktop");
        }
      });

    // Restore saved preference.
    // Migrate from the legacy 'darkMode' key if 'themeMode' was never set.
    let saved = localStorage.getItem(PREF_KEY);
    if (!saved) {
      const legacy = localStorage.getItem("darkMode");
      saved =
        legacy === "enabled"
          ? "dark"
          : legacy === "disabled"
            ? "light"
            : "desktop";
    }
    applyTheme(saved);
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(init, 150);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
