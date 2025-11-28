const { ipcRenderer, shell } = require('electron');

// Libraries loaded from CDN in index.html
// marked, mermaid, and DOMPurify are available globally

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  themeVariables: {
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
  }
});

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
  sanitize: false
});

// Zoom level
let zoomLevel = 100;
const zoomStep = 10;
const minZoom = 50;
const maxZoom = 200;

// DOM Elements
const viewer = document.getElementById('viewer');
const openFileBtn = document.getElementById('openFile');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');
const fullscreenToggle = document.getElementById('fullscreenToggle');
const toggleRecentBtn = document.getElementById('toggleRecent');
const closeRecentBtn = document.getElementById('closeRecent');
const recentPanel = document.getElementById('recentPanel');
const recentList = document.getElementById('recentList');
const logoLink = document.getElementById('logoLink');
const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');
const searchCounter = document.getElementById('searchCounter');
const searchPrevBtn = document.getElementById('searchPrev');
const searchNextBtn = document.getElementById('searchNext');
const searchCloseBtn = document.getElementById('searchClose');
const toggleIndexBtn = document.getElementById('toggleIndex');
const closeIndexBtn = document.getElementById('closeIndex');
const indexPanel = document.getElementById('indexPanel');
const indexList = document.getElementById('indexList');
const fileInfoBar = document.getElementById('fileInfoBar');
const fileName = document.getElementById('fileName');
const filePath = document.getElementById('filePath');
const exportPdfBtn = document.getElementById('exportPdf');
const toggleEditBtn = document.getElementById('toggleEdit');
const editorPanel = document.getElementById('editorPanel');
const markdownEditor = document.getElementById('markdownEditor');
const saveButton = document.getElementById('saveButton');
const unsavedIndicator = document.getElementById('unsavedIndicator');
const contentWrapper = document.querySelector('.content-wrapper');

// Current file tracking
let currentFilePath = null;

// Editor state
let isEditMode = false;
let hasUnsavedChanges = false;
let originalMarkdown = '';
let previewDebounceTimer = null;
const PREVIEW_DEBOUNCE_DELAY = 3000; // 3 seconds

// Update file info display
function updateFileInfo(path) {
  if (!path) {
    fileInfoBar.style.display = 'none';
    currentFilePath = null;
    return;
  }

  currentFilePath = path;
  const pathParts = path.split(/[\\/]/);
  const name = pathParts.pop();
  const directory = pathParts.join('/');

  fileName.textContent = name;
  filePath.textContent = directory;
  fileInfoBar.style.display = 'flex';
}

