/// <reference types="@discern/types" />

type PollOptions = Parameters<typeof Discern.get>[1];
import { ZodType } from "zod";
import {
  Ads,
  Analytics,
  Bits,
  CcLs,
  ChannelPoints,
  Channels,
  Charity,
  Chat,
  Clips,
  Conduits,
  Entitlements,
  Extensions,
  Games,
  Goals,
  GuestStar,
  HypeTrain,
  Moderation,
  Polls,
  Predictions,
  Raids,
  Schedule,
  Search,
  Streams,
  Subscriptions,
  Tags,
  Teams,
  Users,
  Videos,
  Whispers,
} from "./api";
import {
  NotificationMessage,
  TokenId,
  TokenSnapshotResponse,
  type TokenRequest,
} from "./types";

export class Twitch {
  static plugin: Discern.Plugin | null = null;

  readonly #tokenId: TokenId;
  #snapshot: TokenSnapshotResponse | null = null;

  base: string = "https://api.twitch.tv/helix";

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

  async snapshot() {
    if (this.#snapshot) {
      return this.#snapshot;
    }

    const shot = await snapshot(this.#tokenId);
    this.#snapshot = shot;
    setTimeout(() => (this.#snapshot = null), 10);
    return shot;
  }

  async userId() {
    const snapshot = await this.snapshot();
    return snapshot.userId;
  }

  async request<Out>(
    url: URL,
    req: RequestInit,
    type?: ZodType<Out, any, any>
  ): Promise<Out> {
    const snapshot = await this.snapshot();
    req.headers = [
      ["Client-Id", snapshot.clientId],
      ["Authorization", `Bearer ${snapshot.accessToken}`],
    ];
    if (req.body) {
      req.headers.push(["Content-Type", "application/json"]);
    }
    const response = await fetch(url, req);
    if (response.ok) {
      if (type) {
        return type.parse(await response.json());
      }
      return await response.json();
    } else if (response.status === 429) {
      // TODO
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        await new Promise((resolve) =>
          setTimeout(resolve, parseInt(retryAfter))
        );
        return this.request(url, req, type);
      } else {
        // TODO better error
        throw new Error("Rate limited");
      }
    } else {
      throw new Error("bad request");
    }
  }

  async requestDownload(url: URL, req: RequestInit): Promise<Response> {
    const snapshot = await this.snapshot();
    req.headers = [
      ["Client-Id", snapshot.clientId],
      ["Authorization", `Bearer ${snapshot.accessToken}`],
    ];
    if (req.body) {
      req.headers.push(["Content-Type", "application/json"]);
    }
    const response = await fetch(url, req);
    if (response.ok) {
      return response;
    } else if (response.status === 429) {
      // TODO
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        await new Promise((resolve) =>
          setTimeout(resolve, parseInt(retryAfter))
        );
        return this.requestDownload(url, req);
      } else {
        // TODO better error
        throw new Error("Rate limited");
      }
    } else {
      throw new Error("bad request");
    }
  }

  get channels() {
    return new Channels(this);
  }
  get schedule() {
    return new Schedule(this);
  }
  get analytics() {
    return new Analytics(this);
  }
  get goals() {
    return new Goals(this);
  }
  get chat() {
    return new Chat(this);
  }
  get channelPoints() {
    return new ChannelPoints(this);
  }
  get subscriptions() {
    return new Subscriptions(this);
  }
  get guestStar() {
    return new GuestStar(this);
  }
  get games() {
    return new Games(this);
  }
  get streams() {
    return new Streams(this);
  }
  get raids() {
    return new Raids(this);
  }
  get entitlements() {
    return new Entitlements(this);
  }
  get hypeTrain() {
    return new HypeTrain(this);
  }
  get conduits() {
    return new Conduits(this);
  }
  get polls() {
    return new Polls(this);
  }
  get whispers() {
    return new Whispers(this);
  }
  get predictions() {
    return new Predictions(this);
  }
  get search() {
    return new Search(this);
  }
  get tags() {
    return new Tags(this);
  }
  get moderation() {
    return new Moderation(this);
  }
  get users() {
    return new Users(this);
  }
  get videos() {
    return new Videos(this);
  }
  get ccLs() {
    return new CcLs(this);
  }
  get charity() {
    return new Charity(this);
  }
  get teams() {
    return new Teams(this);
  }
  get ads() {
    return new Ads(this);
  }
  get bits() {
    return new Bits(this);
  }
  get extensions() {
    return new Extensions(this);
  }
  get clips() {
    return new Clips(this);
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
