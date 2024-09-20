
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

export interface GetClipsRequest {
  /**
   * The start date used to filter clips. The API returns only clips within the
   * start and end date window. Specify the date and time in RFC3339 format.
   */
  startedAt?: string,
  /**
   * An ID that identifies the game whose clips you want to get. Use this
   * parameter to get clips that were captured from streams that were playing
   * this game.
   */
  gameId?: string,
  /**
   * An ID that identifies the clip to get. To specify more than one ID,
   * include this parameter for each clip you want to get. For example,
   * `id=foo&id=bar`. You may specify a maximum of 100 IDs. The API ignores
   * duplicate IDs and IDs that aren’t found.
   */
  id?: string[],
  /**
   * The maximum number of clips to return per page in the response. The
   * minimum page size is 1 clip per page and the maximum is 100\. The default
   * is 20.
   */
  first?: number,
  /**
   * A Boolean value that determines whether the response includes featured
   * clips. If **true**, returns only clips that are featured. If **false**,
   * returns only clips that aren’t featured. All clips are returned if this
   * parameter is not present.
   */
  isFeatured?: boolean,
  /**
   * The cursor used to get the next page of results. The **Pagination** object
   * in the response contains the cursor’s value. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  after?: string,
  /**
   * An ID that identifies the broadcaster whose video clips you want to get.
   * Use this parameter to get clips that were captured from the
   * broadcaster’s streams.
   */
  broadcasterId?: string,
  /**
   * The end date used to filter clips. If not specified, the time window is
   * the start date plus one week. Specify the date and time in RFC3339 format.
   */
  endedAt?: string,
  /**
   * The cursor used to get the previous page of results. The **Pagination**
   * object in the response contains the cursor’s value. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  before?: string,
}
export interface CreateClipRequest {
  /**
   * A Boolean value that determines whether the API captures the clip at the
   * moment the viewer requests it or after a delay. If **false** (default),
   * Twitch captures the clip at the moment the viewer requests it (this is the
   * same clip experience as the Twitch UX). If **true**, Twitch adds a delay
   * before capturing the clip (this basically shifts the capture window to the
   * right slightly).
   */
  hasDelay?: boolean,
  /**
   * The ID of the broadcaster whose stream you want to create a clip from.
   */
  broadcasterId: string,
}
export const GetClipsResponse = z.object({
  /**
   * The list of video clips. For clips returned by _game\_id_ or
   * _broadcaster\_id_, the list is in descending order by view count. For
   * lists returned by _id_, the list is in the same order as the input
   * IDs.
   */
  "data": z.object({
    "broadcaster_id": z.string(),
    "broadcaster_name": z.string(),
    "created_at": z.string(),
    "creator_id": z.string(),
    "creator_name": z.string(),
    "duration": z.number(),
    "embed_url": z.string(),
    "game_id": z.string(),
    "id": z.string(),
    "is_featured": z.boolean(),
    "language": z.string(),
    "thumbnail_url": z.string(),
    "title": z.string(),
    "url": z.string(),
    "video_id": z.string(),
    "view_count": z.number(),
    "vod_offset": z.number()
  }).transform((it) => ({
    /**
     * An ID that identifies the broadcaster that the video was clipped
     * from.
     */
    "broadcasterId": it["broadcaster_id"],
    /**
     * The broadcaster’s display name.
     */
    "broadcasterName": it["broadcaster_name"],
    /**
     * The date and time of when the clip was created. The date and time
     * is in RFC3339 format.
     */
    "createdAt": it["created_at"],
    /**
     * An ID that identifies the user that created the clip.
     */
    "creatorId": it["creator_id"],
    /**
     * The user’s display name.
     */
    "creatorName": it["creator_name"],
    /**
     * The length of the clip, in seconds. Precision is 0.1.
     */
    "duration": it["duration"],
    /**
     * A URL that you can use in an iframe to embed the clip (see
     * [Embedding Video and
     * Clips](https://dev.twitch.tv/docs/embed/video-and-clips)).
     */
    "embedUrl": it["embed_url"],
    /**
     * The ID of the game that was being played when the clip was created.
     */
    "gameId": it["game_id"],
    /**
     * An ID that uniquely identifies the clip.
     */
    "id": it["id"],
    /**
     * A Boolean value that indicates if the clip is featured or not.
     */
    "isFeatured": it["is_featured"],
    /**
     * The ISO 639-1 two-letter language code that the broadcaster
     * broadcasts in. For example, _en_ for English. The value is _other_
     * if the broadcaster uses a language that Twitch doesn’t support.
     */
    "language": it["language"],
    /**
     * A URL to a thumbnail image of the clip.
     */
    "thumbnailUrl": it["thumbnail_url"],
    /**
     * The title of the clip.
     */
    "title": it["title"],
    /**
     * A URL to the clip.
     */
    "url": it["url"],
    /**
     * An ID that identifies the video that the clip came from. This field
     * contains an empty string if the video is not available.
     */
    "videoId": it["video_id"],
    /**
     * The number of times the clip has been viewed.
     */
    "viewCount": it["view_count"],
    /**
     * The zero-based offset, in seconds, to where the clip starts in the
     * video (VOD). Is **null** if the video is not available or hasn’t
     * been created yet from the live stream (see `video_id`).  
     *   
     * Note that there’s a delay between when a clip is created during a
     * broadcast and when the offset is set. During the delay period,
     * `vod_offset` is **null**. The delay is indeterminant but is
     * typically minutes long.
     */
    "vodOffset": it["vod_offset"],

  })).array(),
  /**
   * The information used to page through the list of results. The object
   * is empty if there are no more pages left to page through. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  "pagination": z.object({
    /**
     * The cursor used to get the next page of results. Set the
     * request’s _after_ or _before_ query parameter to this value
     * depending on whether you’re paging forwards or backwards.
     */
    "cursor": z.string().optional()
  }).optional()
});
export interface GetClipsResponse extends z.infer<typeof GetClipsResponse> {}



