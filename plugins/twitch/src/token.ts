import { z } from "zod";

const refreshTokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
});
const validateTokenResponse = z.object({
  client_id: z.string(),
  login: z.string(),
  scopes: z.array(z.string()),
  user_id: z.string(),
  expires_in: z.number(),
});

type ValidateTokenResponse = z.infer<typeof validateTokenResponse>;

type ValidateDataSubscription = [
  (response: ValidateTokenResponse) => void,
  (error: unknown) => void
];

export class Token {
  #secret: Discern.SecretId;
  #authToken: Discern.SecretOAuthToken | null;
  #clientId: string | null = null;
  #validateData: ValidateTokenResponse | null = null;
  #validateDataRequest: ValidateDataSubscription[] = [];

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

    setTimeout(() => this.#validateTokenPeriodically(), 0);
  }

  async accessToken() {
    if (
      !this.accessTokenExpiresAt ||
      this.accessTokenExpiresAt.getTime() - 5000 < Date.now()
    ) {
      await this.#refreshToken();
    }

    // If #authToken is null, #refreshToken will have thrown an error.
    return this.#authToken?.accessToken!;
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
    if (!this.#authToken) {
      return null;
    }
    return new Date(this.#authToken.accessTokenExpiresAt);
  }

  get refreshTokenExpiresAt() {
    if (!this.#authToken) {
      return null;
    }
    return this.#authToken.refreshTokenExpiresAt
      ? new Date(this.#authToken.refreshTokenExpiresAt)
      : null;
  }

  async snapshot() {
    const tokenInformation = await this.validate();
    return {
      accessToken: await this.accessToken(),
      clientId: tokenInformation.client_id!,
      login: tokenInformation.login!,
      scopes: tokenInformation.scopes!,
      userId: tokenInformation.user_id!,
      expiresAt: new Date(tokenInformation.expires_in).toISOString(),
    };
  }

  async validate() {
    if (this.#validateData) return this.#validateData;
    return new Promise<ValidateTokenResponse>((resolve, reject) => {
      this.#validateDataRequest.push([resolve, reject]);
    });
  }

  async #validateTokenPeriodically() {
    console.log("validating token...", this.#secret);
    try {
      const result = await this.#validateToken();
      console.log("validation result: ", result);
      if (!result.success) {
        console.warn("Failed to validate token", result);
        this.#validateDataRequest.forEach(([_, fn]) => fn(result.error));
        this.#authToken = null;
        return;
      }

      this.#validateData = result.data;
      this.#validateDataRequest.forEach(([fn, _]) => fn(result.data));
      this.#validateDataRequest = [];
      setTimeout(
        () => this.#validateTokenPeriodically(),
        1000 * 60 * 60 + Math.random() * 1000 * 2
      );
    } catch (error) {
      this.#validateDataRequest.forEach(([_, fn]) => fn(error));
      this.#validateDataRequest = [];
      throw error;
    }
  }

  // TODO: make this private, call this periodically, and return the cached
  //       result instead of calling this directly
  async #validateToken() {
    const accessToken = await this.accessToken();
    const response = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: [
        ["Authorization", `Bearer ${accessToken}`],
        ["Client-Id", this.clientId],
        ["Content-Type", "application/json"],
      ],
    });
    if (response.status === 200) {
      const data = validateTokenResponse.parse(await response.json());
      return { success: true, data } as const;
    } else if (response.status === 429) {
      return { success: false, error: "rate-limited" } as const;
    } else {
      return { success: false, error: "invalid-token" } as const;
    }
  }

  async #refreshToken() {
    if (!this.#authToken || !this.#authToken.refreshToken) {
      throw new Error("No refresh token");
    } else if (
      new Date(this.#authToken.accessTokenExpiresAt).getTime() - 5000 >=
      Date.now()
    ) {
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

    const data = refreshTokenResponse.parse(await response.json());
    this.#authToken = {
      accessToken: data.access_token,
      accessTokenExpiresAt: new Date(
        Date.now() + data.expires_in * 1000
      ).toISOString(),
      refreshToken: data.refresh_token || this.#authToken.refreshToken,
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
