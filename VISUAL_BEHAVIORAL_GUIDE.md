# Visual & Behavioral Guide - Notification System

## Message Types & Their Appearance

### 1. Admin-Sent Message (Green)
```
┌──────────────────────────────────────────┐
│ ➡️ [SENT]                                │
│ Admin (You)                    2:45 PM    │
├──────────────────────────────────────────┤
│ Subject: Re: Salary Query                │
│ Thank you for your inquiry. We will      │
│ process your request within 5 business   │
│ days. Please check your email for        │
│ confirmation.                             │
└──────────────────────────────────────────┘
  Green border, green icon, "SENT" badge
  No "Mark as read" button
  No reply/action buttons
```

### 2. User Message - New/Unread (Blue)
```
┌──────────────────────────────────────────┐
│ 📬 [NEW]                                 │
│ John Doe                       1:30 PM    │
├──────────────────────────────────────────┤
│ Subject: Salary Query                    │
│ Hi, I wanted to ask about my salary      │
│ revision process. When can I expect      │
│ an update on my application?             │
│                                           │
│ [Mark as read]                           │
└──────────────────────────────────────────┘
  Blue border, blue icon, "NEW" badge
  "Mark as read" button available
```

### 3. User Message - Read (Gray)
```
┌──────────────────────────────────────────┐
│ 📭                                       │
│ John Doe                       1:30 PM    │
├──────────────────────────────────────────┤
│ Subject: Salary Query                    │
│ Hi, I wanted to ask about my salary      │
│ revision process. When can I expect      │
│ an update on my application?             │
└──────────────────────────────────────────┘
  Gray border, gray icon, no badge
  No buttons
```

---

## Color Coding System

| Message Type | Border Color | Background | Icon | Badge | Text |
|--------------|-------------|-----------|------|-------|------|
| Admin Sent | Green-500/30 | Green-500/5 | ➡️ Green | "SENT" Green | Green-300/400 |
| User New | Blue-500/30 | Blue-500/5 | 📬 Blue | "NEW" Blue | Blue-300/400 |
| User Read | White-10 | White-5 | 📭 Gray | None | Gray-400 |

---

## User Workflow

### Scenario: User Contacts Admin

#### Step 1: User Opens "Contact Admin"
```
┌─────────────────────────────────────┐
│ 📝 Send Message to Admin            │
├─────────────────────────────────────┤
│ Subject: [Salary Query            ] │
│                                     │
│ Message:                            │
│ [I would like to know about my     ]│
│ [salary revision process...        ]│
│                                     │
│                        [Send] [✓]  │
└─────────────────────────────────────┘
```

#### Step 2: Message Sent - User Sees in Notifications
```
Right Panel (Notifications)
┌─────────────────────────────┐
│ 🔔 Notifications            │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ ➡️ [SENT]           │   │ ← Your message
│ │ You                   │   │
│ │ Salary Query          │   │
│ │ I would like...       │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

#### Step 3: Admin Sees User Query in Dashboard
```
Admin Dashboard (Messages & Queries)
┌─────────────────────────────────────────┐
│ 📨 Messages & Queries          [X]      │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ 👤 [NEW]                        │   │
│ │ John Doe              2:30 PM    │   │
│ │ Salary Query                    │   │
│ │ I would like to know about...   │   │
│ │                                 │   │
│ │ [Quick Reply]                   │   │
│ └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### Step 4: Admin Replies
```
Admin Types Reply and Clicks Send
┌─────────────────────────────────────────┐
│ 📨 Messages & Queries          [X]      │
├─────────────────────────────────────────┤
│                                         │
│ [Original User Message]                 │
│ (now marked as read)                    │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ ➡️ [SENT]                       │   │ ← Admin reply
│ │ Admin (You)       2:45 PM        │   │
│ │ Re: Salary Query                │   │
│ │ Thank you for your inquiry...    │   │
│ └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### Step 5: User Sees Admin Reply
```
Right Panel (Notifications)
┌─────────────────────────────┐
│ 🔔 Notifications            │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ 📬 [NEW]            │   │ ← Admin reply
│ │ Admin                 │   │
│ │ Re: Salary Query      │   │
│ │ Thank you for...      │   │
│ │                       │   │
│ │ [Mark as read]        │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ ➡️ [SENT]           │   │ ← Your original
│ │ You                   │   │
│ │ Salary Query          │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

#### Step 6: User Marks as Read
```
Right Panel (Notifications)
┌─────────────────────────────┐
│ 🔔 Notifications            │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ 📭                    │   │ ← Now gray (read)
│ │ Admin                 │   │
│ │ Re: Salary Query      │   │
│ │ Thank you for...      │   │
│ │                       │   │ No button
│ │                       │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ ➡️ [SENT]           │   │ ← Always green
│ │ You                   │   │
│ │ Salary Query          │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

---

## Admin Dashboard Workflow

### Complete Conversation View
```
ADMIN DASHBOARD - Messages & Queries
┌──────────────────────────────────────────┐
│ Messages & Queries                  [X]  │
├──────────────────────────────────────────┤
│                                          │
│ User sends first message (2:30 PM)      │
│ ┌────────────────────────────────────┐  │
│ │ 👤 [NEW]                           │  │
│ │ John Doe              2:30 PM       │  │
│ │ Salary Query                       │  │
│ │ I would like to know about my...   │  │
│ │ [Quick Reply]                      │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ─────────────────────────────────────── │ separator
│                                          │
│ Admin replies (2:45 PM)                 │
│ ┌────────────────────────────────────┐  │
│ │ 👤 [SENT]                          │  │ Green!
│ │ Admin (You)       2:45 PM           │  │
│ │ Re: Salary Query                   │  │
│ │ Thank you for your inquiry. We...  │  │
│ │                                    │  │ No buttons
│ └────────────────────────────────────┘  │
│                                          │
│ Admin sends follow-up (2:50 PM)         │
│ ┌────────────────────────────────────┐  │
│ │ 👤 [SENT]                          │  │
│ │ Admin (You)       2:50 PM           │  │
│ │ Additional information              │  │
│ │ I found the processing timeline...  │  │
│ └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

