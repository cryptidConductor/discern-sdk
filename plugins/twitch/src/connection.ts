import { NotificationMessage } from "@discern/twitch/types";
import {
  EventSubMessage,
  Message,
  ReconnectMessage,
  WelcomeMessage,
} from "./types";

/**
 * Default URL for Twitch's EventSub.
 *
 * This is the URL that we'll use to connect to Twitch's EventSub.  We
 * include the `keepalive_timeout_seconds` parameter, which will tell Twitch
 * to send a heartbeat every 10 seconds.
 */
const DEFAULT_TWITCH_EVENTSUB_URL = new URL(
  "wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=10"
);

/**
 * The number of items, max, to keep in the buffer.
 *
 * This is a hard limit on the number of items that we'll keep in the buffer.
 * If we receive more than this number of items, we'll error out and disconnect;
 * we can't keep up with the rate of messages that Twitch is sending us.
 *
 * This should be high enough that the amoritized cost of processing every
 * item will be low enough that we can keep up with the rate of messages that
 * Twitch is sending us, but low enough that we can bail out if we're getting
 * overwhelmed.
 */
const BUFFER_SIZE = 64;
/**
 * The number of items to warn for when the buffer is getting full.
 *
 * This will allow us to notify the end user that we're getting close to
 * the limit of the buffer, and that we might be about to disconnect.
 */
const BUFFER_HIGH_WATER_MARK = 48;

export type ConnectionMessage =
  | { type: "reconnect"; data: ReconnectMessage["payload"] }
  | { type: "notification"; data: NotificationMessage["payload"] }
  | { type: "close"; code: number }
  | { type: "welcome"; data: WelcomeMessage["payload"] };

/**
 * Manages the websocket connection to Twitch's EventSub.
 *
 * This should, hopefully, make transient connection issues transparent to
 * the layer above it, while also performing reconnects.  It should also switch
 * the native WebSocket implementation from a push to a pull model, so that
 * the layer above it can poll for new events.
 *
 * This is important, because with WebSockets pushing a lot of messages into
 * the event loop, we can easily get overwhelmed.  This way, we can tell that
 * we're about to be overwhelmed; keep track of that, and inform the layer
 * above that we're struggling, before we abort when we can't keep up.
 *
 * When we get the [`WebSocketStream`] available to us, we'll be able to handle
 * these cases more gracefully, but until then, we'll have to make do with what
 * we have.
 *
 * Keep in mind that websockets are not necessarily reliable - they can drop
 * connections, and sent packets.  Twitch's EventSub has a neat feature where
 * it'll send a heartbeat to you every so often; if you don't hear the
 * heartbeat, you can assume that the connection has been dropped, and you
 * should reconnect.  We'll include that logic within our connection manager.
 *
 * [`WebSocketStream`]: https://developer.chrome.com/docs/capabilities/web-apis/websocketstream
 */
export class Connection implements AsyncIterable<ConnectionMessage> {
  /**
   * The amount if time, _in seconds_, between expected heartbeats.
   *
   * Heartbeats are expected to be sent as keepalive messages every so often;
   * however, normal messages can count as heartbeats as well.  We'll keep
   * track of the time between heartbeats, and if we don't receive a heartbeat
   * within that time, we'll assume that the connection has been dropped, and
   * we'll reconnect.
   */
  #heartBeatInterval: number = 10;
  /**
   * The timers that we're using to keep track of the heartbeats.
   *
   * We keep track of these to be able to cancel them when we need to, such
   * as when we receive a notification.
   */
  #heartBeatTimers: ReturnType<typeof setTimeout>[] = [];
  /**
   * The actual websocket connection.
   *
   * This is set upon initialization; and one class should only ever have one
   * websocket connection at a time. Upon a reconnection, a new instance of
   * this class should be created, and the old one should be discarded.
   */
  #websocket: WebSocket | null = null;
  #sessionId: string | null = null;
  #seenMessages: Set<string> = new Set();

  /**
   * Buffer of messages that we've received from Twitch.
   *
   * This allows us to turn a push-based system into a pull-based system.
   * However, we'll need to be careful about how we do this, as we don't want
   * to overwhelm the system with too many messages - JavaScript's array
   * doesn't allow us to limit the number of items in the array without
   * setting the cap externally.
   *
   * At the same time, we're using a native array as a queue, which is not
   * optimal - when we [`Array.shift`] an item from the front of the array,
   * we have to shift all successive items forward, which is an O(n)
   * operation.
   *
   * But we're not going to worry about that for now.  We'll just keep it
   * simple, and see how it goes.
   */
  #buffer: ConnectionMessage[] = [];

  #pullPromise: ((result: PromiseLike<ConnectionMessage>) => void) | null =
    null;

  /**
   * Constructs the connection manager.
   *
   * This will immediately attempt to establish a connection to the Twitch
   * EventSub service.
   *
   * @param url
   *    The URL to connect to.  When Twitch tells us to connect to a different
   *    URL, we'll disconnect from this URL and connect to the new one.
   */
  constructor(url: URL = DEFAULT_TWITCH_EVENTSUB_URL) {
    this.#websocket = new WebSocket(url);

    this.#websocket.onopen = this.#onOpen.bind(this);
    this.#websocket.onclose = this.#onClose.bind(this);
    this.#websocket.onerror = this.#onError.bind(this);
    this.#websocket.onmessage = this.#onMessage.bind(this);
  }