// Copy path to clipboard on click
filePath.addEventListener('click', () => {
  if (currentFilePath) {
    navigator.clipboard.writeText(currentFilePath).then(() => {
      // Visual feedback
      const originalText = filePath.textContent;
      filePath.textContent = '✓ Path copied to clipboard';
      filePath.style.color = 'var(--primary-color)';
      setTimeout(() => {
        const pathParts = currentFilePath.split(/[\\/]/);
        pathParts.pop(); // Remove filename
        filePath.textContent = pathParts.join('/');
        filePath.style.color = '';
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy path:', err);
    });
  }
});

// Update zoom display
function updateZoom() {
  viewer.style.fontSize = `${zoomLevel}%`;
  zoomResetBtn.textContent = `${zoomLevel}%`;
}

// Zoom controls
zoomInBtn.addEventListener('click', () => {
  if (zoomLevel < maxZoom) {
    zoomLevel += zoomStep;
    updateZoom();
  }
});

zoomOutBtn.addEventListener('click', () => {
  if (zoomLevel > minZoom) {
    zoomLevel -= zoomStep;
    updateZoom();
  }
});

zoomResetBtn.addEventListener('click', () => {
  zoomLevel = 100;
  updateZoom();
});

// Fullscreen toggle
fullscreenToggle.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

// Logo link - open website
logoLink.addEventListener('click', (e) => {
  e.preventDefault();
  shell.openExternal('https://www.omnicore.com.tr');
});

// Open file button
openFileBtn.addEventListener('click', () => {
  ipcRenderer.send('open-file-dialog');
});

// Export to PDF button
exportPdfBtn.addEventListener('click', () => {
  if (!currentFilePath) {
    alert('Please open a markdown file first before exporting to PDF.');
    return;
  }

  const pathParts = currentFilePath.split(/[\\/]/);
  const currentFileName = pathParts.pop();

  ipcRenderer.send('export-pdf', { currentFileName });
});

// Show notification toast
function showNotification(message, duration = 3000) {
  const toast = document.getElementById('notificationToast');
  const messageEl = document.getElementById('notificationMessage');

  messageEl.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Handle PDF export result
ipcRenderer.on('pdf-export-result', (event, data) => {
  if (data.success) {
    console.log('PDF exported successfully to:', data.path);
    const fileName = data.path.split(/[\\/]/).pop();
    showNotification(`PDF exported: ${fileName}`);
  } else {
    console.error('PDF export failed:', data.error);
    alert(`Failed to export PDF: ${data.error}`);
  }
});

// Toggle edit mode
toggleEditBtn.addEventListener('click', () => {
  if (isEditMode && hasUnsavedChanges) {
    if (!confirm('You have unsaved changes. Exit edit mode anyway?')) {
      return;
    }
  }

  isEditMode = !isEditMode;

  if (isEditMode) {
    // Enter edit mode
    contentWrapper.classList.add('split-view');
    markdownEditor.value = originalMarkdown;
    hasUnsavedChanges = false;
    updateUnsavedIndicator();
    toggleEditBtn.style.background = 'var(--primary-color)';
    toggleEditBtn.style.color = '#ffffff';
  } else {
    // Exit edit mode
    contentWrapper.classList.remove('split-view');
    toggleEditBtn.style.background = '';
    toggleEditBtn.style.color = '';
    clearTimeout(previewDebounceTimer);
  }
});

// Live preview with 3-second debounce
markdownEditor.addEventListener('input', () => {
  if (!isEditMode) return;

  hasUnsavedChanges = (markdownEditor.value !== originalMarkdown);
  updateUnsavedIndicator();

  // Clear existing timer
  clearTimeout(previewDebounceTimer);

  // Set new timer for 3 seconds
  previewDebounceTimer = setTimeout(() => {
    renderMarkdown(markdownEditor.value);
  }, PREVIEW_DEBOUNCE_DELAY);
});

// Save file
function saveMarkdownFile() {
  if (!currentFilePath) {
    alert('No file is currently open.');
    return;
  }

  const content = markdownEditor.value;
  ipcRenderer.send('save-markdown-file', {
    filePath: currentFilePath,
    content: content
  });
}

// Save button click
saveButton.addEventListener('click', saveMarkdownFile);

// Ctrl+S keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditMode) {
    e.preventDefault();
    saveMarkdownFile();
  }
});

// Handle save result
ipcRenderer.on('save-markdown-result', (event, data) => {
  if (data.success) {
    originalMarkdown = markdownEditor.value;
    hasUnsavedChanges = false;
    updateUnsavedIndicator();
    console.log('File saved successfully');
  } else {
    console.error('Save failed:', data.error);
    alert(`Failed to save file: ${data.error}`);
  }
});

// Update unsaved indicator
function updateUnsavedIndicator() {
  if (hasUnsavedChanges) {
    unsavedIndicator.style.display = 'inline';
  } else {
    unsavedIndicator.style.display = 'none';
  }
}

// Recent files panel toggle
toggleRecentBtn.addEventListener('click', () => {
  recentPanel.classList.toggle('visible');
});

closeRecentBtn.addEventListener('click', () => {
  recentPanel.classList.remove('visible');
});

// Clear all recent files
const clearAllRecentBtn = document.getElementById('clearAllRecent');
clearAllRecentBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all recent files?')) {
    localStorage.removeItem('recentFiles');
    updateRecentFilesList();
  }
});

// Mouse hover to open recent panel
let mouseHoverTimeout = null;
const HOVER_TRIGGER_ZONE = 10; // pixels from left edge
const HOVER_DELAY = 500; // milliseconds

document.addEventListener('mousemove', (e) => {
  // Check if mouse is near the left edge
  if (e.clientX <= HOVER_TRIGGER_ZONE) {
    // Start timeout if not already started
    if (!mouseHoverTimeout && !recentPanel.classList.contains('visible')) {
      mouseHoverTimeout = setTimeout(() => {
        recentPanel.classList.add('visible');
        mouseHoverTimeout = null;
      }, HOVER_DELAY);
    }
  } else {
    // Clear timeout if mouse moves away
    if (mouseHoverTimeout) {
      clearTimeout(mouseHoverTimeout);
      mouseHoverTimeout = null;
    }
  }
});

// Recent files management
const MAX_RECENT_FILES = 100;

function getRecentFiles() {
  try {
    const recent = localStorage.getItem('recentFiles');
    return recent ? JSON.parse(recent) : [];
  } catch (e) {
    console.error('Error loading recent files:', e);
    return [];
  }
}

