# Customizations

This document tracks custom modifications made to the forked repository that differ from upstream.

## Approach

We use an **overlay customization system** to make it easy to maintain customizations across upstream merges:

- **custom-styles.css** - Style overrides loaded after base styles.css
- **custom-tabs.js** - Tab management functionality loaded after renderer.js

This approach means after an upstream merge, you only need to ensure these files are:
1. Still present in the repository
2. Still referenced in index.html

## Custom Features

### 1. Compact Header (custom-styles.css)
- Reduced header padding from `12px 20px` to `6px 16px`
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

## How to Maintain After Upstream Merge

After merging from upstream:

### 1. Check Files Exist
```bash
ls custom-styles.css custom-tabs.js
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
