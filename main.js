const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let fileToOpen = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    title: 'Omnicore Markdown Viewer',
    backgroundColor: '#f5f5f5',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'logo.ico')
  });

  mainWindow.loadFile('index.html');

  // Hide the menu bar
  mainWindow.setMenu(null);

  // Show window only when content is ready (prevents flicker)
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Load file from command line after window loads
  mainWindow.webContents.on('did-finish-load', () => {
    if (fileToOpen) {
      openFile(fileToOpen);
      fileToOpen = null;
    }
  });

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Register keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control || input.meta) {
      if (input.key === 'o' && input.type === 'keyDown') {
        event.preventDefault();
        openFileDialog();
      } else if (input.key === 'q' && input.type === 'keyDown') {
        event.preventDefault();
        app.quit();
      }
    }

    if (input.key === 'F11' && input.type === 'keyDown') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    } else if (input.key === 'Escape' && input.type === 'keyDown') {
      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
    }
  });
}

function openFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  // Ensure window is ready
  if (!mainWindow || !mainWindow.webContents) {
    console.error('Window not ready');
    return;
  }

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }
    // Remove BOM if present
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.substring(1);
    }
    mainWindow.webContents.send('file-opened', {
      content: data,
      path: filePath,
      allPaths: [filePath]
    });
  });
}

function openFileDialog() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mkdn'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePaths = result.filePaths;

      // Read the first file to display
      const firstFilePath = filePaths[0];
      fs.readFile(firstFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          return;
        }
        // Remove BOM if present
        if (data.charCodeAt(0) === 0xFEFF) {
          data = data.substring(1);
        }
        // Send first file content and all selected paths
        mainWindow.webContents.send('file-opened', {
          content: data,
          path: firstFilePath,
          allPaths: filePaths
        });
      });
    }
  }).catch(err => {
    console.error('Error opening file:', err);
  });
}

// Handle file open request from renderer
ipcMain.on('open-file-dialog', () => {
  openFileDialog();
});

// Handle PDF export request from renderer
ipcMain.on('export-pdf', async (event, data) => {
  try {
    const { currentFileName } = data;

    // Determine default filename
    let defaultFilename = 'document.pdf';
    if (currentFileName) {
      const nameWithoutExt = currentFileName.replace(/\.[^/.]+$/, '');
      defaultFilename = `${nameWithoutExt}.pdf`;
    }

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export to PDF',
      defaultPath: defaultFilename,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    // Generate PDF from current page
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      marginsType: 1, // Minimum margins
      pageSize: 'A4',
      preferCSSPageSize: false
    });

    // Write PDF to file
    fs.writeFile(result.filePath, pdfData, (err) => {
      if (err) {
        console.error('Error saving PDF:', err);
        mainWindow.webContents.send('pdf-export-result', {
          success: false,
          error: err.message
        });
      } else {
        console.log('PDF saved successfully:', result.filePath);
        mainWindow.webContents.send('pdf-export-result', {
          success: true,
          path: result.filePath
        });
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    mainWindow.webContents.send('pdf-export-result', {
      success: false,
      error: error.message
    });
  }
});

// Handle markdown file save request from renderer
ipcMain.on('save-markdown-file', (event, data) => {
  try {
    const { filePath, content } = data;

    if (!filePath) {
      mainWindow.webContents.send('save-markdown-result', {
        success: false,
        error: 'No file path provided'
      });
      return;
    }

    // Write file to disk
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) {
        console.error('Error saving file:', err);
        mainWindow.webContents.send('save-markdown-result', {
          success: false,
          error: err.message
        });
      } else {
        console.log('File saved successfully:', filePath);
        mainWindow.webContents.send('save-markdown-result', {
          success: true,
          path: filePath
        });
      }
    });
  } catch (error) {
    console.error('Error in save handler:', error);
    mainWindow.webContents.send('save-markdown-result', {
      success: false,
      error: error.message
    });
  }
});

// Handle Mermaid diagram popup request
ipcMain.on('open-mermaid-popup', (event, data) => {
  const { svgContent } = data;

  // Create popup window
  const popupWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'Mermaid Diagram - Zoom with mouse wheel, Pan by dragging',
    icon: path.join(__dirname, 'logo.ico')
  });

  popupWindow.setMenu(null);

  // Write a temporary HTML file
  const tempHtmlPath = path.join(__dirname, 'temp-mermaid.html');

  // Create HTML with pan/zoom using matrix transform approach
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mermaid Diagram</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #f0f0f0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .ui-overlay {
            position: absolute;
            top: 20px;
            left: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            pointer-events: auto;
            z-index: 10;
        }
        h1 {
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #333;
        }
        p {
            margin: 0 0 10px 0;
            font-size: 12px;
            color: #666;
        }
        button {
            padding: 8px 12px;
            background-color: #279EA7;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.2s;
        }
        button:hover {
            background-color: #1f8089;
        }
        #svg-container-wrapper {
            cursor: grab;
            overflow: hidden;
        }
        #svg-container-wrapper:active {
            cursor: grabbing;
        }
        #viewport {
            will-change: transform;
        }
    </style>
