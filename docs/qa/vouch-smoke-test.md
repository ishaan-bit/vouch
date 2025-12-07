# Vouch App - Smoke Test Checklist

**Last Updated:** December 7, 2025  
**Production URL:** https://vouch-git-main-ishaans-projects-f5eaf242.vercel.app

---

## 1. Authentication System

### 1.1 Landing Page
- [ ] Landing page loads at `/`
- [ ] "Begin the Pact" button visible
- [ ] Click "Begin the Pact" → redirects to `/auth/signin` (not direct Google OAuth)

### 1.2 Sign In Page
- [ ] `/auth/signin` loads correctly
- [ ] "Continue with Google" button visible and styled
- [ ] Email/password form visible
- [ ] "Sign up" link navigates to `/auth/signup`

### 1.3 Sign Up Flow
- [ ] `/auth/signup` page loads
- [ ] Form requires name, email, password, confirm password
- [ ] Password validation (min 8 chars) shown
- [ ] Submit creates account
- [ ] Redirects to sign in page after success
- [ ] Error shown for duplicate email

### 1.4 Google Sign In
- [ ] "Continue with Google" initiates OAuth flow
- [ ] Successful auth redirects to `/home`
- [ ] User profile created with Google data

### 1.5 Credentials Sign In
- [ ] Valid email/password logs in successfully
- [ ] Invalid credentials show error toast
- [ ] Redirects to `/home` on success

### 1.6 Sign Out
- [ ] Profile menu shows sign out option
- [ ] Clicking sign out logs user out
- [ ] Redirects to landing page

---

## 2. Home Dashboard

### 2.1 Layout
- [ ] `/home` loads after authentication
- [ ] Header shows "Home" title and date
- [ ] "New Pact" button visible in header
- [ ] Bottom navigation visible (Home, Discover, Friends, Messages, Profile)

### 2.2 Active Pacts Section
- [ ] Shows active pacts if any exist
- [ ] Empty state shown if no active pacts
- [ ] Pact cards show name, day count, progress bar
- [ ] Clicking a pact navigates to `/groups/[id]`

### 2.3 Setting Up Section
- [ ] Shows planning-stage pacts
- [ ] Shows member ready count
- [ ] Shows "Ready to start!" indicator when eligible

### 2.4 Stats Section
- [ ] Shows Completed count
- [ ] Shows Active count
- [ ] Shows Earned amount (₹0 initially)

---

## 3. Creating a Pact

### 3.1 Create Page
- [ ] `/groups/create` loads
- [ ] Name input field works
- [ ] Description textarea works
- [ ] Duration selector works (1-30 days)
- [ ] Visibility toggle (Public/Private) works

### 3.2 Create Flow
- [ ] Submit creates pact in PLANNING status
- [ ] User becomes CREATOR member
- [ ] Redirects to pact detail page
- [ ] Pact appears in "Setting Up" section on home

---

## 4. Pact Detail (Planning Phase)

### 4.1 Header
- [ ] Pact name displayed
- [ ] Status badge shows "Planning"
- [ ] Invite code visible and copyable
- [ ] Back button works

### 4.2 Members Tab
- [ ] Shows all members with avatars
- [ ] Creator marked appropriately
- [ ] "Invite Friends" button works (for creator)

