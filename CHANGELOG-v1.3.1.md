# Changelog - Version 1.3.1

## Changes Made on 2025-12-02

### 1. **Reduced Menu Bar Height** ✅
- **Issue**: The top menu bar was approximately 62px tall, which was too large
- **Solution**: Reduced the header to approximately 30px (~50% smaller)
  - Changed header padding from `12px 20px` to `6px 16px`
  - Reduced logo height from `32px` to `20px`
- **Files Modified**: `styles.css` (lines 110, 137)

### 2. **Fixed macOS File Opening** ✅
- **Issue**: When the app was set as the default .md file opener in macOS, clicking on a .md file would launch the app but not open the file
- **Solution**: Added proper macOS `open-file` event handler
  - The handler now properly receives files opened via Finder
  - Works when app is set as default .md opener
  - Handles both fresh app launches and when app is already running
  - Brings window to front when file is opened
  - Respects unsaved changes workflow
- **Files Modified**: `main.js` (added lines 1084-1116)

### 3. **Fixed Icon Build Issue** ✅
- **Issue**: Build was failing because `logo.png` was only 300x68px (needed 512x512px minimum for macOS)
- **Solution**: Changed macOS icon to use `omnicore_ico.png` (990x990px)
- **Files Modified**: `package.json` (line 104)

## Testing Recommendations

1. **Menu Bar Size**: Launch the app and verify the menu bar is noticeably smaller
2. **File Opening via Finder**: 
   - Set this app as default for .md files (Right-click .md file → Get Info → Open with)
   - Double-click a .md file and verify it opens in the app
   - With the app already running, double-click another .md file and verify it opens
3. **Build**: Run `pnpm build-mac` and verify no errors

## Build Output
- File: `dist/Omnicore Markdown Viewer-1.3.0-arm64.dmg`
- Architecture: ARM64 (Apple Silicon)
- Format: APFS DMG (macOS 10.12+)
