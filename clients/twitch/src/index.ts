/// <reference types="@discern/types" />

type PollOptions = Parameters<typeof Discern.get>[1];
import {
  NotificationMessage,
  SendChatMessageResponse,
  TokenId,
  TokenSnapshotResponse,
  type TokenRequest,
} from "./types";

export class Twitch {
  static plugin: Discern.Plugin | null = null;

  readonly #tokenId: TokenId;

  /**
   * Retrieves the twitch client for the given token.
   *
   * This method first retrieves a reference to the Twitch plugin, then
   * attempts to verify that a token with the given name exists. If the token
   * does not exist, an error is thrown.
   *
   * Then, the client is constructed, and the token is used to authenticate
   * the client.
   *
   * @param name
   */
  static async forToken(
    name: string,
    options: PollOptions = undefined
  ): Promise<Twitch> {
    if (!this.plugin) {
      this.plugin = await Discern.get("@discern/twitch", options);
    }

    const tokenId = name as TokenId;
    // We do this for the side effects, to ensure that we _can_ get a snapshot
    // of the token.
    await snapshot(tokenId);

    return new Twitch(tokenId);
  }

  constructor(tokenId: TokenId) {
    this.#tokenId = tokenId;
  }

  get tokenId() {
    return this.#tokenId;
  }

  async ownChannelMessages(
    options?: Discern.SubscriptionCreateOptions
  ): Promise<Discern.Subscription<NotificationMessage["payload"]>> {
    const tokenData = await snapshot(this.#tokenId);
    // TODO: scope check
    const subscription = await Twitch.plugin!.output<
      NotificationMessage["payload"]
    >("channel.chat.message", options);
    try {
      await Twitch.plugin!.ask<TokenRequest>("token", {
        action: "configureSubscription",
        token: this.#tokenId,
        subscription: {
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: tokenData.userId,
            user_id: tokenData.userId,
          },
        },
      });
      return subscription;
    } catch (e) {
      await subscription.close();
      throw e;
    }
  }

  get chat() {
    return new Chat(this);
  }
}

class Chat {
  #twitch: Twitch;
  constructor(twitch: Twitch) {
    this.#twitch = twitch;
  }

  async sendChatMessage({
    broadcasterId,
    message,
    replyTo,
  }: {
    broadcasterId?: TokenId;
    message: string;
    replyTo?: string;
  }) {
    if (!Twitch.plugin) {
      throw new Error("Twitch plugin not loaded?");
    }
    const senderSnapshot = await Twitch.plugin.ask<
      TokenRequest,
      TokenSnapshotResponse
    >("token", {
      action: "tokenSnapshot",
      token: this.#twitch.tokenId,
    });
    let broadcasterSnapshot: Discern.Message<TokenSnapshotResponse>;
    if (broadcasterId && broadcasterId !== this.#twitch.tokenId) {
      broadcasterSnapshot = await Twitch.plugin.ask<
        TokenRequest,
        TokenSnapshotResponse
      >("token", {
        action: "tokenSnapshot",
        token: broadcasterId,
      });
    } else {
      broadcasterSnapshot = senderSnapshot;
    }

    if ("$error" in senderSnapshot.contents) {
      throw new Error(
        `Failed to get sender token: ${senderSnapshot.contents.$error}`
      );
    } else if ("$error" in broadcasterSnapshot.contents) {
      throw new Error(
        `Failed to get broadcaster token: ${broadcasterSnapshot.contents.$error}`
      );
    }

    const sender = senderSnapshot.contents;
    const broadcaster = broadcasterSnapshot.contents;

    if (!sender.scopes.includes("user:write:chat")) {
      throw new Error("Sender is missing the user:write:chat scope");
    }

    const response = await fetch("https://api.twitch.tv/helix/chat/messages", {
      method: "POST",
      headers: [
        ["Authorization", `Bearer ${sender.accessToken}`],
        ["Client-Id", sender.clientId],
        ["Content-Type", "application/json"],
      ],
      body: JSON.stringify({
        broadcaster_id: broadcaster.userId,
        sender_id: sender.userId,
        message,
        reply_parent_message_id: replyTo,
      }),
    });

    if (response.status === 200) {
      const data = SendChatMessageResponse.parse(await response.json());
      return data;
    } else if (response.status === 429) {
      throw new Error("Rate Limited!");
    } else {
      const body = await response.json();
      console.warn({ response, body });
      throw new Error("Failed to send message");
    }
  }
}

async function snapshot(tokenId: TokenId) {
  if (!Twitch.plugin) {
    throw new Error("Twitch plugin not loaded?");
  }
  const response = await Twitch.plugin.ask<TokenRequest>("token", {
    action: "tokenSnapshot",
    token: tokenId,
  });

  if (
    response.contents &&
    typeof response.contents === "object" &&
    "$error" in response.contents
  ) {
    // TODO: enumerate errors, throw respective exceptions.
    const error = response.contents.$error;
    throw new Error(`Token ${tokenId} is invalid: ${error}`);
  }

  const result = TokenSnapshotResponse.parse(response.contents);
  return result;
}