export class Clips {
  readonly #twitch: Twitch;

  constructor(twitch: Twitch) {
    this.#twitch = twitch;
  }

  /**
   * Gets one or more video clips that were captured from streams. For
   * information about clips, see [How to use
   * clips](https://help.twitch.tv/s/article/how-to-use-clips).
   * 
   * __Authorization:__
   * 
   * Requires an [app access
   * token](https://dev.twitch.tv/docs/authentication#app-access-tokens) or
   * [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens).
   * 
   * __Request Query Parameters:__
   * 
   * The _id_, _game\_id_, and _broadcaster\_id_ query parameters are mutually
   * exclusive.
   */
  async getClips(options: GetClipsRequest): Promise<GetClipsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/clips", this.#twitch.base);
    if (options.startedAt) {
      url.searchParams.append("started_at", options.startedAt.toString());
    }
    if (options.gameId) {
      url.searchParams.append("game_id", options.gameId.toString());
    }
    if (options.id) {
      for (const value of options.id) {
      url.searchParams.append("id", value.toString());
    }
    }
    if (options.first) {
      url.searchParams.append("first", options.first.toString());
    }
    if (options.isFeatured) {
      url.searchParams.append("is_featured", options.isFeatured.toString());
    }
    if (options.after) {
      url.searchParams.append("after", options.after.toString());
    }
    if (options.broadcasterId) {
      url.searchParams.append("broadcaster_id", options.broadcasterId.toString());
    }
    if (options.endedAt) {
      url.searchParams.append("ended_at", options.endedAt.toString());
    }
    if (options.before) {
      url.searchParams.append("before", options.before.toString());
    }
    const opts: RequestInit = { method: 'GET' };

    return await this.#twitch.request(url, opts, GetClipsResponse);
  }
  /**
   * Creates a clip from the broadcaster’s stream.
   * 
   * This API captures up to 90 seconds of the broadcaster’s stream. The 90
   * seconds spans the point in the stream from when you called the API. For
   * example, if you call the API at the 4:00 minute mark, the API captures
   * from approximately the 3:35 mark to approximately the 4:05 minute mark.
   * Twitch tries its best to capture 90 seconds of the stream, but the actual
   * length may be less. This may occur if you begin capturing the clip near
   * the beginning or end of the stream.
   * 
   * By default, Twitch publishes up to the last 30 seconds of the 90 seconds
   * window and provides a default title for the clip. To specify the title and
   * the portion of the 90 seconds window that’s used for the clip, use the
   * URL in the response’s `edit_url` field. You can specify a clip that’s
   * from 5 seconds to 60 seconds in length. The URL is valid for up to 24
   * hours or until the clip is published, whichever comes first.
   * 
   * Creating a clip is an asynchronous process that can take a short amount of
   * time to complete. To determine whether the clip was successfully created,
   * call [Get Clips](https://dev.twitch.tv/docs/api/reference#get-clips) using
   * the clip ID that this request returned. If Get Clips returns the clip, the
   * clip was successfully created. If after 15 seconds Get Clips hasn’t
   * returned the clip, assume it failed.
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **clips:edit** scope.
   */
  async createClip(options: CreateClipRequest): Promise<void> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/clips", this.#twitch.base);
    if (options.hasDelay) {
      url.searchParams.append("has_delay", options.hasDelay.toString());
    }
    url.searchParams.append("broadcaster_id", options.broadcasterId.toString());
    const opts: RequestInit = { method: 'POST' };

    await this.#twitch.request(url, opts);
  }
}
