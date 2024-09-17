import { z } from "zod";
import { Connection } from "./connection";
import { Token } from "./token";
import {
  Metadata,
  NotificationMessage,
  ConfigureSubscriptionRequest,
} from "@discern/twitch/types";

export interface Account {
  token: Token;
  requests: ConfigureSubscriptionRequest["subscription"][];
  connection: Connection | null;
}

const WelcomeMessageSession = z.object({
  id: z.string(),
  status: z.string(), // this should almost always be "connected"
  keepalive_timeout_seconds: z.number(),
  reconnect_url: z.null(),
  connected_at: z.coerce.date(),
});

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

const reconnectMessageSession = z.object({
  id: z.string(),
  status: z.literal("reconnecting"),
  keepalive_timeout_seconds: z.null(),
  reconnect_url: z.string(),
  connected_at: z.date(),
});

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
    return message.metadata.message_type === "session_welcome";
  },
  isKeepalive: (message: EventSubMessage): message is KeepaliveMessage => {
    return message.metadata.message_type === "session_keepalive";
  },
  isNotification: (
    message: EventSubMessage
  ): message is NotificationMessage => {
    return message.metadata.message_type === "notification";
  },
  isReconnect: (message: EventSubMessage): message is ReconnectMessage => {
    return message.metadata.message_type === "session_reconnect";
  },
};
