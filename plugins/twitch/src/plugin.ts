/// <reference types="@discern/types" />

/**
 * TODO: we do not handle rate limiting here.  We absolutely should, otherwise
 * we're going to get rate limited by Twitch.
 */

import { Token } from "./token";
import { Account } from "./types";
import { handleRequests } from "./requests";

const tokenInput = await Discern.plugin.input("token");
const abortController = new AbortController();

const tokens = await loadTokens();

addEventListener("load", async () => {
  console.log(`loaded tokens: ${[...tokens.keys()].join(", ")}`);
  handleRequests(tokenInput, tokens, abortController);
});

async function loadTokens() {
  const tokens = new Map<string, Account>();
  console.log("loading tokens");
  const configuredTokens = Discern.configuration.array("tokens");
  if (!configuredTokens) return tokens;
  for (const config of configuredTokens) {
    const name = config.string("name")?.toLowerCase();
    const secret = config.secret("token");
    if (!name || !secret) {
      console.warn("invalid token configuration", config.raw);
      continue;
    } else if (tokens.has(name)) {
      console.warn("duplicate token name?", name);
      continue;
    }

    const token = await Token.load(secret);
    await token.validate();

    tokens.set(name, {
      token,
      requests: [],
      connection: null,
    });
  }
  return tokens;
}
