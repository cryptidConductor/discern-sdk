/******************************************************************************
 *
 * !!!WARNING!!!
 *
 * This file is automatically generated. Do not edit this file directly.
 *
 * This file was generated using the twitch generation script, found in the
 * `scripts/twitch` directory of the repository.
 *
 *****************************************************************************/

import type { Twitch } from "../index";
import type { TokenId } from "../types";
import { z } from "zod";

export interface GetStreamTagsRequest {
  /**
   * The ID of the broadcaster whose stream tags you want to get.
   */
  broadcasterId: string;
}
export interface GetAllStreamTagsRequest {
  /**
   * The ID of the tag to get. Used to filter the list of tags. To specify more
   * than one tag, include the _tag\_id_ parameter for each tag to get. For
   * example, `tag_id=1234&tag_id=5678`. The maximum number of IDs you may
   * specify is 100\. Ignores invalid IDs but not duplicate IDs.
   */
  tagId?: string[];
  /**
   * The maximum number of items to return per page in the response. The
   * minimum page size is 1 item per page and the maximum is 100\. The default
   * is 20.
   */
  first?: number;
  /**
   * The cursor used to get the next page of results. The **Pagination** object
   * in the response contains the cursor’s value. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  after?: string;
}
export const GetStreamTagsResponse = z.object({
  /**
   * The list of stream tags. The list is empty if the broadcaster or
   * Twitch hasn’t added tags to the broadcaster’s channel.
   */
  data: z
    .object({
      is_auto: z.boolean(),
      localization_descriptions: z.object({}).catchall(z.string()),
      localization_names: z.object({}).catchall(z.string()),
      tag_id: z.string(),
    })
    .transform((it) => ({
      /**
       * A Boolean value that determines whether the tag is an automatic
       * tag. An automatic tag is one that Twitch adds to the stream.
       * Broadcasters may not add automatic tags to their channel. The value
       * is **true** if the tag is an automatic tag; otherwise, **false**.
       */
      isAuto: it["is_auto"],
      /**
       * A dictionary that contains the localized descriptions of the tag.
       * The key is in the form, <locale>-<coutry/region>. For example,
       * en-us. The value is the localized description.
       */
      localizationDescriptions: it["localization_descriptions"],
      /**
       * A dictionary that contains the localized names of the tag. The key
       * is in the form, <locale>-<coutry/region>. For example, en-us. The
       * value is the localized name.
       */
      localizationNames: it["localization_names"],
      /**
       * An ID that identifies this tag.
       */
      tagId: it["tag_id"],
    }))
    .array(),
});
export interface GetStreamTagsResponse
  extends z.infer<typeof GetStreamTagsResponse> {}

export const GetAllStreamTagsResponse = z.object({
  /**
   * The list of stream tags that the broadcaster can apply to their
   * channel.
   */
  data: z
    .object({
      is_auto: z.boolean(),
      localization_descriptions: z.object({}).catchall(z.string()),
      localization_names: z.object({}).catchall(z.string()),
      tag_id: z.string(),
    })
    .transform((it) => ({
      /**
       * A Boolean value that determines whether the tag is an automatic
       * tag. An automatic tag is one that Twitch adds to the stream.
       * Broadcasters may not add automatic tags to their channel. The value
       * is **true** if the tag is an automatic tag; otherwise, **false**.
       */
      isAuto: it["is_auto"],
      /**
       * A dictionary that contains the localized descriptions of the tag.
       * The key is in the form, <locale>-<coutry/region>. For example,
       * en-us. The value is the localized description.
       */
      localizationDescriptions: it["localization_descriptions"],
      /**
       * A dictionary that contains the localized names of the tag. The key
       * is in the form, <locale>-<coutry/region>. For example, en-us. The
       * value is the localized name.
       */
      localizationNames: it["localization_names"],
      /**
       * An ID that identifies this tag.
       */
      tagId: it["tag_id"],
    }))
    .array(),
  /**
   * The information used to page through the list of results. The object
   * is empty if there are no more pages left to page through. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  pagination: z
    .object({
      /**
       * The cursor used to get the next page of results. Set the
       * request’s _after_ query parameter to this value to page forwards
       * through the results.
       */
      cursor: z.string().optional(),
    })
    .optional(),
});
export interface GetAllStreamTagsResponse
  extends z.infer<typeof GetAllStreamTagsResponse> {}

export class Tags {
  readonly #twitch: Twitch;

  constructor(twitch: Twitch) {
    this.#twitch = twitch;
  }

  /**
   * **IMPORTANT** Twitch is moving from Twitch-defined tags to channel-defined
   * tags. **IMPORTANT** As of February 28, 2023, this endpoint returns an
   * empty array. On July 13, 2023, it will return a 410 response. If you use
   * this endpoint, please update your code to use [Get Channel
   * Information](https://dev.twitch.tv/docs/api/reference#get-channel-information).
   *
   * Gets the list of stream tags that the broadcaster or Twitch added to their
   * channel.
   *
   * __Authorization:__
   *
   * Requires an [app access
   * token](https://dev.twitch.tv/docs/authentication#app-access-tokens) or
   * [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens).
   */
  async getStreamTags(
    options: GetStreamTagsRequest
  ): Promise<GetStreamTagsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/streams/tags", this.#twitch.base);
    url.searchParams.append("broadcaster_id", options.broadcasterId.toString());
    const opts: RequestInit = { method: "GET" };

    return await this.#twitch.request(url, opts, GetStreamTagsResponse);
  }
  /**
   * **IMPORTANT** Twitch is moving from Twitch-defined tags to channel-defined
   * tags. **IMPORTANT** As of February 28, 2023, this endpoint returns an
   * empty array. On July 13, 2023, it will return a 410 response.
   *
   * Gets a list of all stream tags that Twitch defines. The broadcaster may
   * apply any of these to their channel except automatic tags. For an online
   * list of the possible tags, see [List of All
   * Tags](https://www.twitch.tv/directory/all/tags).
   *
   * __Authorization:__
   *
   * Requires an [app access
   * token](https://dev.twitch.tv/docs/authentication#app-access-tokens) or
   * [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens).
   */
  async getAllStreamTags(
    options: GetAllStreamTagsRequest
  ): Promise<GetAllStreamTagsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/tags/streams", this.#twitch.base);
    if (options.tagId) {
      for (const value of options.tagId) {
        url.searchParams.append("tag_id", value.toString());
      }
    }
    if (options.first) {
      url.searchParams.append("first", options.first.toString());
    }
    if (options.after) {
      url.searchParams.append("after", options.after.toString());
    }
    const opts: RequestInit = { method: "GET" };

    return await this.#twitch.request(url, opts, GetAllStreamTagsResponse);
  }
}