</head>
<body>
    <div class="ui-overlay">
        <h1>Mermaid Diagram</h1>
        <p>• Scroll to Zoom (at cursor)<br>• Click & Drag to Pan</p>
        <button onclick="resetView()">Reset View</button>
    </div>
    <div id="svg-container-wrapper" style="width: 100%; height: 100%; position: relative;">
        <div id="viewport" style="transform-origin: 0 0;">
            ${svgContent}
        </div>
    </div>
    <script>
        const svgWrapper = document.getElementById('svg-container-wrapper');
        const viewport = document.getElementById('viewport');
        const mermaidSvg = viewport.querySelector('svg');

        // Don't extract children - keep the Mermaid SVG intact so styles work
        if (mermaidSvg) {
            mermaidSvg.style.display = 'block';
            mermaidSvg.style.maxWidth = '100%';
            mermaidSvg.style.height = 'auto';
        }
        const svg = svgWrapper; // Treat wrapper as pan/zoom container
        let state = {
            scale: 1,
            panning: false,
            pointX: 0,
            pointY: 0,
            startX: 0,
            startY: 0
        };
        const config = {
            minScale: 0.01,
            maxScale: 10,
            zoomSpeed: 0.1
        };

        // Initial fit to screen
        if (mermaidSvg) {
            const svgRect = mermaidSvg.getBoundingClientRect();
            const wrapperRect = svgWrapper.getBoundingClientRect();
            const scaleX = (wrapperRect.width * 0.9) / svgRect.width;
            const scaleY = (wrapperRect.height * 0.9) / svgRect.height;
            const initialScale = Math.min(scaleX, scaleY, 1);
            state.scale = initialScale;
            state.pointX = (wrapperRect.width - svgRect.width * initialScale) / 2;
            state.pointY = (wrapperRect.height - svgRect.height * initialScale) / 2;
            updateTransform();
        }

        // Mouse wheel zoom
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = viewport.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const delta = -Math.sign(e.deltaY);
            const zoomFactor = 1 + (config.zoomSpeed * delta);
            let newScale = state.scale * zoomFactor;

            if (newScale < config.minScale) newScale = config.minScale;
            if (newScale > config.maxScale) newScale = config.maxScale;

            const ratio = newScale / state.scale;
            state.pointX = mouseX - (mouseX - state.pointX) * ratio;
            state.pointY = mouseY - (mouseY - state.pointY) * ratio;
            state.scale = newScale;

            updateTransform();
        }, { passive: false });

        // Pan with left mouse button
        function startPan(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            state.panning = true;
            state.startX = e.clientX - state.pointX;
            state.startY = e.clientY - state.pointY;
            svg.style.cursor = 'grabbing';
        }

        function pan(e) {
            if (!state.panning) return;
            e.preventDefault();
            state.pointX = e.clientX - state.startX;
            state.pointY = e.clientY - state.startY;
            updateTransform();
        }

        function endPan(e) {
            state.panning = false;
            svg.style.cursor = 'grab';
        }

        svg.addEventListener('mousedown', startPan);
        window.addEventListener('mousemove', pan);
        window.addEventListener('mouseup', endPan);
        svg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                state.panning = true;
                state.startX = e.touches[0].clientX - state.pointX;
                state.startY = e.touches[0].clientY - state.pointY;
            }
        }, {passive: false});
        window.addEventListener('touchmove', (e) => {
            if (!state.panning || e.touches.length !== 1) return;
            e.preventDefault();
            state.pointX = e.touches[0].clientX - state.startX;
            state.pointY = e.touches[0].clientY - state.startY;
            updateTransform();
        }, {passive: false});
        window.addEventListener('touchend', endPan);

        function updateTransform() {
            viewport.style.transform = \`translate(\${state.pointX}px, \${state.pointY}px) scale(\${state.scale})\`;
        }
        window.resetView = function() {
            state = {
                scale: 1,
                panning: false,
                pointX: 0,
                pointY: 0,
                startX: 0,
                startY: 0
            };
            updateTransform();
        }
    </script>
</body>
</html>`;

  // Write temp HTML file
  fs.writeFileSync(tempHtmlPath, htmlContent);

  // Load the HTML file
  popupWindow.loadFile(tempHtmlPath);

  // Clean up temp file after window closes
  popupWindow.on('closed', () => {
    try {
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    } catch (err) {
      console.error('Error cleaning up temp file:', err);
    }
  });
});

// Handle file argument from command line or "Open with"
function handleFileArgument(argv) {
  // In packaged app: argv[1] is the file path
  // In development: argv[2] is the file path (argv[1] is the script)
  const filePath = app.isPackaged ? argv[1] : argv[2];

  if (filePath && fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    if (['.md', '.markdown', '.mdown', '.mkd', '.mkdn'].includes(ext)) {
      fileToOpen = filePath;
      return true;
    }
  }
  return false;
}

// Check for file argument on first launch
handleFileArgument(process.argv);

// Handle second-instance (when app is already running and user opens another file)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // User opened a file while app is running
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Handle the file from second instance
      if (handleFileArgument(commandLine)) {
        openFile(fileToOpen);
        fileToOpen = null;
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
