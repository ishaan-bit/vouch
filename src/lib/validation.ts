import { z } from "zod";

/**
 * Validation schemas for QuietDen: Vouch
 */

// User
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores");

export const emailSchema = z.string().email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const upiIdSchema = z
  .string()
  .regex(/^[\w.-]+@[\w]+$/, "Invalid UPI ID format (e.g., user@upi)")
  .optional()
  .or(z.literal(""));

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(50),
  username: usernameSchema.optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  username: usernameSchema.optional(),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().optional(),
  upiId: upiIdSchema,
});

// Group
export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50),
  description: z.string().max(200).optional(),
  durationDays: z.number().int().min(1, "Minimum duration is 1 day").max(90, "Maximum duration is 90 days").default(7),
});

export const inviteMembersSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1, "Invite at least one member"),
});

// Rule
export const createRuleSchema = z.object({
  groupId: z.string().cuid(),
  title: z.string().min(1, "Rule title is required").max(50).optional(),
  description: z.string().min(5, "Rule description must be at least 5 characters").max(200),
  stakeAmount: z
    .number()
    .int()
    .min(100, "Minimum stake is ₹1") // 1 rupee in paise
    .max(10000000, "Maximum stake is ₹100,000"), // 100000 rupees in paise
});

export const approveRuleSchema = z.object({
  ruleId: z.string().cuid(),
  approved: z.boolean(),
});

// Proof
export const createProofSchema = z.object({
  groupId: z.string().cuid(),
  dayIndex: z.number().int().min(1),
  caption: z.string().max(500).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO", "TEXT", "LINK"]),
  mediaUrl: z.string().min(1).optional(), // Relative paths or full URLs allowed
  textContent: z.string().max(2000).optional(),
  ruleIds: z.array(z.string().cuid()).min(1, "Select at least one rule"),
  isPublic: z.boolean().default(true),
  isStory: z.boolean().default(false), // 24h ephemeral story
});

// Vote
export const submitVoteSchema = z.object({
  callSessionId: z.string().cuid(),
  targetUserId: z.string().cuid(),
  ruleId: z.string().cuid(),
  vote: z.enum(["YES", "NO"]),
});

export const submitVotesSchema = z.object({
  callSessionId: z.string().cuid(),
  votes: z.array(
    z.object({
      targetUserId: z.string().cuid(),
      ruleId: z.string().cuid(),
      vote: z.enum(["YES", "NO"]),
    })
  ),
});

// Chat
export const sendMessageSchema = z.object({
  groupId: z.string().cuid().optional(),
  dmThreadId: z.string().cuid().optional(),
  content: z.string().min(1).max(2000),
  mediaUrl: z.string().url().optional(),
}).refine(
  (data) => data.groupId || data.dmThreadId,
  "Either groupId or dmThreadId is required"
);

// Payment
export const markPaidSchema = z.object({
  obligationId: z.string().cuid(),
});

export const confirmPaymentSchema = z.object({
  obligationId: z.string().cuid(),
});

// Friend request
export const friendRequestSchema = z.object({
  receiverId: z.string().cuid(),
});

export const respondFriendRequestSchema = z.object({
  friendshipId: z.string().cuid(),
  accept: z.boolean(),
});

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type CreateProofInput = z.infer<typeof createProofSchema>;
export type SubmitVoteInput = z.infer<typeof submitVoteSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
