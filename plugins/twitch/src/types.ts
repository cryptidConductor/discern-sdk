import { z } from "zod";

function Metadata<T extends z.ZodType<string>>(type: T) {
  return z
    .object({
      message_id: z.string(),
      message_type: type,
      message_timestamp: z.string().datetime(),
      subscription_type: z.string().optional(),
      subscription_version: z.string().optional(),
    })
    .transform((data) => ({
      /**
       * A unique ID for the message.
       *
       * We should always check to ensure that the message ID is unique, as
       * Twitch follows an at-least-once delivery here.
       */
      messageId: data.message_id,
      /**
       * The type of message that we're receiving.
       *
       * This can be dictated by the `T` parameter, which should be a string
       * that represents the type of message that we're receiving.  We can use
       * this for type checking, and to ensure that we're handling the right
       * type of message.
       */
      messageType: data.message_type as T["_output"],
      /**
       * A timestamp for when the message was received.
       *
       * In RFC3339 format, with nanosecond precision.  This should be used to
       * determine how long ago the message was received, and to ensure that
       * we're not processing messages that are too old.
       */
      messageTimestamp: data.message_timestamp,

      subscriptionType: data.subscription_type,
      subscriptionVersion: data.subscription_version,
    }));
}

const WelcomeMessageSession = z
  .object({
    id: z.string(),
    status: z.string(), // this should almost always be "connected"
    keepalive_timeout_seconds: z.number(),
    reconnect_url: z.null(),
    connected_at: z.coerce.date(),
  })
  .transform((data) => ({
    id: data.id,
    status: data.status,
    keepaliveTimeoutSeconds: data.keepalive_timeout_seconds,
    reconnectUrl: data.reconnect_url,
    connectedAt: data.connected_at,
  }));

export const WelcomeMessage = z.object({
  metadata: Metadata(z.literal("session_welcome")),
  payload: z.object({
    session: WelcomeMessageSession,
  }),
});

export interface WelcomeMessage extends z.infer<typeof WelcomeMessage> {}

export const KeepaliveMessage = z.object({
  metadata: Metadata(z.literal("session_keepalive")),
  payload: z.object({}),
});

export interface KeepaliveMessage extends z.infer<typeof KeepaliveMessage> {}

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
      transport: z
        .object({
          method: z.literal("websocket"),
          session_id: z.string(),
        })
        .transform((data) => ({
          method: data.method,
          sessionId: data.session_id,
        })),
    }),
    event: z.unknown(),
  }),
});

export interface NotificationMessage
  extends z.infer<typeof NotificationMessage> {}

const reconnectMessageSession = z
  .object({
    id: z.string(),
    status: z.literal("reconnecting"),
    keepalive_timeout_seconds: z.null(),
    reconnect_url: z.string(),
    connected_at: z.date(),
  })
  .transform((data) => ({
    id: data.id,
    status: data.status,
    keepaliveTimeoutSeconds: data.keepalive_timeout_seconds,
    reconnectUrl: data.reconnect_url,
    connectedAt: data.connected_at,
  }));

export const ReconnectMessage = z.object({
  metadata: Metadata(z.literal("session_reconnect")),
  payload: z.object({
    session: reconnectMessageSession,
  }),
});

export interface ReconnectMessage extends z.infer<typeof ReconnectMessage> {}

export const EventSubMessage = z.union([
  WelcomeMessage,
  KeepaliveMessage,
  NotificationMessage,
  ReconnectMessage,
]);

export type EventSubMessage = z.infer<typeof EventSubMessage>;

export const Message = {
  isWelcome: (message: EventSubMessage): message is WelcomeMessage => {
    return message.metadata.messageType === "session_welcome";
  },
  isKeepalive: (message: EventSubMessage): message is KeepaliveMessage => {
    return message.metadata.messageType === "session_keepalive";
  },
  isNotification: (
    message: EventSubMessage
  ): message is NotificationMessage => {
    return message.metadata.messageType === "notification";
  },
  isReconnect: (message: EventSubMessage): message is ReconnectMessage => {
    return message.metadata.messageType === "session_reconnect";
  },
};

export const SubscriptionRequest = z.object({
  type: z.string(),
  version: z.string().default("1"),
  condition: z.record(z.string()),
});

export type SubscriptionRequest = z.infer<typeof SubscriptionRequest>;

export const ConfigureRequest = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    token: z.string(),
    subscription: SubscriptionRequest,
  }),
]);

export type ConfigureRequest = z.infer<typeof ConfigureRequest>;
