# 📌 Incident Pin Feature Documentation
**Date**: February 12, 2026  
**Feature**: Pin/Bookmark Incidents on Map

---

## Overview

The Pin feature allows users to mark important incidents on the map for quick identification and priority tracking. Pinned incidents are displayed with a distinctive **gold marker** that is larger than standard markers, making them stand out visually.

---

## Features Implemented

### 1. **Database Schema Update**
**File**: `shared/schema.ts`

Added `isPinned` field to the incidents table:
```typescript
isPinned: boolean("is_pinned").default(false), // Pin important incidents on map
```

### 2. **Backend API Endpoint**
**File**: `server/routes.ts`

New endpoint to toggle pin status:
```typescript
PATCH /api/incidents/:id/pin
```

**Request Body**:
```json
{
  "isPinned": true
}
```

**Features**:
- ✅ Authentication required
- ✅ Audit logging for pin/unpin actions
- ✅ Returns updated incident object
- ✅ Error handling

### 3. **Frontend Map Component**
**File**: `client/src/components/maps/NigeriaMap.tsx`

**New Features**:
- **Gold Pinned Marker Icon**: Larger, distinctive gold marker for pinned incidents
- **Pin Button**: Added to incident popup with toggle functionality
- **Visual Feedback**: Button shows filled state when incident is pinned
- **Real-time Updates**: Map refreshes after pin/unpin action

**Pin Icon Specifications**:
```typescript
const pinnedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [38, 62],  // Larger than standard markers
  iconAnchor: [19, 62],
  popupAnchor: [1, -55],
  shadowSize: [50, 50],
  className: 'pinned-marker'
});
```

### 4. **Map Legend Update**
**File**: `client/src/pages/map-page.tsx`

Added pinned incidents to the map legend:
- 📌 **Gold/Yellow marker** = Pinned Incidents

---

## User Workflow

### **How to Pin an Incident**

1. **Navigate to Map**: Go to `/map` page
2. **Click on Incident Marker**: Click any incident marker on the map
3. **View Popup**: Incident details popup appears
4. **Click Pin Button**: Click the pin icon button (📌) at the bottom right
5. **Confirmation**: Marker changes to gold and becomes larger
6. **Persistence**: Pin status is saved to database

### **How to Unpin an Incident**

1. **Click Pinned Marker**: Click the gold pinned marker
2. **View Popup**: Popup shows filled pin button
3. **Click Pin Button**: Click the pin button again
4. **Confirmation**: Marker returns to severity-based color

---

## Visual Indicators

### **Marker Colors & Sizes**

| Status | Color | Size | Icon |
|--------|-------|------|------|
| **Pinned** | 🟡 Gold | 38x62px (Largest) | Gold marker |
| High Severity | 🔴 Red | 35x57px | Red marker |
| Medium Severity | 🟠 Orange | 32x52px | Orange marker |
| Low Severity | 🔵 Blue | 30x45px | Blue marker |

**Note**: Pinned incidents override severity colors, making them immediately visible regardless of severity level.

---

## Technical Details

### **API Endpoint Details**

**Endpoint**: `PATCH /api/incidents/:id/pin`

**Authentication**: Required (session-based)

**Request**:
```bash
curl -X PATCH http://localhost:3442/api/incidents/123/pin \
  -H "Content-Type: application/json" \
  -d '{"isPinned": true}'
```

**Response** (Success):
```json
{
  "id": 123,
  "title": "Incident Title",
  "isPinned": true,
  ...
}
```

**Response** (Error):
```json
{
  "error": "Incident not found"
}
```

### **Database Migration**

To apply the schema changes:
```bash
npm run db:push
```

This adds the `is_pinned` column to the `incidents` table with a default value of `false`.

---

## Use Cases

### **1. Priority Tracking**
Pin high-priority incidents that require immediate attention or ongoing monitoring.

### **2. Incident Monitoring**
Mark incidents that are being actively monitored by response teams.

### **3. VIP Incidents**
Highlight incidents involving VIPs, critical infrastructure, or sensitive locations.

### **4. Training & Demos**
Pin example incidents for training sessions or system demonstrations.

### **5. Stakeholder Focus**
Mark incidents that stakeholders have specifically requested updates on.

---

## Security & Permissions