---

## State Changes & Transitions

### Message Lifecycle

```
User sends message
    │
    ├─ Stored in DB (is_read=false)
    │
    ├─ User sees: GREEN "SENT" (not clickable)
    │
    ├─ Admin sees: BLUE "NEW" badge
    │
    ├─ Admin clicks to mark read: GRAY (no badge)
    │
    ├─ Admin replies
    │
    ├─ User sees: BLUE "NEW" reply
    │
    ├─ User clicks to read: GRAY (no badge)
    │
    └─ Conversation complete
```

### Visual State Transitions

```
SEND                   ADMIN MARKS READ          USER MARKS READ
  │                           │                         │
  ▼                           ▼                         ▼
[GREEN]                     [GRAY]                    [GRAY]
"Sent"  ─────────────────► No badge                 No badge
  │                           │                         │
  └─ Always visible to     ─── ─ Visible in history ─── ┴
     who sent it
```

---

## Edge Cases & How They're Handled

### Case 1: Rapid Messages
```
User sends 3 messages quickly:
  Message 1 (2:30)  ─┐
  Message 2 (2:30)  ─┼─ All shown, no duplicates
  Message 3 (2:31)  ─┘

Expected: 3 separate notifications
Actual: 3 separate notifications ✅
Deduplication: Map ensures each ID appears once
```

### Case 2: Page Refresh
```
Before refresh:
  - Message 1: User unread (BLUE)
  - Message 2: Admin read (GRAY)
  - Message 3: Admin sent (GREEN)

Refresh page...

After refresh:
  - Message 1: User unread (BLUE) - same
  - Message 2: Admin read (GRAY) - same  
  - Message 3: Admin sent (GREEN) - same

Persistence: Database & localStorage ✅
```

### Case 3: Multiple Replies to Same Query
```
User Query (2:30 PM) - BLUE initially
    │
    ├─ Admin reply 1 (2:45 PM) - GREEN
    │
    ├─ Admin reply 2 (2:50 PM) - GREEN
    │
    └─ Admin reply 3 (3:00 PM) - GREEN

All visible, chronologically ordered ✅
```

### Case 4: Admin Self-Conversation
```
Sometimes admin might send themselves a note:
  Message: admin → admin

Behavior: Shows as GREEN "Sent" in their panel
Not clickable for "mark as read" (no interaction needed)
Purely informational ✅
```

---

## Accessibility & UX Considerations

### Visual Indicators
- ✅ Colors not sole differentiator (icons + badges used)
- ✅ "SENT" vs "NEW" labels for clarity
- ✅ Icons change shape (Send, Mail, MailOpen)
- ✅ Hover states for buttons

### Keyboard Navigation
- ✅ Buttons are clickable via keyboard
- ✅ Messages expandable via click/Enter
- ✅ Tab navigation works properly
- ✅ Escape closes modals

### Mobile Responsiveness
- ✅ Touch-friendly button sizes
- ✅ Readable on small screens
- ✅ Scrolling works properly
- ✅ No horizontal scroll needed

---

## Performance Characteristics

### Message Rendering
- Initial load: O(n) deduplication
- On poll: Merges with existing without flicker
- Memory: One Map per render = O(n) space
- Scroll position: Preserved during updates

### Update Patterns
- User sends message: Instant local update
- Admin marks read: Instant UI feedback
- Page refresh: Full reload from server
- Polling: Every 2 seconds (configurable)

---

## Testing Checklist by Behavior

### Send Message
- [ ] Message appears immediately in user panel
- [ ] Shows as GREEN "SENT"
- [ ] Admin sees it as BLUE "NEW"
- [ ] No duplicate on refresh

### Receive Message
- [ ] Message appears as BLUE "NEW"
- [ ] Shows "Mark as read" button
- [ ] Can expand to see full content
- [ ] Click marks as read (turns GRAY)

### Reply Message
- [ ] Admin can click "Quick Reply"
- [ ] Reply appears as GREEN "SENT" for admin
- [ ] User sees it as BLUE "NEW"
- [ ] Original query still visible above

### Multiple Messages
- [ ] No duplicates in list
- [ ] Chronological order maintained
- [ ] All marked correctly
- [ ] Scroll position preserved

### Refresh Page
- [ ] Messages persist
- [ ] Read state preserved
- [ ] Order maintained
- [ ] No blank screen

---

## Summary

The notification system now provides a **clear, unified view** with:
- 🎨 **Visual distinction** (colors, badges, icons)
- 📋 **Complete conversation history** (user + admin messages)
- 🔄 **No duplicates** (automatic deduplication)
- 💾 **Persistent state** (survives refresh)
- ⚡ **Fast performance** (O(n) operations)
- ♿ **Accessible design** (keyboard, mobile, color-blind friendly)

Perfect for confident admin decision-making! ✨
