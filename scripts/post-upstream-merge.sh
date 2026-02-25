#!/bin/bash
# =============================================================================
# post-upstream-merge.sh
#
# Run this after merging upstream changes to re-apply our customizations
# that may have been overwritten.
#
# Usage:
#   ./scripts/post-upstream-merge.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "=== Applying post-merge customizations ==="

# -----------------------------------------------------------------------------
# 1. Electron version override
#    Upstream uses ^27, we need ^37 for the macOS _cornerMask CPU fix.
#    (Fixed in Electron 37: https://github.com/electron/electron/pull/48376)
# -----------------------------------------------------------------------------
echo ""
echo "1. Pinning Electron to ^37..."
cd "$ROOT"
npm pkg set devDependencies.electron="^37.0.0"
echo "   ✓ package.json updated"

# -----------------------------------------------------------------------------
# 2. Ensure custom overlay files are referenced in index.html
# -----------------------------------------------------------------------------
echo ""
echo "2. Checking index.html references..."

check_line() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if grep -q "$pattern" "$file"; then
    echo "   ✓ $label already present"
  else
    echo "   ✗ MISSING: $label"
    echo "     → Add manually to index.html: $pattern"
    MISSING_REFS=1
  fi
}

MISSING_REFS=0
check_line "$ROOT/index.html" 'custom-styles.css'      '<link rel="stylesheet" href="custom-styles.css">'
check_line "$ROOT/index.html" 'custom-tabs.js'         '<script src="custom-tabs.js"></script>'
check_line "$ROOT/index.html" 'custom-performance.js'  '<script src="custom-performance.js"></script>'
check_line "$ROOT/index.html" 'tabsContainer'          '<div id="tabsContainer" ...> - must be just before <div class="main-content">'
check_line "$ROOT/index.html" 'app-title'              '<span class="app-title">Markdown Viewer</span> - inside #logoLink'
check_line "$ROOT/index.html" 'Markdown Viewer'        '<title>Markdown Viewer</title>'

if [ "$MISSING_REFS" -eq 1 ]; then
  echo ""
  echo "   ⚠ Some custom references are missing from index.html."
  echo "     See CUSTOMIZATIONS.md for where to add them."
  echo "     KEY POINTS:"
  echo "       - tabsContainer div must be added just before <div class=\"main-content\">"
  echo "       - app-title span must be inside #logoLink (after logo img tags)"
  echo "       - <title> must say 'Markdown Viewer', not 'Omnicore Markdown Viewer'"
fi

# -----------------------------------------------------------------------------
# 3. Ensure custom files are in package.json build list
# -----------------------------------------------------------------------------
echo ""
echo "3. Checking package.json build files list..."

check_build_file() {
  local filename="$1"
  if node -e "
    const pkg = require('./package.json');
    const files = pkg.build && pkg.build.files || [];
    const found = files.some(f => typeof f === 'string' && f.includes('$filename'));
    process.exit(found ? 0 : 1);
  " 2>/dev/null; then
    echo "   ✓ $filename present in build.files"
  else
    echo "   ✗ MISSING: $filename not in package.json build.files"
    MISSING_BUILD=1
  fi
}

MISSING_BUILD=0
check_build_file "custom-styles.css"
check_build_file "custom-tabs.js"
check_build_file "custom-performance.js"

if [ "$MISSING_BUILD" -eq 1 ]; then
  echo ""
  echo "   ⚠ Some files are missing from package.json build.files."
  echo "     Add them inside the build.files array in package.json."
fi

# -----------------------------------------------------------------------------
# 4. Ensure main.js has performance fixes and correct branding
# -----------------------------------------------------------------------------
echo ""
echo "4. Checking main.js..."
if grep -q 'backgroundThrottling.*true' "$ROOT/main.js"; then
  echo "   ✓ backgroundThrottling: true is present"
else
  echo "   ✗ MISSING: backgroundThrottling: true not found in main.js"
  echo "     → Add 'backgroundThrottling: true' to webPreferences in new BrowserWindow()"
fi

if grep -q "window-visibility-changed" "$ROOT/main.js"; then
  echo "   ✓ window-visibility-changed IPC events present"
else
  echo "   ✗ MISSING: window-visibility-changed IPC not found in main.js"
  echo "     → Add mainWindow.on('hide'/'show'/'minimize'/'restore') IPC sends"
fi

if grep -q "title:.*Markdown Viewer" "$ROOT/main.js"; then
  echo "   ✓ BrowserWindow title is 'Markdown Viewer'"
else
  echo "   ✗ WRONG TITLE: main.js BrowserWindow title should be 'Markdown Viewer'"
  echo "     → Set title: 'Markdown Viewer' in new BrowserWindow()"
fi

# -----------------------------------------------------------------------------
# 5. Reinstall dependencies with updated Electron version
# -----------------------------------------------------------------------------
echo ""
echo "5. Running npm install to apply Electron upgrade..."
npm install
echo "   ✓ Dependencies installed"

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=== Done ==="
echo ""
echo "Customizations applied:"
echo "  • Electron pinned to ^37 (fixes macOS idle CPU usage)"
echo ""
echo "Next steps:"
echo "  1. Run 'npm start' to test the app"
echo "  2. Verify: tabs (tabsContainer div in index.html), scrollbar, compact header, PDF export"
echo "  3. Check CPU usage in Activity Monitor when app is idle"
echo ""
