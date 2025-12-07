# Vouch App - Complete Overview

A social accountability platform where friends create **pacts** with rules and stakes, submit proofs, and vote on each other's compliance.

---

## Table of Contents

1. [Core User Flow](#core-user-flow)
2. [Authentication System](#authentication-system)
3. [Home Dashboard](#home-dashboard)
4. [Pacts (Groups) System](#pacts-groups-system)
5. [Rules System](#rules-system)
6. [Proofs System](#proofs-system)
7. [Voting System](#voting-system)
8. [Payments & Settlements](#payments--settlements)
9. [Social Features](#social-features)
10. [Discover Feed](#discover-feed)
11. [Profile System](#profile-system)
12. [File Uploads](#file-uploads)
13. [Database Schema](#database-schema)
14. [Tech Stack](#tech-stack)
15. [API Routes Summary](#api-routes-summary)
16. [Key User Journeys](#key-user-journeys)

---

## Core User Flow

```
Landing → Sign In → Home Dashboard → Create/Join Pact → Add Rules → 
Lock In → Submit Proofs → Vote on Others → Cycle Ends → Settle Payments → Repeat
```

---

## Authentication System

**Location:** `/src/app/auth/`, `/src/lib/auth.ts`

### Providers
| Provider | Description |
|----------|-------------|
| **Google OAuth** | Primary sign-in method |
| **Credentials** | Email + password (bcrypt hashed) |

### Key Pages
- `/auth/signin` - Sign in with Google or Email
- `/auth/signup` - Create account with email/password
- `/auth/signout` - Sign out confirmation

### Auth Flow
1. User clicks "Begin the Pact" on landing page
2. Redirects to `/auth/signin`
3. User chooses Google or Email sign-in
4. On success, redirects to `/home`
5. Session stored via NextAuth JWT strategy

---

## Home Dashboard

**Location:** `/src/app/home/page.tsx`, `/src/components/home/`

### Features
- **My Pacts** - Grid of pacts user is part of
- **Active Cycles** - Pacts with ongoing cycles
- **Pending Actions** - Proofs to submit, votes needed
- **Quick Stats** - Compliance rate, streaks

### Navigation
- Bottom nav bar with: Home, Discover, Friends, Messages, Profile

---

## Pacts (Groups) System

**Location:** `/src/app/groups/`, `/src/components/groups/`

### Pact Lifecycle

```
PLANNING → ACTIVE → (cycles repeat) → COMPLETED/ABANDONED
```

| Status | Description |
|--------|-------------|
| **PLANNING** | Creator invites members, everyone adds rules, sets stakes |
| **ACTIVE** | Pact is "locked in", cycles run, proofs submitted |
| **COMPLETED** | All cycles finished successfully |
| **ABANDONED** | Pact cancelled or failed |

### Key Actions

#### Creating a Pact
1. Click "Create Pact" on home
2. Set name, description, cover image
3. Configure: stake amount, cycle length, total cycles
4. Invite friends (search by username)
5. Add your rules
6. Wait for others to join and add rules
7. Click "Lock In" when ready

#### Joining a Pact
1. Receive invite notification
2. View pact details
3. Accept invite
4. Add your rules during planning
5. Wait for creator to lock in

#### Leaving a Pact (Planning Only)
- Non-creators can leave during planning
- Their rules are deleted
- Cannot leave after lock-in

### Pact Detail View
- **Header:** Cover image, name, status badge
- **Members:** Avatars, compliance scores
- **Rules:** All rules from all members
- **Cycles:** Timeline of past/current cycles
- **Chat:** Group messaging

---

## Rules System

**Location:** `/src/app/api/rules/`, `/src/components/groups/add-rule-dialog.tsx`

### Rule Structure
```typescript
{
  id: string
  title: string           // e.g., "Exercise 30 mins daily"
  description: string     // Detailed explanation
  frequency: "DAILY" | "WEEKLY" | "CUSTOM"
  proofType: "IMAGE" | "VIDEO" | "TEXT" | "LOCATION"
  creatorId: string       // Who created this rule
  groupId: string         // Which pact it belongs to
}
```

### Rule Features
- Each member adds their own rules
- Rules define what proof type is needed
- Frequency determines how often proofs are due
- Rules are linked to proofs via `ProofRuleLink`

---

## Proofs System

**Location:** `/src/app/api/proofs/`, `/src/components/proofs/`

### Proof Submission
1. User selects which rule to prove
2. Uploads media (image/video) or text
3. Adds optional caption
4. Submits for group to vote on

### Proof Structure
```typescript
{
  id: string
  userId: string
  groupId: string
  cycleId: string
  mediaUrl: string        // Vercel Blob URL
  mediaType: "IMAGE" | "VIDEO" | "TEXT"
  caption: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: DateTime
}
```

### Proof States
| Status | Description |
|--------|-------------|
| **PENDING** | Awaiting votes |
| **APPROVED** | Majority voted YES |
| **REJECTED** | Majority voted NO |

---

## Voting System

**Location:** `/src/app/api/votes/`, `/src/components/proofs/proof-card.tsx`

### How Voting Works
1. Member submits proof
2. Other members see it in their feed
3. Each member votes YES or NO
4. Simple majority determines outcome
5. Results affect compliance score

### Vote Structure
```typescript
{
  id: string
  oderId
  oderId
  oderId
  oderId
  oderId
  proofId: string
  voterId: string
  vote: "YES" | "NO"
  createdAt: DateTime
}
```

### End-of-Cycle Voting
- At cycle end, final compliance is calculated
- Members vote on overall cycle success
- Affects stake distribution

---

## Payments & Settlements

**Location:** `/src/app/api/settlements/`, `/src/components/settlements/`

### Stake System
- Each pact has a stake amount (set during planning)
- All members commit the same stake
- Stakes held virtually during pact

### Settlement Logic
At end of each cycle:
1. Calculate each member's compliance %
2. Members below threshold lose portion of stake
3. Compliant members split the pool
4. Final cycle settles all remaining stakes

### Settlement States
| Status | Description |
|--------|-------------|
| **PENDING** | Awaiting calculation |
| **CALCULATED** | Amounts determined |
| **PAID** | Transfers completed |
| **DISPUTED** | Under review |

---

## Social Features

### Friends System

**Location:** `/src/app/friends/`, `/src/app/api/friendships/`

#### Friend States
```
PENDING → ACCEPTED (or REJECTED/BLOCKED)
```

#### Features
- Send friend requests by username
- Accept/reject incoming requests
- View friends list
- Unfriend users
- Block users

### Direct Messages (DMs)

**Location:** `/src/app/messages/`, `/src/app/api/dm/`

#### Features
- 1-on-1 messaging with friends
- Real-time updates (30s polling)
- Media attachments (images, video)
- Voice messages
- Message timestamps

#### DM Structure
```typescript
// DMThread - conversation between two users
{
  id: string
  user1Id: string
  user2Id: string
  lastMessageAt: DateTime
}

// ChatMessage - individual message
{
  id: string
  dmThreadId: string      // For DMs
  groupId: string         // For group chat
  senderId: string
  content: string
  mediaUrl: string
  mediaType: "IMAGE" | "VIDEO" | "AUDIO"
}
```

### Notifications

**Location:** `/src/app/api/notifications/`

#### Notification Types
- Friend request received
- Friend request accepted
- Invited to pact
- Proof needs your vote
- Your proof was approved/rejected
- Cycle ending soon
- Settlement ready

---

## Discover Feed

**Location:** `/src/app/discover/`, `/src/app/api/discover/`

### Features
- Browse public pacts
- See trending pacts
- Filter by category
- Search pacts
- View pact previews before joining

### Visibility
- Pacts can be PUBLIC or PRIVATE
- Public pacts appear in discover
- Private pacts are invite-only

---

## Profile System

**Location:** `/src/app/profile/`, `/src/app/[username]/`

### Profile Data
```typescript
{
  username: string        // Unique, URL-friendly
  name: string
  bio: string
  image: string           // Avatar URL
  coverImage: string
  stats: {
    pactsCompleted: number
    complianceRate: number
    currentStreak: number
  }
}
```

### Profile Features
- View own profile at `/profile`
- View others at `/@username` or `/profile/[username]`
- Edit profile (name, bio, avatar, cover)
- See pact history
- View proof gallery
- Privacy settings

---

## File Uploads

**Location:** `/src/app/api/upload/`

### Vercel Blob Storage
- Images, videos, audio stored in Vercel Blob
- Max file size: 50MB
- Supported types: image/*, video/*, audio/*

### Upload Flow
1. Client selects file
2. POST to `/api/upload` with FormData
3. Server uploads to Vercel Blob
4. Returns public URL
5. URL stored in database

### Usage
- Profile avatars/covers
- Pact cover images
- Proof media
- DM attachments
- Voice messages

---

## Database Schema

**Location:** `/prisma/schema.prisma`

### Core Models

```
User
├── id, email, username, name, image
├── hashedPassword (for credentials auth)
└── relationships: groups, proofs, votes, friendships, messages

Group (Pact)
├── id, name, description, coverImage
├── status: PLANNING | ACTIVE | COMPLETED | ABANDONED
├── stakeAmount, cycleLength, totalCycles
├── creatorId
└── relationships: members, rules, cycles, messages

GroupMember
├── userId, groupId
├── role: CREATOR | MEMBER
├── joinedAt, compliance
└── relationships: user, group

Rule
├── id, title, description
├── frequency, proofType
├── creatorId, groupId
└── relationships: creator, group, proofs

Cycle
├── id, groupId, cycleNumber
├── startDate, endDate
├── status: ACTIVE | COMPLETED
└── relationships: group, proofs

Proof
├── id, userId, groupId, cycleId
├── mediaUrl, mediaType, caption
├── status: PENDING | APPROVED | REJECTED
└── relationships: user, group, cycle, votes, rules

Vote
├── id, proofId, oderId
├── vote: YES | NO
└── relationships: proof, oter

Friendship
├── id, requesterId, addresseeId
├── status: PENDING | ACCEPTED | REJECTED | BLOCKED
└── relationships: requester, addressee

DMThread
├── id, user1Id, user2Id
├── lastMessageAt
└── relationships: users, messages

ChatMessage
├── id, senderId
├── groupId (for group chat) OR dmThreadId (for DMs)
├── content, mediaUrl, mediaType
└── relationships: sender, group/thread

Notification
├── id, userId, type
├── message, read, data (JSON)
└── relationships: user
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | Turso (libSQL/SQLite) |
| **ORM** | Prisma with libSQL adapter |
| **Auth** | NextAuth.js v5 |
| **Storage** | Vercel Blob |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui |
| **State Management** | TanStack Query |
| **Deployment** | Vercel |
| **Icons** | Lucide React |

---

## API Routes Summary

### Auth
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/*` | ALL | NextAuth handlers |

### Users
| Route | Method | Description |
|-------|--------|-------------|
| `/api/users` | GET | Search users |
| `/api/users/[username]` | GET | Get user profile |
| `/api/users/profile` | PUT | Update own profile |

### Groups (Pacts)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/groups` | GET, POST | List/create pacts |
| `/api/groups/[id]` | GET, PUT, DELETE | Pact CRUD |
| `/api/groups/[id]/join` | POST | Join pact |
| `/api/groups/[id]/leave` | POST | Leave pact |
| `/api/groups/[id]/lock-in` | POST | Lock in pact |
| `/api/groups/[id]/members` | GET, POST | Manage members |
| `/api/groups/[id]/messages` | GET, POST | Group chat |

### Rules
| Route | Method | Description |
|-------|--------|-------------|
| `/api/rules` | POST | Create rule |
| `/api/rules/[id]` | PUT, DELETE | Update/delete rule |

### Proofs
| Route | Method | Description |
|-------|--------|-------------|
| `/api/proofs` | GET, POST | List/create proofs |
| `/api/proofs/[id]` | GET | Get proof details |
| `/api/proofs/[id]/vote` | POST | Vote on proof |

### Social
| Route | Method | Description |
|-------|--------|-------------|
| `/api/friendships` | GET, POST | List/send requests |
| `/api/friendships/[id]` | PUT, DELETE | Accept/reject/unfriend |
| `/api/dm` | GET | List DM threads |
| `/api/dm/[threadId]` | GET, POST | Get/send messages |
| `/api/dm/thread/[oderId]` | GET, POST | Get/create thread with user |

### Other
| Route | Method | Description |
|-------|--------|-------------|
| `/api/upload` | POST | Upload file |
| `/api/notifications` | GET, PUT | Get/mark read |
| `/api/discover` | GET | Discover pacts |

---

## Key User Journeys

### 1. New User Onboarding
```
1. Land on homepage
2. Click "Begin the Pact"
3. Sign up with Google or Email
4. Complete profile (username, bio)
5. Add friends or create first pact
```

### 2. Creating a Pact
```
1. Click "Create Pact" from home
2. Fill in pact details
3. Set stake amount and cycle config
4. Invite friends
5. Add your rules
6. Wait for others to add rules
7. Click "Lock In" to start
```

### 3. Daily Pact Participation
```
1. Check home for pending actions
2. Submit proof for today's rules
3. Vote on others' proofs
4. Chat with pact members
5. Track compliance progress
```

### 4. End of Cycle
```
1. Receive notification cycle ending
2. Submit any remaining proofs
3. Vote on final proofs
4. View compliance results
5. See stake settlement
6. Next cycle begins (if not final)
```

---

## Deployment URLs

- **Production:** `https://vouch-git-main-ishaans-projects-f5eaf242.vercel.app`
- **Database:** Turso at `libsql://vouch-db-ishaan-bit.aws-ap-south-1.turso.io`

---

## File Structure

```
quietden-vouch/
├── prisma/
│   └── schema.prisma           # Database schema
├── scripts/
│   └── push-to-turso.ts        # DB migration script
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   ├── auth/               # Auth pages
│   │   ├── discover/           # Discover feed
│   │   ├── friends/            # Friends management
│   │   ├── groups/             # Pact pages
│   │   ├── home/               # Home dashboard
│   │   ├── messages/           # DM interface
│   │   ├── profile/            # Profile pages
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config
│   │   ├── prisma.ts           # Prisma client
│   │   └── utils.ts            # Utilities
│   └── types/                  # TypeScript types
├── docs/
│   └── qa/                     # QA checklists
└── public/                     # Static assets
```

---

*Last updated: December 7, 2025*