function saveRecentFile(filePath) {
  try {
    let recentFiles = getRecentFiles();

    // Remove if already exists
    recentFiles = recentFiles.filter(f => f.path !== filePath);

    // Add to beginning
    recentFiles.unshift({
      path: filePath,
      name: filePath.split(/[\\/]/).pop(),
      timestamp: Date.now()
    });

    // Keep only MAX_RECENT_FILES
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);

    localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
    updateRecentFilesList();
  } catch (e) {
    console.error('Error saving recent file:', e);
  }
}

function updateRecentFilesList() {
  const recentFiles = getRecentFiles();

  if (recentFiles.length === 0) {
    recentList.innerHTML = '<div class="recent-empty">No recent files</div>';
    return;
  }

  recentList.innerHTML = '';

  recentFiles.forEach(file => {
    const item = document.createElement('div');
    item.className = 'recent-item';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'recent-item-content';
    contentDiv.innerHTML = `
      <div class="recent-item-name">${file.name}</div>
      <div class="recent-item-path">${file.path}</div>
    `;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'recent-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove from recent files';

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent opening the file
      let recentFiles = getRecentFiles();
      recentFiles = recentFiles.filter(f => f.path !== file.path);
      localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
      updateRecentFilesList();
    });

    contentDiv.addEventListener('click', () => {
      // Send request to main process to open this file
      const fs = require('fs');
      fs.readFile(file.path, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          // Remove from recent files if it doesn't exist
          let recentFiles = getRecentFiles();
          recentFiles = recentFiles.filter(f => f.path !== file.path);
          localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
          updateRecentFilesList();
          return;
        }
        // Store original markdown for editor
        originalMarkdown = data;

        // If in edit mode, update editor content
        if (isEditMode) {
          markdownEditor.value = originalMarkdown;
          hasUnsavedChanges = false;
          updateUnsavedIndicator();
        }

        renderMarkdown(data);
        updateFileInfo(file.path);
        saveRecentFile(file.path);
        recentPanel.classList.remove('visible');
      });
    });

    item.appendChild(contentDiv);
    item.appendChild(deleteBtn);
    recentList.appendChild(item);
  });
}

// Initialize recent files list
updateRecentFilesList();

// Search functionality
let searchMatches = [];
let currentMatchIndex = -1;

function clearSearchHighlights() {
  const highlights = viewer.querySelectorAll('.search-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
    parent.normalize();
  });
  searchMatches = [];
  currentMatchIndex = -1;
  updateSearchCounter();
}

function highlightSearchTerm(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) {
    clearSearchHighlights();
    return;
  }

  clearSearchHighlights();

  const textNodes = [];
  const walker = document.createTreeWalker(
    viewer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, svg, mermaid, and already highlighted nodes
        if (node.parentNode.tagName === 'SCRIPT' ||
            node.parentNode.tagName === 'STYLE' ||
            node.parentNode.tagName === 'SVG' ||
            node.parentNode.closest('.mermaid') ||
            node.parentNode.closest('svg') ||
            node.parentNode.classList?.contains('search-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }

  const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const matches = [...text.matchAll(searchRegex)];

    if (matches.length > 0) {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matches.forEach(match => {
        // Add text before match
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        // Add highlighted match
        const span = document.createElement('span');
        span.className = 'search-highlight';
        span.textContent = match[0];
        fragment.appendChild(span);
        searchMatches.push(span);

        lastIndex = match.index + match[0].length;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode.replaceChild(fragment, textNode);
    }
  });

  if (searchMatches.length > 0) {
    currentMatchIndex = 0;
    highlightCurrentMatch();
  }

  updateSearchCounter();
}

function highlightCurrentMatch() {
  searchMatches.forEach((match, index) => {
    if (index === currentMatchIndex) {
      match.classList.add('current');
      match.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      match.classList.remove('current');
    }
  });
}

function updateSearchCounter() {
  if (searchMatches.length > 0) {
    searchCounter.textContent = `${currentMatchIndex + 1} of ${searchMatches.length}`;
    searchPrevBtn.disabled = false;
    searchNextBtn.disabled = false;
  } else {
    searchCounter.textContent = '0 of 0';
    searchPrevBtn.disabled = true;
    searchNextBtn.disabled = true;
  }
}

function nextMatch() {
  if (searchMatches.length === 0) return;
  currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  highlightCurrentMatch();
  updateSearchCounter();
}

function previousMatch() {
  if (searchMatches.length === 0) return;
  currentMatchIndex = currentMatchIndex - 1;
  if (currentMatchIndex < 0) currentMatchIndex = searchMatches.length - 1;
  highlightCurrentMatch();
  updateSearchCounter();
}

function toggleSearchPanel() {
  const isVisible = searchPanel.classList.toggle('visible');
  if (isVisible) {
    searchInput.focus();
    searchInput.select();
  } else {
    clearSearchHighlights();
    searchInput.value = '';
  }
}

// Search event listeners
searchInput.addEventListener('input', (e) => {
  highlightSearchTerm(e.target.value);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      previousMatch();
    } else {
      nextMatch();
    }
  } else if (e.key === 'Escape') {
    toggleSearchPanel();
  }
});

