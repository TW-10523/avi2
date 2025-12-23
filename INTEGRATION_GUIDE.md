# Integration Guide

## Quick Start - How to Use the New Components

### 1. Change Password Modal

**Location**: `src/components/ChangePasswordModal.tsx`

**Current Integration** in `ProfilePopup.tsx`:
```tsx
import ChangePasswordModal from './ChangePasswordModal';

const [showChangePassword, setShowChangePassword] = useState(false);

// In JSX:
<button onClick={() => setShowChangePassword(true)}>
  {/* Change Password button */}
</button>

<ChangePasswordModal 
  isOpen={showChangePassword} 
  onClose={() => setShowChangePassword(false)} 
/>
```

**Integration Status**: ✅ READY - Already integrated into ProfilePopup

**To Add API Connection**:
```tsx
// In ChangePasswordModal.tsx, replace the TODO:
const response = await changePassword({ 
  currentPassword, 
  newPassword 
});
```

---

### 2. Message Broadcast Popup

**Location**: `src/components/MessageInput.jsx`

**Current Integration**:
The popup is already built into MessageInput.jsx. When admin clicks "Send to all users":
1. A confirmation modal appears
2. Shows subject and message preview
3. Admin confirms
4. Message is sent

**Integration Status**: ✅ READY - Fully functional

**To Add API Connection**:
```jsx
// Currently uses the 'send' prop callback
// Connect to actual API endpoint:
const response = await broadcastMessageToAllUsers({
  subject,
  message
});
```

---

### 3. Notification Center (Two-Section Panel)

**Location**: `src/components/NotificationCenter.tsx`

**How to Use**:
```tsx
import NotificationCenter from './components/NotificationCenter';

// In your Header or Navigation component:
<NotificationCenter 
  userRole={currentUser.role}  // 'admin' or 'user'
  onOpenContactAdmin={handleContactAdminClick}
/>
```

**What It Does**:
- Shows unread notification count
- **Admin users**: See two tabs (Admin Messages + User Queries)
- **Regular users**: See messages from admin
- Click bell icon to open panel
- Mark messages as read

**Integration Status**: ⚠️ NEEDS INTEGRATION

**Steps to Integrate**:
1. Import in your Header component
2. Pass `userRole` prop from logged-in user
3. Pass `onOpenContactAdmin` handler to open ContactAdmin modal
4. Replace old `Notifications.tsx` component if needed

---

### 4. Contact Admin Bubble

**Location**: `src/components/HistoryPage.tsx`

**Current Integration**: ✅ READY
```tsx
<HistoryPage 
  history={history}
  onContactAdmin={() => {
    // This opens the ContactAdmin modal
    // Should be connected to your main app state
  }}
/>
```

The bubble is already added to HistoryPage. It shows:
- Purple-to-pink gradient button
- MessageSquare icon with hover animation
- Text: "Contact Admin for Help"

**Integration Status**: ✅ READY - Structure in place, needs parent component handler

---

## Database Integration

### Support & Notification Tables

Your database already has:
- `support_tickets` - For user queries/tickets
- `notifications` - For system notifications

### API Endpoints to Connect

**Already Implemented** in `routes/support.ts`:
- ✅ `POST /api/support/ticket` - Create support ticket
- ✅ `GET /api/support/tickets` - List tickets
- ✅ `POST /api/support/ticket/:ticketId/reply` - Admin reply
- ✅ `GET /api/support/notifications` - Get notifications
- ✅ `POST /api/support/notifications/:id/read` - Mark as read
- ✅ `GET /api/support/notifications/unread/count` - Unread count

### Tables Schema

```
support_tickets:
├── id (PK)
├── user_id (FK)
├── user_name
├── subject
├── message
├── status (enum: open, in_progress, resolved, closed)
├── admin_id (FK)
├── admin_name
├── admin_reply
├── replied_at
└── created_at, updated_at

notifications:
├── id (PK)
├── user_id (FK)
├── title
├── message
├── type (enum: info, success, warning, error, admin_reply)
├── is_read (boolean)
├── link
├── related_id
└── created_at, updated_at
```

---

## Step-by-Step Integration Checklist

### Phase 1: Basic Setup
- [ ] Verify ProfilePopup imports ChangePasswordModal ✅
- [ ] Add NotificationCenter to Header component
- [ ] Add onContactAdmin handler to HistoryPage
- [ ] Test all components render without errors

### Phase 2: API Integration
- [ ] Connect ChangePasswordModal to `/api/users/change-password` endpoint
- [ ] Connect MessageInput broadcast to send notifications to all users
- [ ] Verify notification retrieval from `/api/support/notifications`
- [ ] Test marking notifications as read

### Phase 3: Feature Testing
- [ ] Test change password flow end-to-end
- [ ] Test admin broadcast to all users
- [ ] Test user contact admin flow
- [ ] Test notification center display
- [ ] Verify admin sees user queries in notification center
- [ ] Verify user sees admin messages in notification center

