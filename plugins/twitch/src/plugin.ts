import { Connection } from "./connection";
import { Token } from "./token";
import { ConfigureRequest, SubscriptionRequest } from "./types";

const configureInput = await Discern.plugin.input("configure");
const abortController = new AbortController();

// region: dump
function describe(object, depth = 0, history = new Set()) {
  if (history.has(object)) {
    console.log(`${"  ".repeat(depth)}[circular]`);
    return;
  } else if (depth > 8) {
    console.log(`${"  ".repeat(depth)}[depth limit]`);
    return;
  } else if (!object) {
    console.log(`${"  ".repeat(depth)}[null]`);
    return;
  }
  for (let key of Object.getOwnPropertyNames(object)) {
    if (typeof object[key] === "object") {
      console.log(`${"  ".repeat(depth)}${key}: `);
      history.add(object[key]);
      describe(object[key], depth + 1);
    } else if (typeof object[key] === "function") {
      console.log(`${"  ".repeat(depth)}${key}: [func]`);
    } else {
      console.log(`${"  ".repeat(depth)}${key}: ${object[key]?.toString()}`);
    }
  }
}
console.log("---");
describe(Discern.definition);
console.log("---");

// endregion: dump

interface Account {
  token: Token;
  requests: SubscriptionRequest[];
  connection: Connection | null;
}

const tokens = new Map<string, Account>();

for (const config of Discern.configuration.array("tokens")) {
  const name = config.string("name").toLowerCase();
  const secret = config.secret("token");
  if (!name || !secret) {
    console.warn("invalid token configuration", config.raw);
    continue;
  } else if (tokens.has(name)) {
    console.warn("duplicate token name?", name);
    continue;
  }

  const token = await Token.load(secret);
  tokens.set(name, { token, requests: [], connection: null });
}

addEventListener("load", async () => {
  configureInput.onMessage(
    async (message) => {
      const request = ConfigureRequest.safeParse(message.contents);
      if (!request.success) {
        console.warn("received unparsable configure request", message.contents);
        await message.ack();
        return;
      }
      const account = tokens.get(request.data.token);
      if (!account) {
        console.warn("unknown token", request.data.token);
        await message.ack();
        return;
      }
      if (request.data.action === "subscribe") {
        await newSubscription(request.data.subscription, account);
      }
      await message.ack();
    },
    { signal: abortController.signal }
  );
});

async function newSubscription(request: SubscriptionRequest, account: Account) {
  if (
    account.requests.some(
      (sub) =>
        sub.type === request.type &&
        sub.condition === request.condition &&
        sub.version === request.version
    )
  ) {
    return;
  }

  if (!account.connection) {
    account.connection = await initializeConnection(account);
  }

  const userAccessToken = await account.token.accessToken();

  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        // TODO
        "Client-ID": account.token.clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: request.type,
        version: request.version,
        condition: request.condition,
        transport: {
          method: "websocket",
          session_id: account.connection.sessionId,
        },
      }),
    }
  );

  if (!response.ok) {
    console.warn(
      "failed to create subscription",
      request,
      response,
      await response.text()
    );
  } else {
    account.requests.push(request);
  }
}

async function pollMessages(conn: Connection, account: Account) {
  for await (const message of conn) {
    if (message.type === "reconnect") {
      await initializeConnection(
        account,
        new URL(message.data.session.reconnectUrl)
      );
    } else if (message.type === "close") {
      account.connection = null;
      return;
    } else if (message.type === "welcome") {
      // do nothing
    } else if (message.type === "notification") {
      Discern.plugin.output(message.data.subscription.type)(message.data);
    }
  }
}

async function initializeConnection(account: Account, url?: URL) {
  console.log("connecting to twitch...");
  const newConnection = new Connection(url);
  const firstMessage = await newConnection.next();
  if (firstMessage?.type !== "welcome") {
    throw new Error(`unexpected message type ${firstMessage?.type}`);
  }
  account.connection = newConnection;
  pollMessages(newConnection, account);
  return account.connection;
}
