import { z } from "zod";

export const TokenId = z.string().brand("TokenId");
export type TokenId = z.infer<typeof TokenId>;

export function Metadata<T extends z.ZodType<string>>(type: T) {
  return z.object({
    /**
     * A unique ID for the message.
     *
     * We should always check to ensure that the message ID is unique, as
     * Twitch follows an at-least-once delivery here.
     */
    message_id: z.string(),
    /**
     * The type of message that we're receiving.
     *
     * This can be dictated by the `T` parameter, which should be a string
     * that represents the type of message that we're receiving.  We can use
     * this for type checking, and to ensure that we're handling the right
     * type of message.
     */
    message_type: type,
    /**
     * A timestamp for when the message was received.
     *
     * In RFC3339 format, with nanosecond precision.  This should be used to
     * determine how long ago the message was received, and to ensure that
     * we're not processing messages that are too old.
     */
    message_timestamp: z.string().datetime(),
    subscription_type: z.string().optional(),
    subscription_version: z.string().optional(),
  });
}

export const NotificationMessage = z.object({
  metadata: Metadata(z.literal("notification")),
  payload: z.object({
    subscription: z.object({
      id: z.string(),
      status: z.literal("enabled"),
      type: z.string(),
      version: z.string(),
      cost: z.number(),
      condition: z.unknown(),
      transport: z.object({
        method: z.literal("websocket"),
        session_id: z.string(),
      }),
    }),
    event: z.unknown(),
  }),
});

export interface NotificationMessage
  extends z.infer<typeof NotificationMessage> {}

export const ConfigureSubscriptionRequest = z.object({
  action: z.literal("configureSubscription"),
  token: TokenId,
  subscription: z.object({
    type: z.string(),
    version: z.string().default("1"),
    condition: z.record(z.string()),
  }),
});

/**
 * A request to create a subscription for a token.
 *
 * This will create a subscription for the given token from the Twitch
 * EventSub.  This will allow us to receive notifications for the given
 * subscription type.
 */
export type ConfigureSubscriptionRequest = z.infer<
  typeof ConfigureSubscriptionRequest
>;

export const TokenSnapshotRequest = z.object({
  action: z.literal("tokenSnapshot"),
  token: TokenId,
});
/**
 * A request to get a snapshot of the token.
 *
 * This will return the current status of the token, including the scopes
 * that it has, and when it expires.  This can be used to make API requests
 * to the Twitch API.
 */
export type TokenSnapshotRequest = z.infer<typeof TokenSnapshotRequest>;

export const TokenRequest = z.discriminatedUnion("action", [
  TokenSnapshotRequest,
  ConfigureSubscriptionRequest,
]);
export type TokenRequest = z.infer<typeof TokenRequest>;

export const TokenSnapshotResponse = z.object({
  accessToken: z.string(),
  clientId: z.string(),
  login: z.string(),
  scopes: z.array(z.string()),
  userId: z.string(),
  expiresAt: z.string().datetime(),
});

export type TokenSnapshotResponse = z.infer<typeof TokenSnapshotResponse>;