searchNextBtn.addEventListener('click', nextMatch);
searchPrevBtn.addEventListener('click', previousMatch);
searchCloseBtn.addEventListener('click', toggleSearchPanel);

// Index/TOC functionality
function buildTableOfContents() {
  const headers = viewer.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (headers.length === 0) {
    indexList.innerHTML = '<div class="index-empty">No headers found</div>';
    return;
  }

  indexList.innerHTML = '';

  headers.forEach((header, index) => {
    // Add ID to header if it doesn't have one
    if (!header.id) {
      header.id = `header-${index}`;
    }

    const level = parseInt(header.tagName.substring(1));
    const item = document.createElement('div');
    item.className = `index-item level-${level}`;
    item.textContent = header.textContent;
    item.dataset.headerId = header.id;

    item.addEventListener('click', () => {
      const targetHeader = document.getElementById(header.id);
      if (targetHeader) {
        targetHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update active state
        document.querySelectorAll('.index-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }
    });

    indexList.appendChild(item);
  });
}

// Index panel toggle
toggleIndexBtn.addEventListener('click', () => {
  indexPanel.classList.toggle('visible');
});

closeIndexBtn.addEventListener('click', () => {
  indexPanel.classList.remove('visible');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'f':
      case 'F':
        e.preventDefault();
        toggleSearchPanel();
        break;
      case '+':
      case '=':
        e.preventDefault();
        if (zoomLevel < maxZoom) {
          zoomLevel += zoomStep;
          updateZoom();
        }
        break;
      case '-':
      case '_':
        e.preventDefault();
        if (zoomLevel > minZoom) {
          zoomLevel -= zoomStep;
          updateZoom();
        }
        break;
      case '0':
        e.preventDefault();
        zoomLevel = 100;
        updateZoom();
        break;
    }
  }
});

// Mouse wheel zoom
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();

    // Negative deltaY means scrolling up (zoom in)
    // Positive deltaY means scrolling down (zoom out)
    if (e.deltaY < 0) {
      // Zoom in
      if (zoomLevel < maxZoom) {
        zoomLevel += zoomStep;
        updateZoom();
      }
    } else if (e.deltaY > 0) {
      // Zoom out
      if (zoomLevel > minZoom) {
        zoomLevel -= zoomStep;
        updateZoom();
      }
    }
  }
}, { passive: false });

