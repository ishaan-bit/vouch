# Vouch QA Checklist - DM Media & Pact Planning

## DM Attachments

### Send Image
- [ ] Open DM thread with a friend
- [ ] Click paperclip icon
- [ ] Select an image file (jpg/png/webp)
- [ ] Preview thumbnail appears below input
- [ ] Click send
- [ ] Upload spinner shows during upload
- [ ] Message appears with image thumbnail
- [ ] Click image to open in new tab
- [ ] Recipient sees same image in their thread

### Send Video
- [ ] Open DM thread with a friend
- [ ] Click paperclip icon  
- [ ] Select a video file (mp4/webm)
- [ ] Preview appears below input
- [ ] Click send
- [ ] Upload spinner shows during upload
- [ ] Message appears with video player
- [ ] Video plays with controls
- [ ] Recipient sees same video

### Attachment Error Handling
- [ ] Try sending very large file (>50MB)
- [ ] Should show error toast "File too large"
- [ ] No ghost/empty messages appear
- [ ] Try sending unsupported file type
- [ ] Should show error toast about file type

## DM Voice Messages

### Record & Send Voice Note
- [ ] Open DM thread with a friend
- [ ] Click mic icon
- [ ] Browser asks for microphone permission (first time)
- [ ] Recording indicator appears with timer
- [ ] Click stop (square) button
- [ ] Voice message preview appears
- [ ] Click send
- [ ] Message appears with audio player
- [ ] Play button works
- [ ] Audio plays correctly
- [ ] Recipient sees same audio message with working playback

### Cancel Recording
- [ ] Start recording
- [ ] Click X to cancel
- [ ] Recording stops, no message sent
- [ ] Input returns to normal state

### Voice Error Handling
- [ ] Deny microphone permission
- [ ] Should show toast "Could not access microphone"

## Pact Planning - Member Flow

### View Planning Pact
- [ ] Creator adds you to a pact
- [ ] Pact appears in your Home "Setting Up" section
- [ ] Pact does NOT appear in Discover feed

### Add Your Rule
- [ ] Open planning pact as non-creator member
- [ ] "Add Your Rule" button visible if you haven't added one
- [ ] Click button, rule dialog opens
- [ ] Fill in title, description, stake amount
- [ ] Submit rule
- [ ] Your rule appears in Rules tab
- [ ] "Add Your Rule" button disappears

### Leave Pact
- [ ] Open planning pact as non-creator member
- [ ] "Leave Pact" option visible
- [ ] Click Leave Pact
- [ ] Confirmation dialog appears
- [ ] Confirm leave
- [ ] Toast shows "You have left the pact"
- [ ] Redirected to home
- [ ] Pact no longer in your "Setting Up" section
- [ ] Pact now visible in Discover feed

### Creator Cannot Leave
- [ ] As pact creator, verify "Leave Pact" option NOT visible
- [ ] Creator can only delete the pact (separate flow)

## Profile Viewing

### View Other User's Profile
- [ ] Go to Discover > People tab
- [ ] Click on a user card
- [ ] Profile loads without 500 error
- [ ] Name, avatar, bio visible
- [ ] Proofs grid shows (if user has public proofs)
- [ ] Friend button works

### View Own Profile
- [ ] Navigate to Profile tab
- [ ] Profile loads correctly
- [ ] All sections visible
- [ ] Edit profile works

## Console Errors Audit
- [ ] No unhandled 500 errors in Network tab
- [ ] No JavaScript errors in Console
- [ ] No "Failed to fetch" without user-visible feedback
