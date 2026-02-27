# Fix for Module Import Error

## Issue
`TypeError: Failed to fetch dynamically imported module` for Rooms.jsx

## Root Cause
Duplicate variable declaration of `currentOccupancy` in the same scope (lines 135 and 141)

## Fix Applied
✅ Fixed duplicate `currentOccupancy` declaration by moving it outside the if block
✅ Fixed remaining `room.currentOccupancy` references to include fallback

## Changes Made

### Rooms.jsx
1. **Line 134-141**: Fixed duplicate `currentOccupancy` declaration
   - Before: Two separate declarations in same scope
   - After: Single declaration moved outside if block

2. **Line 764**: Fixed `room.currentOccupancy` to include fallback
   - Before: `room.currentOccupancy || 0`
   - After: `room.current_occupancy || room.currentOccupancy || 0`

### UnifiedStayManager.jsx
3. **Line 270-271**: Fixed bed number field references
   - Before: `a.bedNumber`, `b.bedNumber`
   - After: `a.bed_number || a.bedNumber`, `b.bed_number || b.bedNumber`

## Next Steps
1. Clear browser cache
2. Restart dev server: `npm run dev`
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Verification
The module should now load correctly without syntax errors.