### 4.3 Rules Tab
- [ ] "Add Your Rule" button visible (if user hasn't added one)
- [ ] Add Rule dialog opens
- [ ] Can enter title, description, stake amount
- [ ] Rule creation succeeds
- [ ] Rules from all members shown

### 4.4 Start Challenge
- [ ] "Start Challenge" button visible (creator only)
- [ ] Disabled if < 2 members or not all have rules
- [ ] Enabled when ready
- [ ] Starting changes status to ACTIVE

---

## 5. Inviting Friends

### 5.1 Invite Dialog
- [ ] Opens from pact detail
- [ ] Shows friend search/list
- [ ] Can select friends to invite
- [ ] Invite sends successfully
- [ ] Friends become members of pact

### 5.2 Receiving Invite
- [ ] Invited user sees pact in their "Setting Up" section
- [ ] Can view pact details
- [ ] Can add their rule
- [ ] Leaving pact during planning removes membership and rules

---

## 6. Active Pact Flow

### 6.1 Day Counter
- [ ] Shows "Day X of Y"
- [ ] Progress bar updates correctly
- [ ] Time remaining shown

### 6.2 Proofs Tab
- [ ] "Submit Proof" button visible
- [ ] Add Proof dialog opens
- [ ] Can select rule(s) to prove
- [ ] Can upload image/video
- [ ] Can add caption
- [ ] Proof appears in list after submission

### 6.3 Chat Tab
- [ ] Group chat loads
- [ ] Can send text messages
- [ ] Can send images/videos
- [ ] Messages appear in real-time (30s polling)

---

## 7. Voting System

### 7.1 End-of-Cycle Call
- [ ] Call session created at end of cycle
- [ ] Members can join call page
- [ ] Voting interface shows all rules
- [ ] Can vote YES/NO/SKIP for each member per rule

### 7.2 Finalizing
- [ ] Finalize button works
- [ ] Payment obligations created
- [ ] Call marked as completed
- [ ] Group marked as completed

---

## 8. Settlements

### 8.1 Settlements Page
- [ ] `/settlements` loads
- [ ] Shows what you owe
- [ ] Shows what you receive
- [ ] Payment status visible

### 8.2 Payment Actions
- [ ] "Mark as Paid" button works
- [ ] UPI link generation works
- [ ] Confirmation flow works

---

## 9. Friends System

### 9.1 Friends Page
- [ ] `/friends` loads (via bottom nav)
- [ ] Shows accepted friends
- [ ] Shows pending requests (sent/received)
- [ ] Can accept/reject incoming requests

### 9.2 Sending Requests
- [ ] Can search for users
- [ ] "Add Friend" button works
- [ ] Request notification sent to receiver

### 9.3 User Search
- [ ] `/api/users/search` returns results
- [ ] Search by name or username works

---

## 10. Direct Messages

### 10.1 Messages List
- [ ] `/messages` loads
- [ ] Shows DM threads with friends
- [ ] Sorted by most recent message
- [ ] Shows last message preview

### 10.2 Conversation
- [ ] Clicking thread opens conversation
- [ ] Messages load correctly
- [ ] Send text message works
- [ ] Auto-scrolls to bottom

### 10.3 Media Messages
- [ ] Attachment button opens file picker
- [ ] Can select image → preview shown
- [ ] Can select video → preview shown
- [ ] Send uploads and creates message
- [ ] Images render correctly
- [ ] Videos play with controls

### 10.4 Voice Messages
- [ ] Mic button starts recording
- [ ] Recording indicator shows
- [ ] Stop recording creates audio blob
- [ ] Send uploads and creates message
- [ ] Audio messages play with custom player

---

## 11. Discover Feed

### 11.1 Discovery Page
- [ ] `/discover` loads
- [ ] Shows public pacts in PLANNING status
- [ ] User's own pacts NOT shown
- [ ] Pacts user left show again in discover

### 11.2 Pact Cards
- [ ] Shows pact name, duration, stake range
- [ ] Shows member count
- [ ] Shows creator info
- [ ] Clicking card navigates to join flow

### 11.3 Joining
- [ ] Can submit join request with rule pitch
- [ ] Creator sees join requests
- [ ] Creator can approve/reject
- [ ] Approved users become members

---

## 12. Profile System

### 12.1 View Profile
- [ ] `/profile` loads own profile
- [ ] Shows avatar, name, username, bio
- [ ] Shows stats (groups completed, trust score)
- [ ] Shows public proofs gallery
- [ ] "Edit Profile" button works

### 12.2 Edit Profile
- [ ] `/profile/edit` loads
- [ ] Can change name
- [ ] Can change username (validates uniqueness)
- [ ] Can change bio
- [ ] Can change UPI ID
- [ ] Can upload new avatar
- [ ] Save persists changes

### 12.3 Other Profiles
- [ ] `/profile/[username]` loads other user's profile
- [ ] Shows friendship status
- [ ] "Add Friend" / "Friends" / "Pending" button correct
- [ ] Can send friend request from profile

---

## 13. Notifications

### 13.1 Notification List
- [ ] Notification bell shows count
- [ ] Clicking opens notifications
- [ ] Shows friend requests
- [ ] Shows pact invites
- [ ] Shows cycle reminders

### 13.2 Actions
- [ ] Friend request shows accept/reject
- [ ] Clicking notification navigates correctly
- [ ] Mark as read works

---

## 14. File Uploads

### 14.1 Avatar Upload
- [ ] Can upload avatar in profile edit
- [ ] Image preview shown
- [ ] Upload succeeds
- [ ] New avatar displays everywhere

### 14.2 Proof Upload
- [ ] Can upload image proof
- [ ] Can upload video proof
- [ ] Max 50MB enforced
- [ ] Invalid types rejected

### 14.3 DM Attachments
- [ ] Image upload works
- [ ] Video upload works
- [ ] Audio upload works

---

## 15. Edge Cases

### 15.1 Error Handling
- [ ] Unauthorized access redirects to sign in
- [ ] 404 pages handled gracefully
- [ ] API errors show toast messages
- [ ] Network errors handled

### 15.2 Empty States
- [ ] No pacts → shows empty state with CTA
- [ ] No friends → shows appropriate message
- [ ] No messages → shows "start conversation" prompt

### 15.3 Loading States
- [ ] Pages show loading spinners
- [ ] Buttons show loading during mutations
- [ ] No flash of unstyled content

---

## Quick Regression Checklist

Run after any deploy:

1. [ ] Land on `/` → click "Begin the Pact" → arrives at `/auth/signin`
2. [ ] Sign in with Google → arrives at `/home`
3. [ ] Create a pact → appears in "Setting Up"
4. [ ] Add a rule → shows in pact detail
5. [ ] Open Messages → no 500 error
6. [ ] Open a DM → messages load
7. [ ] Send a text message → appears
8. [ ] Send an image → uploads and displays
9. [ ] View Discover → shows public pacts
10. [ ] View Profile → no errors

---

## Known Issues (Track Here)

| Issue | Status | Notes |
|-------|--------|-------|
| - | - | - |

---

## Test Accounts

Create at least 2 test accounts to test social features:

1. **Test User A:** `testa@example.com` / (your password)
2. **Test User B:** `testb@example.com` / (your password)

Make them friends to test DM and pact invite flows.
