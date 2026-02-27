# All Issues Fixed ✅

## Issue 1: Action Column Buttons Visibility ✅
**Problem**: Edit/Delete buttons only visible on hover

**Fix**: Removed `opacity-0 group-hover:opacity-100` classes from action columns

**Files Fixed**:
- `src/pages/Rooms/Rooms.jsx`
- `src/pages/Tenants/Tenants.jsx`
- `src/pages/PGs/PGs.jsx`
- `src/pages/Payments/Payments.jsx`
- `src/pages/Expenses/Expenses.jsx`

## Issue 2: Property Archive Issues ✅

### 2a: Room Status Remains Active When Property Archived
**Problem**: Rooms set to "ARCHIVED" but enum doesn't support it

**Fix**: 
- Changed room status to "MAINTENANCE" when property is archived (ARCHIVED not in enum)
- Updated room filtering to check for MAINTENANCE status or parent PG status

**Files Fixed**:
- `src/services/api.js` - archive function
- `src/pages/Rooms/Rooms.jsx` - room filtering logic

### 2b: Archived Properties Still Available in Components
**Problem**: Archived properties (status INACTIVE) showing in dropdowns and lists

**Fix**:
- Updated `pgAPI.getAll()` to filter out INACTIVE properties client-side
- Updated `displayPgs` filter to exclude INACTIVE status
- Components now properly filter archived properties

**Files Fixed**:
- `src/services/api.js` - getAll() function
- `src/pages/PGs/PGs.jsx` - displayPgs filter
- All components using pgAPI.getAll() now get filtered list

## Issue 3: Status Buttons Only Work for First Row ✅
**Problem**: Status select dropdowns only working for first row in PG component

**Fix**: 
- Added `e.stopPropagation()` to onChange and onClick handlers
- Added `z-10 relative` to select elements for proper layering
- Fixed `currentOccupancy` field reference

**Files Fixed**:
- `src/pages/PGs/PGs.jsx` - status select handlers

## Issue 4: Netlify 404 on Refresh ✅
**Problem**: Page not found error when refreshing routes in Netlify

**Fix**: Created redirects configuration files

**Files Created**:
- `public/_redirects` - Netlify redirects file
- `netlify.toml` - Netlify configuration

**Content**:
```
/*    /index.html   200
```

## Additional Fixes
- Fixed `HierarchySelector.jsx` to use correct field names (`floor`, `room_number`)
- Fixed `currentOccupancy` field references throughout

## Testing Checklist
- [ ] Action buttons visible without hover
- [ ] Archived properties don't show in dropdowns
- [ ] Room status changes when property archived
- [ ] Status buttons work for all rows
- [ ] Netlify deployment works with refresh

## Deployment Notes
1. The `public/_redirects` file will be automatically copied to build output
2. If using `netlify.toml`, ensure it's in the root directory
3. Both files serve the same purpose - use one or both
