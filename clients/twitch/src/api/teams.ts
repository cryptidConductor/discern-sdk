
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

export interface GetTeamsRequest {
  /**
   * The name of the team to get. This parameter and the _id_ parameter are
   * mutually exclusive; you must specify the team’s name or ID but not both.
   */
  name?: string,
  /**
   * The ID of the team to get. This parameter and the _name_ parameter are
   * mutually exclusive; you must specify the team’s name or ID but not both.
   */
  id?: string,
}
export interface GetChannelTeamsRequest {
  /**
   * The ID of the broadcaster whose teams you want to get.
   */
  broadcasterId: string,
}
export const GetTeamsResponse = z.object({
  /**
   * A list that contains the single team that you requested.
   */
  "data": z.object({
    "background_image_url": z.string(),
    "banner": z.string(),
    "created_at": z.string(),
    "id": z.string(),
    "info": z.string(),
    "team_display_name": z.string(),
    "team_name": z.string(),
    "thumbnail_url": z.string(),
    "updated_at": z.string(),
    "users": z.object({
      "user_id": z.string(),
      "user_login": z.string(),
      "user_name": z.string()
    }).transform((it) => ({
      /**
       * An ID that identifies the team member.
       */
      "userId": it["user_id"],
      /**
       * The team member’s login name.
       */
      "userLogin": it["user_login"],
      /**
       * The team member’s display name.
       */
      "userName": it["user_name"],

    })).array()
  }).transform((it) => ({
    /**
     * A URL to the team’s background image.
     */
    "backgroundImageUrl": it["background_image_url"],
    /**
     * A URL to the team’s banner.
     */
    "banner": it["banner"],
    /**
     * The UTC date and time (in RFC3339 format) of when the team was
     * created.
     */
    "createdAt": it["created_at"],
    /**
     * An ID that identifies the team.
     */
    "id": it["id"],
    /**
     * The team’s description. The description may contain formatting
     * such as Markdown, HTML, newline (\\n) characters, etc.
     */
    "info": it["info"],
    /**
     * The team’s display name.
     */
    "teamDisplayName": it["team_display_name"],
    /**
     * The team’s name.
     */
    "teamName": it["team_name"],
    /**
     * A URL to a thumbnail image of the team’s logo.
     */
    "thumbnailUrl": it["thumbnail_url"],
    /**
     * The UTC date and time (in RFC3339 format) of the last time the team
     * was updated.
     */
    "updatedAt": it["updated_at"],
    /**
     * The list of team members.
     */
    "users": it["users"],

  })).array()
});
export interface GetTeamsResponse extends z.infer<typeof GetTeamsResponse> {}

export const GetChannelTeamsResponse = z.object({
  /**
   * The list of teams that the broadcaster is a member of. Returns an
   * empty array if the broadcaster is not a member of a team.
   */
  "data": z.object({
    "background_image_url": z.string(),
    "banner": z.string(),
    "broadcaster_id": z.string(),
    "broadcaster_login": z.string(),
    "broadcaster_name": z.string(),
    "created_at": z.string(),
    "id": z.string(),
    "info": z.string(),
    "team_display_name": z.string(),
    "team_name": z.string(),
    "thumbnail_url": z.string(),
    "updated_at": z.string()
  }).transform((it) => ({
    /**
     * A URL to the team’s background image.
     */
    "backgroundImageUrl": it["background_image_url"],
    /**
     * A URL to the team’s banner.
     */
    "banner": it["banner"],
    /**
     * An ID that identifies the broadcaster.
     */
    "broadcasterId": it["broadcaster_id"],
    /**
     * The broadcaster’s login name.
     */
    "broadcasterLogin": it["broadcaster_login"],
    /**
     * The broadcaster’s display name.
     */
    "broadcasterName": it["broadcaster_name"],
    /**
     * The UTC date and time (in RFC3339 format) of when the team was
     * created.
     */
    "createdAt": it["created_at"],
    /**
     * An ID that identifies the team.
     */
    "id": it["id"],
    /**
     * The team’s description. The description may contain formatting
     * such as Markdown, HTML, newline (\\n) characters, etc.
     */
    "info": it["info"],
    /**
     * The team’s display name.
     */
    "teamDisplayName": it["team_display_name"],
    /**
     * The team’s name.
     */
    "teamName": it["team_name"],
    /**
     * A URL to a thumbnail image of the team’s logo.
     */
    "thumbnailUrl": it["thumbnail_url"],
    /**
     * The UTC date and time (in RFC3339 format) of the last time the team
     * was updated.
     */
    "updatedAt": it["updated_at"],

  })).array()
});
export interface GetChannelTeamsResponse extends z.infer<typeof GetChannelTeamsResponse> {}



export class Teams {
  readonly #twitch: Twitch;

  constructor(twitch: Twitch) {
    this.#twitch = twitch;
  }

  /**
   * Gets information about the specified Twitch team. [Read
   * More](https://help.twitch.tv/s/article/twitch-teams)
   * 
   * __Authorization:__
   * 
   * Requires an [app access
   * token](https://dev.twitch.tv/docs/authentication#app-access-tokens) or
   * [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens).
   */
  async getTeams(options: GetTeamsRequest): Promise<GetTeamsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/teams", this.#twitch.base);
    if (options.name) {
      url.searchParams.append("name", options.name.toString());
    }
    if (options.id) {
      url.searchParams.append("id", options.id.toString());
    }
    const opts: RequestInit = { method: 'GET' };

    return await this.#twitch.request(url, opts, GetTeamsResponse);
  }
  /**
   * Gets the list of Twitch teams that the broadcaster is a member of.
   * 
   * __Authorization:__
   * 
   * Requires an [app access
   * token](https://dev.twitch.tv/docs/authentication#app-access-tokens) or
   * [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens).
   */
  async getChannelTeams(options: GetChannelTeamsRequest): Promise<GetChannelTeamsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/teams/channel", this.#twitch.base);
    url.searchParams.append("broadcaster_id", options.broadcasterId.toString());
    const opts: RequestInit = { method: 'GET' };

    return await this.#twitch.request(url, opts, GetChannelTeamsResponse);
  }
}
