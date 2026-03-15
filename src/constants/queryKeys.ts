/**
 * @file queryKeys.ts
 * @description Centralized React Query key constants for cache consistency
 */

export const QUERY_KEYS = {
  emailTemplates: (userId: string | undefined) => ['email-templates', userId] as const,
  emailSignature: (userId: string | undefined) => ['email-signature', userId] as const,
  notificationSettings: (userId: string | undefined) => ['notification-settings', userId] as const,
} as const;
