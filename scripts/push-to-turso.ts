// Script to push schema to Turso database
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

// Individual SQL statements as array
const statements: string[] = [
  // Users table
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" DATETIME,
    "name" TEXT,
    "image" TEXT,
    "username" TEXT UNIQUE,
    "password" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "upiId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Accounts table (OAuth)
  `CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,

  // ProfileStats table
  `CREATE TABLE IF NOT EXISTS "ProfileStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalPaid" INTEGER NOT NULL DEFAULT 0,
    "groupsCompleted" INTEGER NOT NULL DEFAULT 0,
    "groupsStarted" INTEGER NOT NULL DEFAULT 0,
    "trustScore" REAL NOT NULL DEFAULT 50,
    "rulesCreatedCount" INTEGER NOT NULL DEFAULT 0,
    "rulesCompletedCount" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProfileStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // Friendship table
  `CREATE TABLE IF NOT EXISTS "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_requesterId_receiverId_key" ON "Friendship"("requesterId", "receiverId")`,

  // DmThread table
  `CREATE TABLE IF NOT EXISTS "DmThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DmThread_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DmThread_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DmThread_userAId_userBId_key" ON "DmThread"("userAId", "userBId")`,

  // Sessions table
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // VerificationToken table
  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,

  // Authenticator table (WebAuthn)
  `CREATE TABLE IF NOT EXISTS "Authenticator" (
    "credentialID" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" INTEGER NOT NULL,
    "transports" TEXT,
    CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("userId", "credentialID")
  )`,

  // Groups table
  // Group table - drop and recreate with full schema
  `DROP TABLE IF EXISTS "Group"`,
  `CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "inviteCode" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 3,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isOpenToJoin" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // GroupMembership table - drop and recreate
  `DROP TABLE IF EXISTS "GroupMembership"`,
  `CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isReady" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "GroupMembership_userId_groupId_key" ON "GroupMembership"("userId", "groupId")`,

  // GroupInvite table
  `CREATE TABLE IF NOT EXISTS "GroupInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "createdById" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // Promise table
  `CREATE TABLE IF NOT EXISTS "Promise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stakeAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "proofType" TEXT NOT NULL DEFAULT 'VOTE',
    "proofUrl" TEXT,
    "proofSubmittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "creatorId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isStory" INTEGER NOT NULL DEFAULT 0,
    "storyExpiresAt" DATETIME,
    CONSTRAINT "Promise_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Promise_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // PromiseWitness table
  `CREATE TABLE IF NOT EXISTS "PromiseWitness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promiseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VOTER',
    "hasVoted" INTEGER NOT NULL DEFAULT 0,
    "vote" TEXT,
    "votedAt" DATETIME,
    CONSTRAINT "PromiseWitness_promiseId_fkey" FOREIGN KEY ("promiseId") REFERENCES "Promise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromiseWitness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PromiseWitness_promiseId_userId_key" ON "PromiseWitness"("promiseId", "userId")`,

  // Transaction table
  `CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "upiRefId" TEXT,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "promiseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_promiseId_fkey" FOREIGN KEY ("promiseId") REFERENCES "Promise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,

  // Notification table
  `CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" TEXT,
    "read" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "promiseId" TEXT,
    "groupId" TEXT,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_promiseId_fkey" FOREIGN KEY ("promiseId") REFERENCES "Promise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,

  // ChatRoom table
  `CREATE TABLE IF NOT EXISTS "ChatRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'GROUP',
    "groupId" TEXT UNIQUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatRoom_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // ChatMessage table - drop and recreate
  `DROP TABLE IF EXISTS "ChatMessage"`,
  `CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "replyToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,

  // ChatRoomParticipant table - drop and recreate
  `DROP TABLE IF EXISTS "ChatRoomParticipant"`,
  `CREATE TABLE "ChatRoomParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" DATETIME,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatRoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoomParticipant_roomId_userId_key" ON "ChatRoomParticipant"("roomId", "userId")`,

  // MessageReaction table - drop and recreate
  `DROP TABLE IF EXISTS "MessageReaction"`,
  `CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emoji" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji")`,

  // Proof table
  `CREATE TABLE IF NOT EXISTS "Proof" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "textContent" TEXT,
    "isPublic" INTEGER NOT NULL DEFAULT 1,
    "isStory" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proof_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proof_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // ProofRuleLink table
  `CREATE TABLE IF NOT EXISTS "ProofRuleLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proofId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    CONSTRAINT "ProofRuleLink_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Proof" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProofRuleLink_proofId_ruleId_key" ON "ProofRuleLink"("proofId", "ruleId")`,

  // ProofReaction table
  `CREATE TABLE IF NOT EXISTS "ProofReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proofId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProofReaction_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Proof" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProofReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProofReaction_proofId_userId_emoji_key" ON "ProofReaction"("proofId", "userId", "emoji")`,

  // Rule table - drop and recreate
  `DROP TABLE IF EXISTS "Rule"`,
  `CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stakeAmount" INTEGER NOT NULL,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rule_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // RuleApproval table - drop and recreate with correct column name
  `DROP TABLE IF EXISTS "RuleApproval"`,
  `CREATE TABLE "RuleApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RuleApproval_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RuleApproval_ruleId_approverId_key" ON "RuleApproval"("ruleId", "approverId")`,

  // JoinRequest table
  `CREATE TABLE IF NOT EXISTS "JoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JoinRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JoinRequest_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "JoinRequest_groupId_userId_key" ON "JoinRequest"("groupId", "userId")`,

  // CallSession table
  `CREATE TABLE IF NOT EXISTS "CallSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // RuleVote table
  `CREATE TABLE IF NOT EXISTS "RuleVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callSessionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RuleVote_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "CallSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleVote_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleVote_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RuleVote_callSessionId_ruleId_voterId_targetUserId_key" ON "RuleVote"("callSessionId", "ruleId", "voterId", "targetUserId")`,

  // PaymentObligation table
  `CREATE TABLE IF NOT EXISTS "PaymentObligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "callSessionId" TEXT,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentObligation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentObligation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentObligation_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "CallSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentObligation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentObligation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PaymentObligation_groupId_ruleId_fromUserId_toUserId_key" ON "PaymentObligation"("groupId", "ruleId", "fromUserId", "toUserId")`,

  // Notification table - drop and recreate with correct schema
  `DROP TABLE IF EXISTS "Notification"`,
  `CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "data" TEXT,
    "isRead" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
];

async function pushSchema() {
  console.log("🚀 Connecting to Turso database...");
  console.log(`   URL: ${url}\n`);

  console.log(`📦 Executing ${statements.length} SQL statements...\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 50).replace(/\s+/g, " ").trim();
    try {
      await client.execute(stmt);
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      success++;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message?.includes("already exists")) {
        console.log(`⏭️  [${i + 1}/${statements.length}] Already exists: ${preview}...`);
        skipped++;
      } else {
        console.error(`❌ [${i + 1}/${statements.length}] Failed: ${preview}...`);
        console.error(`   Error: ${error.message}`);
        failed++;
      }
    }
  }

  // Verify tables were created
  console.log("\n📋 Verifying tables...");
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("\n✅ Tables in database:");
  tables.rows.forEach((row) => console.log(`   - ${row.name}`));

  console.log(`\n📊 Summary: ${success} created, ${skipped} skipped, ${failed} failed`);
  console.log("\n🎉 Schema push complete!");
}

pushSchema();
