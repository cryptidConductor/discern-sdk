import {
  ConfigureSubscriptionRequest,
  TokenRequest,
  TokenSnapshotRequest,
} from "@discern/twitch-client/types";
import { type Account } from "./types";
import { Connection } from "./connection";

export function handleRequests(
  tokenInput: Discern.Subscription,
  accounts: Map<string, Account>,
  abortController: AbortController
) {
  tokenInput.onMessage(async (message) => handleMessage(message, accounts), {
    signal: abortController.signal,
  });
}

async function handleMessage(
  message: Discern.Message,
  accounts: Map<string, Account>
) {
  if (!message.canReply) {
    console.warn("received message without reply channel", message.contents);
    return;
  }
  const request = TokenRequest.safeParse(message.contents);
  if (!request.success) {
    return await message.reply({ $error: "invalid-request" });
  }
  if (request.data.action === "tokenSnapshot") {
    await tokenSnapshot(request.data, message, accounts);
  } else if (request.data.action === "configureSubscription") {
    await configureSubscription(request.data, message, accounts);
  }
}

async function tokenSnapshot(
  request: TokenSnapshotRequest,
  message: Discern.Message,
  accounts: Map<string, Account>
) {
  const account = accounts.get(request.token);
  if (!account) {
    return await message.reply({ $error: "invalid-token" });
  }
  const snapshot = await account.token.snapshot();
  await message.reply(snapshot);
}

async function configureSubscription(
  request: ConfigureSubscriptionRequest,
  message: Discern.Message,
  accounts: Map<string, Account>
) {
  const account = accounts.get(request.token);
  if (!account) {
    return await message.reply({ $error: "invalid-token" });
  }
  if (
    account.requests.some(
      (sub) =>
        sub.type === request.subscription.type &&
        sub.condition === request.subscription.condition &&
        sub.version === request.subscription.version
    )
  ) {
    message.ack();
    return;
  }

  const userAccessToken = await account.token.accessToken();

  if (!account.connection) {
    account.connection = await initializeConnection(account);
  }
  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        "Client-ID": account.token.clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: request.subscription.type,
        version: request.subscription.version,
        condition: request.subscription.condition,
        transport: {
          method: "websocket",
          session_id: account.connection.sessionId,
        },
      }),
    }
  );

  if (response.status === 429) {
    console.warn("rate limited", await response.text());
    message.reply({ $error: "rate-limited" });
  } else if (!response.ok) {
    console.warn(
      "failed to create subscription",
      request,
      response,
      await response.text()
    );
    message.reply({ $error: "failed" });
  } else {
    account.requests.push(request.subscription);
    message.ack();
  }
}

async function pollMessages(conn: Connection, account: Account) {
  for await (const message of conn) {
    if (message.type === "reconnect") {
      await initializeConnection(
        account,
        new URL(message.data.session.reconnect_url)
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
