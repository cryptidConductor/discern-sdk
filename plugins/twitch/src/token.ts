import { z } from "zod";

const twitchApiResponse = z
  .object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    expires_in: z.number(),
  })
  .transform((data) => ({
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  }));

export class Token {
  #secret: Discern.SecretId;
  #authToken: Discern.SecretOAuthToken;
  #clientId: string | null;

  static async load(secretId: Discern.SecretId | null) {
    if (!secretId) {
      throw new Error("No Twitch token secret configured");
    }
    const secret = await Discern.secrets.load(secretId);
    if (secret?.data.type === "oauthToken" && isTwitchMeta(secret.metadata)) {
      return new Token(secretId, secret.data.value);
    } else {
      throw new Error("Invalid secret data?");
    }
  }

  constructor(secret: Discern.SecretId, authToken: Discern.SecretOAuthToken) {
    this.#secret = secret;
    this.#authToken = authToken;
  }

  async accessToken() {
    if (this.accessTokenExpiresAt.getTime() - 5000 < Date.now()) {
      await this.#refreshToken();
    }

    return this.#authToken.accessToken;
  }

  get clientId() {
    if (this.#clientId) return this.#clientId;
    const definition = twitchSettingDefinition();
    if (!definition) {
      throw new Error("No twitch setting definition???");
    }
    const id = definition.settings.clientId;
    if (typeof id === "string") {
      this.#clientId = id;
      return id;
    } else {
      const envId = Discern.getEnv(id.env);
      if (!envId) {
        throw new Error("No client ID configured");
      }
      this.#clientId = envId;
      return envId;
    }
  }

  get accessTokenExpiresAt() {
    return new Date(this.#authToken.accessTokenExpiresAt);
  }

  get refreshTokenExpiresAt() {
    return this.#authToken.refreshTokenExpiresAt
      ? new Date(this.#authToken.refreshTokenExpiresAt)
      : null;
  }

  async #refreshToken() {
    if (!this.#authToken.refreshToken) {
      throw new Error("No refresh token");
    } else if (this.accessTokenExpiresAt.getTime() - 5000 >= Date.now()) {
      return;
    } else if (
      this.refreshTokenExpiresAt &&
      this.refreshTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new Error("Refresh token expired; you'll need to re-authenticate");
    }

    const definition = twitchSettingDefinition();
    if (!definition) {
      throw new Error("No twitch setting definition???");
    }

    const formData = new URLSearchParams();
    formData.append("grant_type", "refresh_token");
    formData.append("refresh_token", this.#authToken.refreshToken);
    formData.append("client_id", this.clientId);

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      console.warn(await response.json());
      throw new Error("Failed to refresh token");
    }

    const data = twitchApiResponse.parse(await response.json());
    this.#authToken = {
      accessToken: data.accessToken,
      accessTokenExpiresAt: new Date(
        Date.now() + data.expiresIn * 1000
      ).toISOString(),
      refreshToken: data.refreshToken || this.#authToken.refreshToken,
      refreshTokenExpiresAt: this.#authToken.refreshTokenExpiresAt,
    };
    await Discern.secrets.update(this.#secret, {
      componentId: Discern.plugin.id,
      data: {
        type: "oauthToken",
        value: this.#authToken,
      },
      metadata: { service: "twitch" },
    });
  }
}

function isTwitchMeta(metadata: unknown): metadata is { service: "twitch" } {
  return (
    typeof metadata === "object" &&
    !!metadata &&
    "service" in metadata &&
    metadata?.service === "twitch"
  );
}

function twitchSettingDefinition():
  | (Discern.PluginSettingValue & { type: "oauthToken"; source: "twitch" })
  | null {
  const tokens = Discern.definition.discern.settings["tokens"];
  if (tokens?.type !== "array") return null;
  const token = tokens.items["token"];
  if (token?.type === "oauthToken" && token?.source === "twitch") {
    return token;
  }
  return null;
}