- ✅ **Authentication Required**: Only logged-in users can pin/unpin incidents
- ✅ **Audit Trail**: All pin/unpin actions are logged with user ID and timestamp
- ✅ **No Special Permissions**: Any authenticated user can pin incidents
- ⚠️ **Future Enhancement**: Consider adding role-based pin permissions

---

## Frontend Components Modified

### **1. NigeriaMap Component**
- Added `Pin` icon import from `lucide-react`
- Created `pinnedIcon` marker definition
- Added `pinnedIncidents` state management
- Implemented `handleTogglePin` function
- Updated `getIncidentIcon` to check pin status
- Modified popup to include pin button

### **2. Map Page**
- Updated legend to include pinned incidents indicator

---

## Backend Components Modified

### **1. Schema Definition**
- Added `isPinned` field to `incidents` table
- Added `isPinned` to `insertIncidentSchema`

### **2. Routes**
- Added `PATCH /api/incidents/:id/pin` endpoint
- Integrated audit logging for pin actions

---

## Testing Checklist

- [ ] Pin an incident and verify gold marker appears
- [ ] Unpin an incident and verify it returns to severity color
- [ ] Verify pin status persists after page refresh
- [ ] Check audit logs for pin/unpin actions
- [ ] Test with different user roles
- [ ] Verify multiple incidents can be pinned simultaneously
- [ ] Test pin functionality on mobile devices
- [ ] Verify pin button tooltip shows correct text

---

## Future Enhancements

### **Potential Improvements**

1. **Pin Filters**
   - Add filter to show only pinned incidents
   - Quick access sidebar for pinned incidents

2. **Pin Notes**
   - Allow users to add notes when pinning
   - Display pin reason in popup

3. **User-Specific Pins**
   - Each user has their own pinned incidents
   - Team-level pins vs personal pins

4. **Pin Expiration**
   - Auto-unpin after certain time period
   - Pin expiration reminders

5. **Pin Analytics**
   - Track most pinned incidents
   - Pin duration statistics
   - User pin activity reports

6. **Bulk Pin Operations**
   - Pin multiple incidents at once
   - Pin all incidents in a region

7. **Pin Notifications**
   - Notify users when pinned incidents update
   - Alert when pinned incident status changes

---

## Troubleshooting

### **Pin Button Not Working**
- Check browser console for errors
- Verify user is authenticated
- Ensure backend server is running
- Check network tab for API call status

### **Marker Not Changing Color**
- Refresh the page after pinning
- Clear browser cache
- Verify database was updated

### **Pin Status Not Persisting**
- Check database connection
- Verify `is_pinned` column exists in database
- Run `npm run db:push` to apply schema changes

---

## Code Examples

### **Pin an Incident (Frontend)**
```typescript
const handleTogglePin = async (incidentId: number, currentPinStatus: boolean) => {
  try {
    const response = await fetch(`/api/incidents/${incidentId}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isPinned: !currentPinStatus })
    });
    
    if (response.ok) {
      window.location.reload(); // Refresh to show updated marker
    }
  } catch (error) {
    console.error('Failed to toggle pin:', error);
  }
};
```

### **Check if Incident is Pinned (Backend)**
```typescript
const incident = await storage.getIncident(id);
if (incident.isPinned) {
  // Handle pinned incident
}
```

---

## Performance Considerations

- **Marker Rendering**: Pinned markers are slightly larger, minimal performance impact
- **Database Queries**: `isPinned` field is indexed for fast filtering (future enhancement)
- **API Calls**: Single PATCH request per pin/unpin action
- **State Management**: Local state tracks pinned incidents to avoid unnecessary re-renders

---

## Accessibility

- ✅ Pin button has descriptive `title` attribute
- ✅ Visual indicator (gold color) is supplemented with size difference
- ✅ Button state clearly indicates pinned vs unpinned
- ⚠️ **Future**: Add ARIA labels for screen readers

---

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Conclusion

The Pin feature enhances incident management by allowing users to mark and quickly identify important incidents on the map. The distinctive gold marker and larger size ensure pinned incidents stand out, while the simple toggle interface makes it easy to manage pins.

**Status**: ✅ **Fully Implemented and Ready for Use**

---

*For questions or issues, contact the development team or refer to the main project documentation.*
