/**
 * Custom Collapse/Expand Module
 * Adds "Collapse All" and "Expand All" to the top of the View menu.
 * Wraps heading sections so individual headings can also be toggled
 * by clicking them directly in the rendered document.
 *
 * Overlay file — never touched by upstream merges.
 * Load after renderer.js in index.html.
 */

(function initCustomCollapse() {
  "use strict";

  // ── Section wrapping ───────────────────────────────────────────────────────
  // After each render, group content following each heading into a
  // .section-content wrapper so we can collapse/expand it.

  function wrapSections() {
    const viewer = document.getElementById("viewer");
    if (!viewer) return;

    const headings = viewer.querySelectorAll("h1,h2,h3,h4,h5,h6");
    headings.forEach((heading) => {
      // Skip if already wrapped during a previous render
      if (heading.dataset.collapsible) return;
      heading.dataset.collapsible = "true";

      // Collect all following siblings until the next heading
      const siblings = [];
      let next = heading.nextElementSibling;
      while (next && !next.matches("h1,h2,h3,h4,h5,h6")) {
        siblings.push(next);
        next = next.nextElementSibling;
      }
      if (siblings.length === 0) return;

      // Wrap siblings in a collapsible container
      const wrapper = document.createElement("div");
      wrapper.className = "section-content";
      heading.parentNode.insertBefore(wrapper, siblings[0]);
      siblings.forEach((el) => wrapper.appendChild(el));

      // Clicking the heading toggles its section
      heading.addEventListener("click", (e) => {
        // Only toggle if the click is directly on the heading, not a child link
        if (e.target.tagName === "A") return;
        wrapper.classList.toggle("collapsed");
        heading.classList.toggle("section-collapsed");
      });
    });
  }

  // ── Collapse / Expand all ─────────────────────────────────────────────────

  function collapseAll() {
    document
      .querySelectorAll("#viewer .section-content")
      .forEach((el) => el.classList.add("collapsed"));
    document
      .querySelectorAll("#viewer [data-collapsible]")
      .forEach((el) => el.classList.add("section-collapsed"));
  }

  function expandAll() {
    document
      .querySelectorAll("#viewer .section-content")
      .forEach((el) => el.classList.remove("collapsed"));
    document
      .querySelectorAll("#viewer [data-collapsible]")
      .forEach((el) => el.classList.remove("section-collapsed"));
  }

  // ── Inject View menu items ────────────────────────────────────────────────

  function injectViewMenuItems() {
    const viewMenu = document.getElementById("viewMenu");
    if (!viewMenu || document.getElementById("collapseAllBtn")) return;

    const collapseSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
      <line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>`;
    const expandSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>`;

    const collapseItem = document.createElement("div");
    collapseItem.className = "tools-menu-item custom-collapse-item";
    collapseItem.id = "collapseAllBtn";
    collapseItem.innerHTML = `${collapseSvg}<span>Collapse All</span>`;
    collapseItem.addEventListener("click", (e) => {
      e.stopPropagation();
      collapseAll();
      setTimeout(() => document.body.click(), 10);
    });

    const expandItem = document.createElement("div");
    expandItem.className = "tools-menu-item custom-collapse-item";
    expandItem.id = "expandAllBtn";
    expandItem.innerHTML = `${expandSvg}<span>Expand All</span>`;
    expandItem.addEventListener("click", (e) => {
      e.stopPropagation();
      expandAll();
      setTimeout(() => document.body.click(), 10);
    });

    const separator = document.createElement("div");
    separator.className = "tools-menu-separator";

    // Prepend: Collapse All, Expand All, separator, then existing items
    viewMenu.prepend(separator);
    viewMenu.prepend(expandItem);
    viewMenu.prepend(collapseItem);
  }

  // ── Re-wrap after each document render ───────────────────────────────────
  // Watch only direct children of #viewer so our own DOM mutations
  // (wrapping siblings) don't re-trigger the observer.

  function observeViewer() {
    const viewer = document.getElementById("viewer");
    if (!viewer) return;

    let wrapTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(wrapTimer);
      wrapTimer = setTimeout(wrapSections, 200);
    });
    observer.observe(viewer, { childList: true });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    injectViewMenuItems();
    observeViewer();
    // Wrap any content already present (e.g. restored from tabs)
    wrapSections();
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
