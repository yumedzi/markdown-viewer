# Customizations

This document tracks custom modifications made to the forked repository that differ from upstream.

## Approach

We use an **overlay customization system** to make it easy to maintain customizations across upstream merges:

- **custom-styles.css** - Style overrides loaded after base styles.css
- **custom-tabs.js** - Tab management functionality loaded after renderer.js
- **custom-performance.js** - Performance optimizations loaded after renderer.js

This approach means after an upstream merge, you only need to ensure these files are:
1. Still present in the repository
2. Still referenced in index.html

## Custom Features

### 1. Compact Header (custom-styles.css)
- Reduced header padding from `12px 20px` to `6px 16px`
- Logo reduced from 32px to 24px height
- Button padding reduced from 8px 16px to 3px 8px
- Tighter spacing (gap reduced from 12px to 8px)
- Makes the header more compact while remaining usable

### 2. Enhanced Scrollbar (custom-styles.css)
- Wider scrollbar (16px instead of 12px)
- Always visible with transparent track
- Easier to grab and use for scrolling large documents
- Custom dark mode styling

### 3. Tab System (custom-tabs.js + custom-styles.css)
- Multiple files can be opened in tabs
- Each tab shows filename and can be closed individually
- Active tab is clearly distinguished with accent color border
- Unsaved changes indicator (dot) on tabs
- Tabs persist across app restarts (saved to localStorage)
- Switching tabs preserves scroll position
- Shows file info bar when only 1 file open, tabs when 2+ files

### 4. Fixed EPIPE Error (main.js)
- Replaced `console.log/error` with safe `log()` function in file operations
- Prevents crashes when app is launched by double-clicking .md files (no terminal attached)
- Fixes "write EPIPE" errors in stopFileWatching and other functions

### 5. PDF Export Optimizations (custom-styles.css)
- Hides header, tabs, and file info bar in PDF exports
- Forces light mode colors for PDF (white background, dark text)
- Ensures PDFs are printer-friendly regardless of app theme
- Removes editor view from exports if in split mode

### 6. Performance Optimizations (custom-performance.js + main.js + package.json)

**Problem**: ~10% CPU usage when app is visible but unfocused.

**Root cause**: Two compounding issues:
1. Electron 27 overrides a private macOS API (`_cornerMask`) forcing macOS WindowServer to recalculate window shadows every display frame
2. Upstream has an unthrottled global `mousemove` listener firing on every pixel of movement

**Solutions**:
- **Electron upgraded to ^37** — fixes the `_cornerMask` bug (merged in [electron/electron#48376](https://github.com/electron/electron/pull/48376))
- **`backgroundThrottling: true`** in `main.js` BrowserWindow options — lets Electron reduce activity when window is in background
- **`custom-performance.js`** — throttles mousemove to 80ms intervals, drops events entirely when window is unfocused, dismisses floating panels (recent files, toasts) on blur
- **Electron upgrade is protected** via `scripts/post-upstream-merge.sh` which re-pins to `^37` after any upstream merge

**Important**: If upstream merges reset `package.json` electron to `^27`, run `./scripts/post-upstream-merge.sh` to restore `^37`.

## How to Maintain After Upstream Merge

**After every upstream merge, run the post-merge script:**

```bash
./scripts/post-upstream-merge.sh
```

This script automatically:
- Re-pins Electron to `^37` (overwriting any upstream downgrade)
- Checks all custom file references in `index.html`
- Checks all custom files in `package.json` build list
- Verifies `backgroundThrottling: true` in `main.js`
- Runs `npm install` with the correct Electron version

### Manual Checklist (if not using the script)

### 1. Check Files Exist
```bash
ls custom-styles.css custom-tabs.js custom-performance.js scripts/post-upstream-merge.sh
```

### 2. Verify index.html References
Ensure index.html contains:
```html
<head>
  ...
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="custom-styles.css">  <!-- This line -->
</head>
<body>
  ...
  <script src="renderer.js"></script>
  <script src="custom-tabs.js"></script>  <!-- This line -->
  <script src="custom-performance.js"></script>  <!-- This line -->
</body>
```

### 3. Test Functionality
```bash
npm start
```

Verify:
- [ ] Scrollbar is visible and wide
- [ ] Header is compact
- [ ] Opening multiple files creates tabs
- [ ] Tabs can be switched and closed
- [ ] Tabs persist after restart
- [ ] CPU usage is low when app is idle (~0-1% instead of ~10%)
- [ ] PDF exports don't include header/tabs and use light colors

### 4. If Something Breaks

Check browser console (F12) for errors. Common issues:

**Tabs not working:**
- Check if `tabsContainer` element exists in index.html
- Verify custom-tabs.js loads after renderer.js
- Check console for `[CustomTabs]` log messages

**Styles not applying:**
- Verify custom-styles.css loads after styles.css
- Use `!important` if upstream styles override (already done)
- Check for CSS syntax errors

**File opening in wrong way:**
- The custom-tabs.js intercepts `file-opened` IPC events
- If renderer.js changes its file handling, may need adjustment

## Modifying Customizations

### To Change Header Size
Edit `custom-styles.css`, find:
```css
.header {
  padding: 6px 16px !important;
}
```

### To Change Scrollbar Width
Edit `custom-styles.css`, find:
```css
::-webkit-scrollbar {
  width: 16px !important;
}
```

### To Modify Tab Behavior
Edit `custom-tabs.js` - all tab logic is in this file.
Key functions:
- `createTab()` - Creates a new tab
- `switchToTab()` - Switches active tab
- `closeTab()` - Closes a tab
- `renderTabs()` - Updates tab UI

## Version History

- **2026-02-07**: Initial customization overlay system created
  - Extracted tab functionality from original fork
  - Created modular overlay approach for easier maintenance
  - Preserved scrollbar and header customizations

## Benefits of This Approach

1. **Easy to Maintain**: After upstream merge, just verify 2 files + 2 lines in index.html
2. **Non-Invasive**: Doesn't modify upstream files directly
3. **Clear Separation**: Custom code is isolated and documented
4. **Easy to Disable**: Remove 2 lines from index.html to disable
5. **Easy to Extend**: Add more custom-*.js or custom-*.css files as needed

## Future Customizations

When adding new customizations:

1. Create new `custom-<feature>.css` or `custom-<feature>.js` file
2. Add reference to index.html
3. Document here in CUSTOMIZATIONS.md
4. Use descriptive console.log prefixes like `[CustomFeature]`
5. Wrap JS in IIFE to avoid global scope pollution
