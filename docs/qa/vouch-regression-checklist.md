# Vouch Regression Checklist

Use this checklist before every production deployment to ensure all critical flows work correctly.

## Authentication

- [ ] **Google Sign-In**: Sign in with Google OAuth
- [ ] **Sign Out**: Successfully log out
- [ ] **Session Persistence**: Refresh page, session remains

## User Profile

- [ ] **View Profile**: Navigate to own profile at `/profile`
- [ ] **Edit Profile**: Update name, username, bio, UPI ID
- [ ] **Avatar Upload**: Upload a new avatar image
- [ ] **View Other Profile**: Click on friend's avatar to view their profile
- [ ] **Profile Proofs**: See proofs on profile page (if public)

## Groups / Pacts

### Creating & Managing
- [ ] **Create Group**: Create new pact with name, description
- [ ] **Set Duration**: Choose 7, 14, 21, 30 day durations
- [ ] **Invite Members**: Share invite code or link
- [ ] **Join via Code**: Join using invite code
- [ ] **Join via Link**: Join using invite link (deep link)
- [ ] **Approve Join Requests**: Approve pending member requests (if admin)
- [ ] **Leave Group**: Leave a group you're a member of

### Rules
- [ ] **Create Rule**: Add a new rule with title, description
- [ ] **Set Stake (₹1+)**: Set stake amount minimum ₹1
- [ ] **Stake Presets**: Use quick stake preset buttons (₹1, ₹10, ₹50, ₹100...)
- [ ] **View Rules**: See all rules in a pact

### Starting Pact
- [ ] **Start Pact**: Start the pact (moves to ACTIVE status)
- [ ] **Day Counter**: Verify day index starts at 1

## Proofs

### Uploading
- [ ] **Text Proof**: Create text-only proof
- [ ] **Image Upload**: Upload image as proof (gallery)
- [ ] **Camera Capture**: Take photo directly from camera
- [ ] **Video Upload**: Upload video as proof (gallery)
- [ ] **Video Capture**: Record video directly
- [ ] **Voice Note**: Record voice proof
- [ ] **Tag Rules**: Select which rules the proof applies to
- [ ] **Set Public/Private**: Toggle proof visibility on profile

### Viewing
- [ ] **Proof Feed**: View proofs by day in group
- [ ] **Media Viewer**: Click image/video to open lightbox viewer
- [ ] **Audio Playback**: Play voice proofs
- [ ] **Navigation**: Navigate between proofs in viewer (if multiple)

### Managing
- [ ] **Delete Own Proof**: Delete a proof you uploaded
- [ ] **Confirm Delete**: Confirmation dialog appears

### Stories (24h)
- [ ] **Create Story**: Create proof with "Post as Story" checked
- [ ] **Story Badge**: See story indicator on proof
- [ ] **Story Expiry**: Stories expire after 24h

## Review Call

- [ ] **Start Review Call**: Start review call at end of cycle
- [ ] **Vote on Members**: Vote YES/NO for each member's rule compliance
- [ ] **Submit Votes**: Submit all votes
- [ ] **Finalize Call**: Finalize voting and calculate obligations
- [ ] **View Settlement**: See who owes whom
- [ ] **No Restart**: Cannot restart review call after completion

## Settlements

- [ ] **View Settlements**: Navigate to settlements page
- [ ] **"You Owe" Tab**: See obligations you need to pay
- [ ] **"Owed to You" Tab**: See obligations others owe you
- [ ] **UPI Pay Link**: Click to open UPI payment (if recipient has UPI ID)
- [ ] **Mark as Paid**: Mark an obligation as paid
- [ ] **Confirm Received**: Confirm you received payment

## Notifications

- [ ] **Bell Icon**: See notification badge count
- [ ] **View Notifications**: Open notifications panel
- [ ] **Mark as Read**: Mark notifications as read
- [ ] **Clear All**: Clear all notifications

## Friends

- [ ] **View Friends**: See friends list
- [ ] **Add Friend**: Send friend request
- [ ] **Accept Friend**: Accept incoming friend request
- [ ] **Decline Friend**: Decline friend request

## Messages / Chat

- [ ] **Group Chat**: Send message in group chat
- [ ] **View Chat History**: See previous messages
- [ ] **Media in Chat**: View images/videos in chat

## Discover

- [ ] **Discover Page**: Navigate to discover
- [ ] **Search Users**: Search for users by name/username
- [ ] **View User Profile**: Click user to view profile

## Vouch for a Cause

- [ ] **See Prompt**: When losing stake, see "Vouch for a Cause" prompt
- [ ] **Pledge to Donate**: Pledge lost amount to charity
- [ ] **Skip Option**: Option to skip/decline
- [ ] **Profile History**: See donation pledges on profile

## Edge Cases & Error Handling

- [ ] **Invalid Profile URL**: `/profile/null` shows "Invalid profile" message
- [ ] **Invalid Group URL**: Non-existent group shows error
- [ ] **Upload Error**: Non-JSON error response handled gracefully
- [ ] **Network Error**: Offline/slow network handled
- [ ] **Empty States**: Empty lists show appropriate messages

## Mobile Responsiveness

- [ ] **Navigation**: Bottom nav works on mobile
- [ ] **Forms**: Input forms usable on mobile
- [ ] **Camera Access**: Camera permissions requested on mobile
- [ ] **Touch Targets**: Buttons large enough for touch

## Performance

- [ ] **Page Load**: Pages load within 3 seconds
- [ ] **Image Loading**: Images lazy-load / skeleton states
- [ ] **No Console Errors**: Check browser console for errors

---

## Quick Smoke Test (5 min)

For quick verification, test these critical paths:

1. ✅ Sign in with Google
2. ✅ Create a new pact
3. ✅ Add a rule with ₹1 stake
4. ✅ Start the pact
5. ✅ Upload an image proof
6. ✅ View proof in lightbox
7. ✅ Navigate to profile
8. ✅ Navigate to settlements

---

## Known Issues / Workarounds

| Issue | Status | Workaround |
|-------|--------|------------|
| VS Code TypeScript errors after Prisma changes | Fixed | Run "TypeScript: Restart TS Server" |
| Large video upload timeout | Known | Keep videos under 50MB |

---

*Last updated: Session timestamp*
*Maintained by: Vouch Development Team*
