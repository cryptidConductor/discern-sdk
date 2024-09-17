/// <reference lib="esnext" />
/// <reference lib="dom" />

import { type Deno } from "@deno/types";

declare global {
  namespace Discern {
    export {};

    /**
     * Options for polling a subscription.
     */
    type PollOptions = {
      /**
       * An abort signal.
       *
       * If provided, this will abort the poll when the signal is aborted, causing
       * the poll to reject with an `AbortError`.
       */
      signal?: AbortSignal;
    };

    export type SubscriptionCreateOptions = {
      /**
       * The name of the queue to pass the subscription through.
       *
       * If this is specified, the subscription messages are passed through this
       * queue before being delivered to the subscriber.
       *
       * Because of how the queue works, the resulting subscription is no
       * longer for the specified topic name, but for a transient, randomly
       * generated topic name namespaced under this plugin; a bridge is then
       * created between the original topic and the transient topic, passing
       * through the queue.
       */
      via?: string;
    };

    const secretId: unique symbol;
    /**
     * A unique identifier for a secret.
     *
     * This should not be constructed directly, but instead should be obtained
     * from the relevant APIs.  This type is used to ensure that the secret ID is
     * not used in a context where it is not expected.
     */
    export type SecretId = string & { [secretId]: never };
    const componentId: unique symbol;
    /**
     * A unique identifier for a component.
     *
     * This should not be constructed directly, but instead should be obtained
     * from the relevant APIs. This type is used to ensure that the component ID
     * is not used in a context where it is not expected.
     */
    export type ComponentId = string & { [componentId]: never };

    const envId: unique symbol;
    /**
     * A unique identifier for an environment variable.
     *
     * These environment variables are only specified upon the main discern
     * binary build time; they are not available to be defined at runtime.
     *
     * You probably have no need for this type directly.
     */
    export type EnvId = string & { [envId]: never };

    /**
     * A secret that contains an OAuth token.
     *
     * This is a secret that contains an OAuth token, which can be used to
     * authenticate with an external service.  This can be retrieved from the
     * Secrets API, from a `SecretId`.
     */
    export type SecretOAuthToken = {
      accessToken: string;
      accessTokenExpiresAt: string;
      refreshToken: string | null;
      refreshTokenExpiresAt: string | null;
    };

    /**
     * The data contained in a secret.
     *
     * This can either be a static value, or an OAuth token.  There may be
     * other types in the future.
     */
    export type SecretData =
      | { type: "static"; value: string }
      | {
          type: "oauthToken";
          value: SecretOAuthToken;
        };

    /**
     * A secret, as stored in the secrets API.
     *
     * A secret is a piece of sensitive data that is stored in the secrets API.
     * A secret is identified by a `SecretId`, and is associated with a
     * component by a `ComponentId`.  The secret contains the data itself, as
     * well as some metadata that can be used to store additional information
     * about the secret.
     */
    export interface Secret {
      componentId: ComponentId;
      data: SecretData;
      metadata: unknown;
    }

    /**
     * A subscription to a topic.
     *
     * A subscription is a connection to a topic that can be used to receive
     * messages from that topic.  A subscription can be polled for messages, or
     * a callback can be registered to be called when a message is received.
     *
     * While a subscription is open, it will buffer messages that are sent to the
     * topic, and will deliver them to the subscriber when they are polled or when
     * the callback is called.  However, if the subscription is not polled or
     * the callback takes too long to process the message, the subscription may
     * lag behind; and the current behavior is to drop messages that are sent to
     * the topic while the subscription is lagging, to prevent the subscription
     * from holding up the rest of the system (due to implementation details).
     *
     * @template C -
     *   The type of the contents of the messages on the subscription.
     *   This is the type of the message that the subscription receives.
     * @template R -
     *   The type of the contents of the messages that can be sent in reply to
     *   messages on the subscription.
     */
    export class Subscription<C = unknown, R = unknown> {
      /**
       * Poll for the next message on the subscription.
       *
       * This attempts to retrieve the next message from the subscription.  If
       * there is no message available, this will wait until a message is
       * available, or until the subscription is closed.  If the subscription is
       * closed, this will reject with a generic error.  If the poll options
       * contain an abort signal, and that signal is aborted, this will reject
       * with an `AbortError`.
       *
       * This does not acknowledge the message; the message must be acknowledged
       * by calling `ack` on the message.
       *
       * @param options - The options for polling the subscription.
       */
      next(options?: PollOptions): Promise<Message<C, R>>;
      /**
       * Registers a callback to be called when a message is received.
       *
       * This registers a callback to be called when a message is received on the
       * subscription.  The callback will be called with the message that was
       * received.  If the callback returns a promise, the subscription will wait
       * for that promise to resolve before continuing to the next message.
       *
       * This does not acknowledge the message; the message must be acknowledged
       * by calling `ack` on the message.
       *
       * @param callback - The callback to be called when a message is received.
       * @param options - The options for polling the subscription.
       */
      onMessage(
        callback: (message: Message<C, R>) => Promise<void>,
        options?: PollOptions
      ): void;

      /**
       * Closes the subscription.
       *
       * Once a subscription is closed, it will no longer receive messages from
       * the topic.  Any messages that are sent to the topic after the
       * subscription is closed will not be buffered for the subscription.
       * However, messages sent before the subscription is closed will still be
       * available to be processed, and the subscription will continue to deliver
       * those messages until the subscription is empty.
       */
      close(): Promise<void>;
    }

    /**
     * A message on a subscription.
     *
     * A message is a piece of data that is sent to a topic, and is received by a
     * subscription.  A message contains the contents of the message, as well as
     * metadata about the message, such as the topic that the message was sent to,
     * and whether the message can be replied to.
     *
     * A message is sent to all subscribers of a topic, and is delivered to the
     * subscribers in any order.  A message can be replied to, and the reply will
     * be sent to where the sender requested the reply to be sent.  (However,
     * this reply will almost always be an ephemeral topic, and so will not be
     * any known path.)
     *
     * Some messages come from a queue.  Queues are special, in that they require
     * an acknowledgement to be sent before the message is considered processed;
     * and they will not deliver the next message until the previous message is
     * acknowledged.  This is to ensure that messages are not lost, and that
     * messages are processed in order.
     *
     * Queues currently use the same reply mechanism as normal messages to send
     * acknowledgements.  This is subject to change in the future.  If the
     * originating topic requested a reply, the queue forwards the reply to the
     * originating topic when the message is acknowledged - so `ack` is just
     * a call to `reply` with no contents.
     *
     * @template C - The type of the contents of the message.
     * @template R - The type of the contents of the message that can be sent
     *   as a reply.
     */
    export class Message<C = unknown, R = unknown> {
      get topic(): string;
      get contents(): C;
      get canReply(): boolean;
      reply(message: R): Promise<void>;
      ack(): Promise<void>;
    }

    /**
     * Another plugin on the system.
     *
     * There are two types of plugins: the current plugin, and other plugins.
     * Other plugins are represented by this class.  This class can be used
     * to interact with other plugins on the system, by sending messages to
     * or receiving messages from those plugins.
     */
    export class Plugin {
      /**
       * The ID of the plugin.
       *
       * This is a unique identifier for the plugin, and is generally stable -
       * the ID only changes when the plugin is reinstalled.  This can be used
       * to identify the plugin in the system.
       */
      get id(): ComponentId;
      /**
       * The name of the plugin.
       *
       * This is the name of the plugin, as specified in the plugin's manifest.
       * This is expected to be unique across all of the plugins, though this
       * is case insensitive.
       */
      get name(): string;

      /**
       * Retrieves a subscription to the output of the plugin.
       *
       * If the plugin has well-formed inputs and outputs, this will return a
       * subscription to the named output of the plugin.  This will return a
       * subscription even if the plugin does not have that output; the
       * subscription will never yield a message.
       *
       * @param outputName - The name of the output to subscribe to.
       * @param options - The options for creating the subscription.
       */
      output<C = undefined, R = undefined>(
        outputName: string,
        options?: SubscriptionCreateOptions
      ): Promise<Subscription<C, R>>;
      /**
       * Retrieves a sender function for the input of the plugin.
       *
       * This will always send a message to the input of the plugin, even if the
       * plugin does not listen on that input.  This will not throw an error if
       * the plugin does not listen on that input.  The return value contains
       * the number of subscriptions that the message was sent to; if you want
       * to check if the plugin received the message, you should check this
       * value.
       *
       * @param inputName - The name of the input to send the message to.
       */
      input<R>(inputName: string): (message: R) => Promise<number>;
      /**
       * Sends a message to a plugin, requesting a response.
       *
       * This sends a message to the plugin, and waits for a response.  This
       * will return the response message, or reject if the plugin was not
       * listening on the input.
       *
       * If the plugin has a subscription to this input, but does not reply,
       * this will hang indefinitely.
       *
       * @param inputName - the name of the input to send the message to.
       * @param message - the message to send to the plugin.
       * @param options - the options for polling the subscription.
       */
      ask<R, C = unknown>(
        inputName: string,
        message: R,
        options?: PollOptions
      ): Promise<Message<C>>;
    }

    /**
     * The configuration for the plugin.
     *
     * This is a wrapper around the configuration for the plugin, and provides
     * methods to retrieve values from the configuration.  The configuration
     * is a set of key-value pairs that are provided to the plugin when it is
     * started.  The configuration is read-only, and cannot be modified by the
     * plugin.
     *
     * The configuration is set by the user before the machine is started in the
     * UI.  The plugin is able to configure which options are present in the
     * accompanying `plugin.json` file.
     */
    export class Configuration {
      /**
       * Retrieve an array from the configuration.
       *
       * If the given key does not correspond to an array in the configuration,
       * this will return `null`.
       *
       * @param key - the key to retrieve from the configuration.
       */
      array(key: string): Configuration[] | null;
      /**
       * Retrieves a boolean from the configuration.
       *
       * If the given key does not correspond to a boolean in the configuration,
       * this will return `null`.
       *
       * @param key - the key to retrieve from the configuration.
       */
      boolean(key: string): boolean | null;
      /**
       * Retrieves a number from the configuration.
       *
       * If the given key does not correspond to a number in the configuration,
       * this will return `null`.
       *
       * @param key - the key to retrieve from the configuration.
       */
      number(key: string): number | null;
      /**
       * Retrieves an object from the configuration.
       *
       * If the given key does not correspond to an object in the configuration,
       * this will return `null`.
       *
       * @param key - the key to retrieve from the configuration.
       */
      string(key: string): string | null;
      /**
       * Retrieves a secret from the configuration.
       *
       * If the given key does not correspond to a secret in the configuration,
       * this will return `null`.
       *
       * @param key - the key to retrieve from the configuration.
       */
      secret(key: string): SecretId | null;

      /**
       * Retrieves the raw configuration.
       *
       * This returns the raw JSON object that represents the configuration.
       * This can be used to access values that are not directly supported by
       * the configuration object.
       *
       * Note, however, that this is not the recommended way to access the
       * configuration; it is recommended to use the typed methods on the
       * configuration object.
       *
       * This returns a read-only, deeply copied object, so modifying the object
       * will not affect the configuration.
       */
      get raw(): Readonly<Record<string, unknown>>;
    }

    /**
     * The base type for a plugin setting definition.
     *
     * This is the base type for a plugin setting definition.  All setting
     * deinifitions extend this type.
     */
    type BasePluginSettingDefinition = {
      /**
       * The name of the setting.
       *
       * This is the user-friendly name, and is used to identify the setting in
       * the UI.  This is not meant to be unique, and is not used to identify the
       * setting in the plugin.
       */
      name: string | null;
      /**
       * A description of the setting.
       *
       * This is a user-friendly description of the setting, and is used to
       * describe the setting in the UI.  This is not required, and can be `null`.
       */
      description: string | null;
      /**
       * Whether the setting is optional.
       *
       * If this is `true`, the setting is optional, and does not need to be
       * provided by the user.  If this is `false`, the setting is required, and
       * must be provided by the user.
       *
       * By default, a setting is not optional.  However, this currently has
       * no effect.
       */
      optional: boolean;
    };

    /**
     * The value type of a plugin setting.
     *
     * This is the value type of a plugin setting.  This is used to determine
     * the type of the setting, and how the setting is displayed in the UI.
     */
    export type PluginSettingValue =
      | { type: "string" }
      | { type: "topic" }
      | { type: "file"; directory?: true }
      | { type: "secret" }
      | { type: "boolean" }
      | { type: "number" }
      | { type: "select"; options: Record<string, string> }
      | {
          type: "array";
          minimumCount?: number;
          maximumCount?: number;
          items: Record<string, PluginSettingDefinition>;
        }
      | {
          type: "oauthToken";
          source: "twitch";
          settings: {
            clientId: string | { env: EnvId };
            scope: string;
          };
        };
    /**
     * The definition of a plugin setting.
     *
     * This is the definition of a plugin setting.  This is used to define
     * the settings that a plugin requires, and how those settings are
     * displayed in the UI.
     */
    export type PluginSettingDefinition = BasePluginSettingDefinition &
      PluginSettingValue;

    /**
     * Subscribes to the given topic name.
     *
     * This subscribes to the given topic name, and returns a subscription that
     * can be used to receive messages from that topic.
     *
     * This is a low-level primitive that is used to interact with the system;
     * it is recommended to use the `plugin` object to interact with other
     * plugins, as that provides a higher-level API.
     *
     * If the topic name is not valid, this will reject with an error.
     *
     * @param topicName - the name of the topic to subscribe to.
     * @param options - the options for creating the subscription.
     */
    export function subscribe(
      topicName: string,
      options?: SubscriptionCreateOptions
    ): Promise<Subscription>;
    /**
     * Publishes to the given topic name.
     *
     * This publishes the given message to the given topic name.  This will
     * deliver the message to all subscribers of the topic.
     *
     * This is a low-level primitive that is used to interact with the system;
     * it is recommended to use the `plugin` object to interact with other
     * plugins, as that provides a higher-level API.
     *
     * @param topicName - the name of the topic to publish to.
     * @param message - the message to publish to the topic.
     */
    export function publish<M = unknown>(
      topicName: string,
      message: M
    ): Promise<number>;
    /**
     * Subscribes to the given topic name, and waits for the next message.
     *
     * This subscribes to the given topic name, and waits for the next message
     * to be sent to the topic.  This will return the message that was received,
     * after closing that subscription.
     *
     * This is a low-level primitive that is used to interact with the system;
     * it is recommended to use the `plugin` object to interact with other
     * plugins, as that provides a higher-level API.
     *
     * DO NOT USE THIS FUNCTION; THIS DOES NOT PROVIDE A WAY TO ABORT THE
     * POLL, AND SO WILL HANG INDEFINITELY IF NO MESSAGE IS RECEIVED.
     *
     * @param topicName - the name of the topic to subscribe to.
     */
    export function once(topicName: string): Promise<Message>;
    /**
     * Sends a message on the given topic name, and waits for a response.
     *
     * This sends a message to the given topic name, and waits for a response.
     * This will return the response message, or reject if the topic was not
     * listening on the input.
     *
     * If the topic has a subscription to this input, but does not reply,
     * this will hang indefinitely.
     *
     * If options are provided, and the abort signal is aborted, this will
     * reject with an `AbortError`.
     *
     * This is a low-level primitive that is used to interact with the system;
     * it is recommended to use the `plugin` object to interact with other
     * plugins, as that provides a higher-level API.
     *
     * @param topicName - the name of the topic to send the message to.
     * @param message - the message to send to the topic.
     * @param options - the options for polling the subscription.
     */
    export function ask<M = unknown, C = unknown, R = unknown>(
      topicName: string,
      message: M,
      options?: PollOptions
    ): Promise<Message<C, R>>;

    /**
     * Looks up the given plugin by name.
     *
     * This looks up the plugin with the given name, and returns a plugin object
     * that can be used to interact with that plugin.  If the plugin is not found,
     * this will instead hang.
     *
     * If options are provided, and the abort signal is aborted, this will
     * reject with an `AbortError`.
     *
     * @param pluginName - the name of the plugin to look up.  This is case
     *   insensitive.
     * @param options - the options for polling the subscription.
     */
    export function get(
      pluginName: string,
      options?: PollOptions
    ): Promise<Plugin>;

    /**
     * Looks up an environment variable by ID.
     *
     * This looks up the environment variable with the given ID, and returns the
     * value of that environment variable.  If the environment variable is not
     * found, this will return null.
     *
     * The environment variables are set at build time, and are not available to
     * be defined at runtime.  You probably don't need this function.
     *
     * @param envId - the ID of the environment variable to retrieve.
     */
    export function getEnv(envId: EnvId): string | null;

    /**
     * The configuration for the plugin.
     *
     * This returns the configuration for the plugin, which can be used to
     * retrieve values from the configuration.  See the `Configuration` object
     * for more information.
     */
    export const configuration: Configuration;

    /**
     * The plugin object for the current plugin.
     *
     * This object can be used to interact with the current plugin, by listening
     * on an input, or sending a message to an output.
     *
     * This object also provides access to the files API, which can be used to
     * read and write files in the plugin's directory.
     */
    export const plugin: Readonly<{
      /**
       * The ID of the current plugin.
       *
       * This is a unique identifier for the plugin, and is generally stable -
       * the ID only changes when the plugin is reinstalled.  This can be used
       * to identify the plugin in the system.
       */
      get id(): ComponentId;
      /**
       * The name of the plugin.
       *
       * This is the name of the plugin, as specified in the plugin's manifest.
       * This is expected to be unique across all of the plugins, though this
       * is case insensitive.
       */
      get name(): string;

      /**
       * Retrieves a publish function for the output of the plugin.
       *
       * This will always send a message to the output of the plugin, even if
       * there are no listeners on that output.  This will not throw an error if
       * there are no listeners on that output.  The return value contains
       * the number of subscriptions that the message was sent to; if you want
       * to check if the message was received, you should check this value.
       *
       * @param outputName - The name of the output to send the message to.
       */
      output<M>(outputName: string): (message: M) => Promise<number>;
      /**
       * Retrieves a subscription to the input of the plugin.
       *
       * If the plugin has well-formed inputs and outputs, this will return a
       * subscription to the named input of the plugin.
       *
       * @param inputName - The name of the input to subscribe to.
       * @param options - The options for creating the subscription.
       */
      input<C = unknown, R = unknown>(
        inputName: string,
        options?: SubscriptionCreateOptions
      ): Promise<Subscription<C, R>>;

      /**
       * The files API.
       *
       * This API can be used to read files in the plugin's directory.  This
       * can be used to read configuration files, or other files that are
       * stored in the plugin's directory.
       *
       * Note that this is entirely read-only; it is not possible to write
       * files using this API.  This does not allow access to files outside of
       * the plugin's directory.
       */
      files: Readonly<{
        /**
         * Opens the file.
         *
         * This does return a `Deno.FsFile`, but 90% of the functionality
         * will result in an error; the only operations that are guaranteed
         * to work are `read` and `close` - sync operations do not work.
         *
         * @param name - a path to the file, relative to the `plugin.json`
         *   file.  This should always use `/` as the path separator.
         */
        open(name: string): Promise<Deno.FsFile>;
      }>;
    }>;

    /**
     * The secrets API.
     *
     * This API can be used to store and retrieve secrets.  A secret is a piece
     * of sensitive data that is stored in the secrets API.  A secret is
     * identified by a `SecretId`, and is associated with a component by a
     * `ComponentId`.  The secret contains the data itself, as well as some
     * metadata that can be used to store additional information about the secret.
     */
    export const secrets: {
      /**
       * Attempts to load the secret identified by the gievn ID.
       *
       * This will return the secret if it exists, or `null` if the secret does
       * not; if the secret ID is not valid, this will reject.
       *
       * @param secretId - the ID of the secret to load.
       */
      load(secretId: SecretId): Promise<Secret | null>;
      /**
       * Stores the given secret.
       *
       * This returns the ID of the stored secret.  This will reject if the
       * secret is not valid.
       *
       * @param secret - The secret to store.
       */
      store(secret: Secret): Promise<SecretId>;
      /**
       * Deletes the given secret.
       *
       * This does not reject if the secret does not exist.  It will reject if
       * the secret ID is not valid.
       *
       * @param secretId - The ID of the secret to delete.
       */
      delete(secretId: SecretId): Promise<void>;
      /**
       * Updates the given secret.
       *
       * This will update the secret with the given ID to the new secret.  If no
       * secret exists with the given ID, it will create one at that ID.
       *
       * This will reject if the secret ID is not valid, or if the secret is not
       * valid.
       *
       * @param secretId - The ID of the secret to update.
       * @param secret - The new secret to store.
       */
      update(secretId: SecretId, secret: Secret): Promise<void>;
    };

    /**
     * The definition, as specified in the plugin's manifest.
     *
     * This is the definition of the plugin, as specified in the plugin's
     * manifest.  This is used to define the settings that a plugin requires,
     * and how those settings are displayed in the UI.
     *
     * This should match the contents of the `plugin.json` file.
     */
    export const definition: {
      /**
       * The name of the plugin.
       *
       * This is the name of the plugin, as specified in the plugin's manifest.
       * This is expected to be unique across all of the plugins, though this
       * is case insensitive.
       */
      name: string;
      /**
       * The version of the plugin.
       *
       * This is the version of the plugin, as specified in the plugin's manifest.
       * This is expected to match Semantic Versioning 2.0.0.
       */
      version: string;
      /**
       * The description of the plugin.
       *
       * This is the description of the plugin, as specified in the plugin's
       * manifest.  This is a user-friendly description of the plugin, and is
       * used to describe the plugin in the UI.  It is completely optional.
       */
      description?: string;
      /**
       * The author of the plugin.
       *
       * This is the author of the plugin, as specified in the plugin's manifest.
       * This is a user-friendly name of the author, and is used to identify the
       * author of the plugin in the UI.  It is completely optional.
       */
      author?: string;
      /**
       * The license of the plugin.
       *
       * This is the license of the plugin, as specified in the plugin's manifest.
       * This is the license that the plugin is distributed under, and is used to
       * identify the license of the plugin in the UI.  It is completely optional.
       */
      license?: string;
      /**
       * The discern-specific settings of the plugin.
       *
       * Because the definition of a plugin within `package.json`, we keep
       * discern-specific settings in a separate object, to prevent accidental
       * collisions.
       */
      discern: Readonly<{
        /**
         * The settings of the plugin.
         *
         * This is the settings of the plugin, as specified in the plugin's manifest.
         * This is a set of key-value pairs that define the settings that the plugin
         * requires, and how those settings are displayed in the UI.  This is
         * required; if not specified, it is assumed to be an empty object.
         */
        settings: Record<string, PluginSettingDefinition>;
      }>;
    };
  }
}