// Process markdown with Mermaid support
async function renderMarkdown(content) {
  // Remove BOM (Byte Order Mark) if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
  }

  // First, extract mermaid blocks and replace with placeholders
  const mermaidBlocks = [];
  let mermaidIndex = 0;

  // Replace mermaid code blocks with placeholders (handle both \n and \r\n)
  content = content.replace(/```mermaid[\r\n]+([\s\S]*?)```/g, (match, code) => {
    const placeholder = `MERMAID_PLACEHOLDER_${mermaidIndex}`;
    mermaidBlocks.push({ placeholder, code: code.trim() });
    mermaidIndex++;
    return placeholder;
  });

  // Parse markdown with marked (allows HTML)
  let html = marked.parse(content);

  // Sanitize HTML but allow most tags for rich content
  html = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'style'],
    ADD_ATTR: ['target', 'style', 'class', 'id']
  });

  // Replace placeholders with mermaid divs
  mermaidBlocks.forEach(({ placeholder, code }) => {
    const mermaidDiv = `<pre class="mermaid">${code}</pre>`;
    html = html.replace(placeholder, mermaidDiv);
  });

  // Set HTML content
  viewer.innerHTML = html;

  // Re-run mermaid on the new content
  try {
    const mermaidElements = viewer.querySelectorAll('.mermaid');
    if (mermaidElements.length > 0) {
      // Clear any existing IDs to prevent conflicts
      mermaidElements.forEach((el, index) => {
        el.removeAttribute('data-processed');
        el.id = `mermaid-${Date.now()}-${index}`;
      });

      // Render mermaid diagrams
      await mermaid.run({
        querySelector: '.mermaid',
        suppressErrors: false
      });

      // Add maximize buttons to rendered diagrams
      mermaidElements.forEach((el) => {
        const svg = el.querySelector('svg');
        if (svg) {
          // Wrap in container
          const container = document.createElement('div');
          container.className = 'mermaid-container';
          el.parentNode.insertBefore(container, el);
          container.appendChild(el);

          // Add maximize button
          const maxBtn = document.createElement('button');
          maxBtn.className = 'mermaid-maximize-btn';
          maxBtn.title = 'Open in new window';
          maxBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
          `;

          maxBtn.addEventListener('click', () => {
            const svgContent = svg.outerHTML;
            ipcRenderer.send('open-mermaid-popup', { svgContent });
          });

          container.appendChild(maxBtn);
        }
      });
    }
  } catch (error) {
    console.error('Mermaid rendering error:', error);
    // Show error in the diagram location
    const mermaidElements = viewer.querySelectorAll('.mermaid');
    mermaidElements.forEach(el => {
      if (!el.querySelector('svg')) {
        el.innerHTML = `<div style="color: red; padding: 20px; background: #ffe6e6; border: 1px solid #ff0000; border-radius: 4px;">
          <strong>Mermaid Rendering Error:</strong><br>${error.message}
        </div>`;
      }
    });
  }

  // Apply syntax highlighting with PrismJS
  if (typeof Prism !== 'undefined') {
    Prism.highlightAll();
  }

  // Add maximize buttons to tables
  addTableMaximizeButtons();

  // Build table of contents
  buildTableOfContents();

  // Scroll to top
  viewer.parentElement.scrollTop = 0;
}

// Add maximize buttons to tables for popup view
function addTableMaximizeButtons() {
  const tables = viewer.querySelectorAll('.markdown-body table, #viewer table');

  tables.forEach((table) => {
    // Skip if already wrapped
    if (table.parentNode.classList?.contains('table-container')) {
      return;
    }

    // Wrap in container
    const container = document.createElement('div');
    container.className = 'table-container';
    table.parentNode.insertBefore(container, table);
    container.appendChild(table);

    // Add maximize button
    const maxBtn = document.createElement('button');
    maxBtn.className = 'table-maximize-btn';
    maxBtn.title = 'Open in interactive popup';
    maxBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
      </svg>
    `;

    maxBtn.addEventListener('click', () => {
      // Extract table data
      const tableData = extractTableData(table);
      ipcRenderer.send('open-table-popup', { tableData });
    });

    container.appendChild(maxBtn);
  });
}

// Extract table data as structured JSON for Tabulator
function extractTableData(table) {
  const data = [];
  const columns = [];

  // Extract headers
  const headerRow = table.querySelector('thead tr, tr:first-child');
  if (headerRow) {
    const headers = headerRow.querySelectorAll('th, td');
    headers.forEach((header, index) => {
      const headerText = header.textContent.trim() || `Column ${index + 1}`;
      columns.push({
        title: headerText,
        field: `col${index}`,
        headerFilter: 'input',
        headerFilterPlaceholder: 'Filter...'
      });
    });
  }

  // Extract data rows
  const tbody = table.querySelector('tbody') || table;
  const rows = tbody.querySelectorAll('tr');

  rows.forEach((row, rowIndex) => {
    // Skip header row if no thead
    if (!table.querySelector('thead') && rowIndex === 0) {
      return;
    }

    const cells = row.querySelectorAll('td, th');
    if (cells.length > 0) {
      const rowData = {};
      cells.forEach((cell, index) => {
        rowData[`col${index}`] = cell.textContent.trim();
      });
      data.push(rowData);
    }
  });

  return { columns, data };
}

// Handle file opened
ipcRenderer.on('file-opened', async (event, data) => {
  // Store original markdown for editor
  originalMarkdown = data.content;

  // If in edit mode, update editor content
  if (isEditMode) {
    markdownEditor.value = originalMarkdown;
    hasUnsavedChanges = false;
    updateUnsavedIndicator();
  }

  await renderMarkdown(data.content);

  // Update file info bar
  updateFileInfo(data.path);

  // If multiple files were selected, add all to recent files
  if (data.allPaths && data.allPaths.length > 0) {
    data.allPaths.forEach(filePath => {
      saveRecentFile(filePath);
    });
  } else {
    // Fallback for single file (backwards compatibility)
    saveRecentFile(data.path);
  }
});

// Update zoom on load
updateZoom();
