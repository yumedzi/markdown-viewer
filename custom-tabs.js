/**
 * Custom Tabs Functionality
 * This module adds tab management to the markdown viewer.
 * Can be easily reapplied after upstream merges.
 * 
 * Load this after renderer.js in index.html
 */

(function() {
  'use strict';

  // Get DOM elements for tabs
  const tabsContainer = document.getElementById('tabsContainer');
  const tabsElement = document.getElementById('tabs');
  const fileInfoBar = document.getElementById('fileInfoBar');

  // Tab management state
  let tabs = [];
  let activeTabId = null;
  let tabIdCounter = 0;

  // ============================================
  // Tab Management Functions
  // ============================================

  function createTab(filePath, content) {
    const tabId = ++tabIdCounter;
    const pathParts = filePath.split(/[\\/]/);
    const filename = pathParts[pathParts.length - 1];

    const tab = {
      id: tabId,
      filePath: filePath,
      filename: filename,
      content: content,
      originalContent: content,
      hasUnsavedChanges: false,
      scrollPosition: 0
    };

    tabs.push(tab);
    console.log('[CustomTabs] Created tab:', filename, 'Total tabs:', tabs.length);
    renderTabs();
    switchToTab(tabId);
    saveTabs();

    return tab;
  }

  function renderTabs() {
    console.log('[CustomTabs] Rendering tabs, count:', tabs.length);

    if (tabs.length === 0) {
      tabsContainer.style.display = 'none';
      fileInfoBar.style.display = 'none';
      return;
    }

    // Show tabs when 2+ files open, otherwise show file info bar
    if (tabs.length >= 2) {
      tabsContainer.style.display = 'flex';
      fileInfoBar.style.display = 'none';
    } else {
      tabsContainer.style.display = 'none';
      fileInfoBar.style.display = 'flex';
    }

    // Clear and rebuild tabs
    tabsElement.innerHTML = '';

    tabs.forEach(tab => {
      const tabElement = document.createElement('div');
      tabElement.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
      tabElement.dataset.tabId = tab.id;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.filename;
      titleSpan.title = tab.filePath;

      const closeButton = document.createElement('span');
      closeButton.className = 'tab-close';
      closeButton.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>';
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });

      tabElement.appendChild(titleSpan);

      if (tab.hasUnsavedChanges) {
        const unsavedDot = document.createElement('span');
        unsavedDot.className = 'tab-unsaved';
        tabElement.appendChild(unsavedDot);
      }

      tabElement.appendChild(closeButton);

      tabElement.addEventListener('click', () => {
        switchToTab(tab.id);
      });

      tabsElement.appendChild(tabElement);
    });
  }

  function switchToTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Save current tab state
    if (activeTabId) {
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab && window.viewer) {
        currentTab.scrollPosition = window.viewer.scrollTop;
        if (window.isEditMode && window.markdownEditor) {
          currentTab.content = window.markdownEditor.value;
        }
      }
    }

    activeTabId = tabId;
    console.log('[CustomTabs] Switched to tab:', tab.filename);

    // Update UI
    renderTabs();
    
    // Update file info if present
    if (window.updateFileInfo) {
      window.updateFileInfo(tab.filePath);
    }
    
    // Set global current file path
    window.currentFilePath = tab.filePath;
    
    // Render content
    if (window.renderMarkdown) {
      window.renderMarkdown(tab.content).then(() => {
        if (window.viewer) {
          window.viewer.scrollTop = tab.scrollPosition;
        }
      });
    }

    // Update editor if in edit mode
    if (window.isEditMode && window.markdownEditor) {
      window.markdownEditor.value = tab.content;
    }

    // Notify main process
    if (window.ipcRenderer) {
      window.ipcRenderer.send('set-active-file', tab.filePath);
    }

    saveTabs();
  }

  function closeTab(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = tabs[tabIndex];

    // Check for unsaved changes
    if (tab.hasUnsavedChanges) {
      const userConfirmed = confirm(`"${tab.filename}" has unsaved changes. Close anyway?`);
      if (!userConfirmed) return;
    }

    console.log('[CustomTabs] Closing tab:', tab.filename);
    tabs.splice(tabIndex, 1);

    // Switch to another tab if closing active
    if (tab.id === activeTabId) {
      if (tabs.length > 0) {
        const newActiveTab = tabs[Math.max(0, tabIndex - 1)];
        switchToTab(newActiveTab.id);
      } else {
        activeTabId = null;
        if (window.viewer) {
          window.viewer.innerHTML = `
            <div class="welcome">
              <h1>Welcome to Markdown Viewer</h1>
              <p>Press <kbd>Ctrl+O</kbd> to open a markdown file</p>
            </div>
          `;
        }
        if (window.updateFileInfo) {
          window.updateFileInfo(null);
        }
      }
    }

    renderTabs();
    saveTabs();
  }

  function updateTabContent(content, hasChanges) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      tab.content = content;
      tab.hasUnsavedChanges = hasChanges;
      renderTabs();
      saveTabs();
    }
  }

  function saveTabs() {
    const tabsData = tabs.map(tab => ({
      filePath: tab.filePath,
      scrollPosition: tab.scrollPosition
    }));
    localStorage.setItem('openTabs', JSON.stringify(tabsData));
    localStorage.setItem('activeTabId', activeTabId);
    console.log('[CustomTabs] Saved tabs to localStorage');
  }

  function loadSavedTabs() {
    try {
      const savedTabs = localStorage.getItem('openTabs');
      const savedActiveTabId = localStorage.getItem('activeTabId');
      
      if (savedTabs) {
        const tabsData = JSON.parse(savedTabs);
        console.log('[CustomTabs] Restoring', tabsData.length, 'tabs');
        
        if (window.ipcRenderer && tabsData.length > 0) {
          window.ipcRenderer.send('restore-tabs', tabsData);
        }
      }
    } catch (error) {
      console.error('[CustomTabs] Error loading saved tabs:', error);
    }
  }

  function findTabByPath(filePath) {
    return tabs.find(t => t.filePath === filePath);
  }

  function getActiveTab() {
    return tabs.find(t => t.id === activeTabId);
  }

  // ============================================
  // Intercept file-opened events
  // ============================================

  if (window.ipcRenderer) {
    // Store original listener
    const originalListeners = window.ipcRenderer._events ? 
      window.ipcRenderer._events['file-opened'] : null;

    // Remove existing listeners and add our interceptor
    window.ipcRenderer.removeAllListeners('file-opened');
    
    window.ipcRenderer.on('file-opened', (event, data) => {
      console.log('[CustomTabs] Intercepted file-opened:', data.path);
      
      const { content, path: filePath, allPaths } = data;
      
      // Check if file already open
      const existingTab = findTabByPath(filePath);
      if (existingTab) {
        console.log('[CustomTabs] File already open, switching to tab');
        switchToTab(existingTab.id);
        return;
      }

      // Create new tab
      createTab(filePath, content);
      
      // If multiple files selected, open them all
      if (allPaths && allPaths.length > 1) {
        allPaths.slice(1).forEach(path => {
          if (!findTabByPath(path) && window.fs) {
            try {
              const fileContent = window.fs.readFileSync(path, 'utf8');
              createTab(path, fileContent);
            } catch (error) {
              console.error('[CustomTabs] Error loading file:', path, error);
            }
          }
        });
      }
    });
  }

  // ============================================
  // Export API
  // ============================================

  window.CustomTabs = {
    createTab,
    switchToTab,
    closeTab,
    updateTabContent,
    renderTabs,
    findTabByPath,
    getActiveTab,
    getTabs: () => tabs,
    getActiveTabId: () => activeTabId
  };

  // ============================================
  // Initialize
  // ============================================

  console.log('[CustomTabs] Module loaded');
  
  // Load saved tabs on startup
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[CustomTabs] DOM loaded, restoring tabs');
    loadSavedTabs();
  });

  // If DOM already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadSavedTabs, 100);
  }

})();