  next(): Promise<ConnectionMessage | null> {
    if (this.#buffer.length > 0) {
      return Promise.resolve(this.#buffer.shift()!);
    } else if (this.#websocket) {
      return new Promise((resolve) => (this.#pullPromise = resolve));
    } else {
      return Promise.resolve(null);
    }
  }

  get sessionId(): string | null {
    return this.#sessionId;
  }

  combine(other: Connection) {
    other.#postMortem(4907);
    this.#buffer.push(...other.#buffer);
    other.#buffer = [];
  }

  [Symbol.asyncIterator](): AsyncIterator<ConnectionMessage> {
    return {
      next: async () => {
        const message = await this.next();
        if (message === null) {
          return { done: true, value: undefined };
        } else {
          return { done: false, value: message };
        }
      },
    };
  }

  #pushMessage(message: ConnectionMessage): void {
    if (this.#pullPromise !== null) {
      const resolve = this.#pullPromise;
      this.#pullPromise = null;
      resolve(Promise.resolve(message));
      return;
    }

    if (this.#buffer.length >= BUFFER_SIZE) {
      console.error(
        "connection message buffer is full!! we can't keep up with the rate of messages! disconnecting..."
      );
      this.#websocket?.close();
      return;
    } else if (this.#buffer.length >= BUFFER_HIGH_WATER_MARK) {
      console.warn(
        "connection message buffer is getting full! we might disconnect soon... (buffer size: %d, max: %d)",
        this.#buffer.length,
        BUFFER_SIZE
      );
    }
    this.#buffer.push(message);
  }

  #clearTimers(): void {
    this.#heartBeatTimers.forEach(globalThis.clearTimeout);
  }

  #activateTimers(): void {
    const timerStart = Date.now();
    this.#heartBeatTimers.push(
      globalThis.setTimeout(() => {
        const timerEnd = Date.now();
        console.warn(
          `heartbeat missed (${
            timerEnd - timerStart
          }ms since timer start); we'll see if we get another before reconnecting...`
        );
      }, this.#heartBeatInterval * 1000 + 100)
    );
    this.#heartBeatTimers.push(
      globalThis.setTimeout(() => {
        const timerEnd = Date.now();
        console.error(
          `heartbeat missed (${
            timerEnd - timerStart
          }ms), we'll have to reconnect now!`
        );
        this.#postMortem(4905);
      }, this.#heartBeatInterval * 2 * 1000 + 50)
    );
  }

  #resetTimers(): void {
    this.#clearTimers();
    this.#activateTimers();
  }

  #onClose(event: CloseEvent): void {
    console.log(`connection closed: ${event.code} ${event.reason}`);
    this.#postMortem(event.code);
  }

  #onError(event: Event): void {
    console.warn("Connection error!", event);
    this.#postMortem(4906);
  }

  #postMortem(code?: number): void {
    this.#clearTimers();
    if (this.#websocket) {
      this.#websocket.onopen = null;
      this.#websocket.onclose = null;
      this.#websocket.onerror = null;
      this.#websocket.onmessage = null;
      this.#websocket.close(code ?? 4990);
    }
    this.#websocket = null; // we will not be receiving any more events.
    this.#pushMessage({ type: "close", code: code ?? 4990 });
  }

  #onOpen(_event: Event): void {
    console.log("twitch connection established!");
    this.#activateTimers();
  }

  #onMessage(event: MessageEvent): void {
    this.#resetTimers();
    if (typeof event.data !== "string") {
      console.error(
        "Received a non-string message from Twitch! This should not be possible, as twitch only sends strings. Ignoring for now."
      );
      return;
    }

    let raw: unknown;

    try {
      raw = JSON.parse(event.data);
    } catch (error) {
      console.error("Failed to parse JSON content from Twitch!", error);
      return;
    }

    const result = EventSubMessage.safeParse(raw);
    if (!result.success) {
      console.error("Failed to parse message from Twitch!", result.error);
      return;
    }

    const data = result.data;

    if (this.#seenMessages.has(data.metadata.message_id)) {
      console.info(
        "received a duplicate message from twitch; ignoring...",
        data.metadata.message_id
      );
      return;
      // Technically, we should also check that the message is within
      // the last 10 minutes, but we'll ignore that for now.
    } else if (Message.isWelcome(data)) {
      console.log("Connected to Twitch EventSub!");
      this.#heartBeatInterval = data.payload.session.keepalive_timeout_seconds;
      this.#sessionId = data.payload.session.id;
      this.#pushMessage({ type: "welcome", data: data.payload });
      return;
    } else if (Message.isKeepalive(data)) {
      // We don't need to do anything special for keepalive messages;
      // they're just there to keep the connection alive.
      return;
    } else if (Message.isReconnect(data)) {
      this.#pushMessage({ type: "reconnect", data: data.payload });
      return;
    } else if (Message.isNotification(data)) {
      this.#pushMessage({ type: "notification", data: data.payload });
      return;
    }

    assertNever(data);
  }
}

// This is a helper function.  The body of the function should never be called,
// since typescript should never allow us to be able to instantiate a `never`
// type.  If it does, we'll throw an error.
//
// We do this so that we can be sure that we've handled all possible cases.
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}
