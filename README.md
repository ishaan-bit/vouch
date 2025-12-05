# Vouch

**Strength through Unity · Unity through Faith**

A social accountability app where friends create short-duration rule groups, stake money, upload proofs, and hold ritual review calls to decide who followed whose rules. Money moves peer-to-peer via UPI.

## Features

- 👥 **Groups**: Create groups with friends (2-6 people) for 1-7 day challenges
- 📜 **Rules**: Each member creates one rule for another member
- 📸 **Proofs**: Upload daily proofs (photos, videos, text) showing you followed the rules
- 📞 **Review Calls**: End-of-cycle video calls where everyone votes on whether rules were followed
- 💸 **Settlements**: P2P UPI payments - if you vote YES that someone followed your rule, you pay them

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (Turso for production)
- **Auth**: NextAuth.js v5 (Credentials + Google OAuth)
- **Styling**: TailwindCSS + shadcn/ui
- **State**: TanStack React Query
- **Realtime**: Socket.io
- **Storage**: Firebase Storage
- **Hosting**: Vercel
- **Payments**: UPI intent URLs (P2P, no pooling)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- (Optional) Google OAuth credentials
- (Optional) Firebase project for storage

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vouch.git
cd vouch
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values (see `.env.example` for all options)

4. Set up the database:
```bash
npx prisma db push
npx prisma generate
```

5. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel (Frontend + API)

1. Push your code to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `AUTH_SECRET`
   - `NEXTAUTH_URL` (your production URL)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `DATABASE_URL` (Turso URL)
   - `DATABASE_AUTH_TOKEN` (Turso auth token)
   - `NEXT_PUBLIC_FIREBASE_*` (Firebase config)
4. Deploy!

### Turso (Database)

1. Create account at [turso.tech](https://turso.tech)
2. Create a new database:
```bash
turso db create vouch-prod
turso db show vouch-prod --url  # Get DATABASE_URL
turso db tokens create vouch-prod  # Get DATABASE_AUTH_TOKEN
```
3. Push schema:
```bash
DATABASE_URL="libsql://..." npx prisma db push
```

### Firebase (Storage)

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable Storage in the Firebase console
3. Get config from Project Settings > General
4. Set up Storage rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Core Game Loop

1. **Create Group**: Invite 1-5 friends, set duration (1-7 days)
2. **Add Rules**: Each member creates one rule for another member
3. **Approve Rules**: Everyone must approve all rules before starting
4. **Group Starts**: Clock begins, members upload daily proofs
5. **Review Call**: At end of cycle, everyone joins a call
6. **Voting**: For each rule, the creator votes YES/NO if target followed
7. **Settlements**: If YES, creator pays target the stake amount via UPI

## Payment Logic

- **No pooling**: Money never touches the platform
- **P2P via UPI**: Direct payments using UPI intent URLs
- **Mark & Confirm**: Payer marks as paid, recipient confirms receipt
- **Rule-based**: Payment = stakes for rules you voted YES on

## License

MIT