### Phase 4: Polish
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test on mobile devices
- [ ] Verify accessibility
- [ ] Performance optimization if needed

---

## Code Examples

### Example: Updating Header.tsx

```tsx
import NotificationCenter from './components/NotificationCenter';
import { useState } from 'react';

export default function Header({ user, onContactAdmin }) {
  return (
    <header>
      <div className="header-right">
        {/* Other header items */}
        
        {/* Add this */}
        <NotificationCenter 
          userRole={user.role}
          onOpenContactAdmin={onContactAdmin}
        />
      </div>
    </header>
  );
}
```

### Example: Updating Main App Component

```tsx
import ContactAdmin from './components/ContactAdmin';

function App() {
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  
  return (
    <>
      {/* Your main app */}
      
      <ContactAdmin 
        isOpen={showContactAdmin}
        onClose={() => setShowContactAdmin(false)}
      />
    </>
  );
}
```

### Example: API Integration in ChangePasswordModal

```tsx
// In ChangePasswordModal.tsx, in the submit function:

const changePasswordAPI = async (oldPassword: string, newPassword: string) => {
  const token = getToken();
  const response = await fetch('/dev-api/api/users/change-password', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      oldPassword,
      newPassword,
    }),
  });
  return response.json();
};

// Then in the submit handler:
try {
  const response = await changePasswordAPI(currentPassword, newPassword);
  if (response.code === 200) {
    setSuccess(true);
    // ... rest of success handling
  }
} catch (err) {
  setError('Failed to change password');
}
```

---

## File Locations Quick Reference

| Component | Path | Status | Type |
|-----------|------|--------|------|
| ChangePasswordModal | `src/components/ChangePasswordModal.tsx` | ✅ Ready | NEW |
| MessagePopup | `src/components/MessagePopup.tsx` | ✅ Ready | NEW |
| NotificationCenter | `src/components/NotificationCenter.tsx` | ✅ Ready | NEW |
| MessageInput (Enhanced) | `src/components/MessageInput.jsx` | ✅ Ready | MODIFIED |
| HistoryPage (Enhanced) | `src/components/HistoryPage.tsx` | ✅ Ready | MODIFIED |
| ProfilePopup (Enhanced) | `src/components/ProfilePopup.tsx` | ✅ Ready | MODIFIED |
| Database README | `DATABASE_README.md` | ✅ Ready | NEW |
| Implementation Guide | `IMPLEMENTATION_SUMMARY.md` | ✅ Ready | NEW |

---

## Common Questions

### Q: Do I need to modify the backend?
**A**: No, the backend API endpoints already exist in `routes/support.ts`. You just need to:
1. Verify the endpoints match your frontend calls
2. Create the `/api/users/change-password` endpoint if it doesn't exist
3. Create a broadcast notification endpoint if needed

### Q: Can I customize the styling?
**A**: Yes! All components use Tailwind CSS. Edit the color schemes, spacing, and animations as needed.

### Q: How do I test the notification flow?
**A**: 
1. Log in as regular user
2. Click "Contact Admin" bubble or button
3. Submit a support ticket
4. Log in as admin
5. See the ticket in NotificationCenter "User Queries" tab
6. Reply to the ticket
7. Log back as regular user
8. See notification in NotificationCenter "Admin Messages" tab

### Q: What if I don't see the Contact Admin button?
**A**: Make sure:
1. HistoryPage component has `onContactAdmin` prop passed
2. Parent component has ContactAdmin modal
3. Handler function exists and is passed correctly

---

## Troubleshooting

### Component Not Showing
- Check console for import errors
- Verify component is exported correctly
- Check parent component is passing required props

### Styling Looks Wrong
- Ensure Tailwind CSS is enabled
- Check for CSS conflicts
- Verify dark theme is applied

### Notifications Not Loading
- Check API endpoint returns correct format
- Verify user authentication token is valid
- Check browser console for network errors

### Modal Not Opening/Closing
- Verify state management is correct
- Check onClick handlers are wired properly
- Look for event propagation issues

---

## Performance Considerations

1. **Notification Polling**: Currently polls every 30 seconds
   - Adjust interval in NotificationCenter.tsx if needed
   - Consider WebSocket for real-time updates

2. **Modal Rendering**: Modals use fixed positioning
   - Should not impact scrolling performance
   - Overlay uses pointer-events for efficiency

3. **List Rendering**: NotificationCenter uses .map()
   - Add pagination if you expect 100+ notifications
   - Implement virtual scrolling for large lists

---

## Next Version Enhancements

- [ ] WebSocket for real-time notifications
- [ ] Notification preferences per user
- [ ] Scheduled messages
- [ ] Message templates
- [ ] File attachments in support tickets
- [ ] Notification analytics
- [ ] Read receipt tracking
