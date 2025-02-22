
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

export interface GetPollsRequest {
  /**
   * A list of IDs that identify the polls to return. To specify more than one
   * ID, include this parameter for each poll you want to get. For example,
   * `id=1234&id=5678`. You may specify a maximum of 20 IDs.  
   *   
   * Specify this parameter only if you want to filter the list that the
   * request returns. The endpoint ignores duplicate IDs and those not owned by
   * this broadcaster.
   */
  id?: string[],
  /**
   * The cursor used to get the next page of results. The **Pagination** object
   * in the response contains the cursor’s value. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  after?: string,
  /**
   * The maximum number of items to return per page in the response. The
   * minimum page size is 1 item per page and the maximum is 20 items per page.
   * The default is 20.
   */
  first?: string,
}
export interface CreatePollRequest {
  /**
   * A Boolean value that indicates whether viewers may cast additional votes
   * using Channel Points. If **true**, the viewer may cast more than one vote
   * but each additional vote costs the number of Channel Points specified in
   * `channel_points_per_vote`. The default is **false** (viewers may cast only
   * one vote). For information about Channel Points, see [Channel Points
   * Guide](https://help.twitch.tv/s/article/channel-points-guide).
   */
  channelPointsVotingEnabled?: boolean,
  /**
   * The question that viewers will vote on. For example, _What game should I
   * play next?_ The question may contain a maximum of 60 characters.
   */
  title: string,
  /**
   * A list of choices that viewers may choose from. The list must contain a
   * minimum of 2 choices and up to a maximum of 5 choices.
   */
  choices: {
  /**
   * One of the choices the viewer may select. The choice may contain a
   * maximum of 25 characters.
   */
  title: string
}[],
  /**
   * The length of time (in seconds) that the poll will run for. The minimum is
   * 15 seconds and the maximum is 1800 seconds (30 minutes).
   */
  duration: number,
  /**
   * The number of points that the viewer must spend to cast one additional
   * vote. The minimum is 1 and the maximum is 1000000\. Set only if
   * `ChannelPointsVotingEnabled` is **true**.
   */
  channelPointsPerVote?: number,
}
export interface EndPollRequest {
  /**
   * The ID of the poll to update.
   */
  id: string,
  /**
   * The status to set the poll to. Possible case-sensitive values are:  
   *   
   * * TERMINATED — Ends the poll before the poll is scheduled to end. The
   * poll remains publicly visible.
   * * ARCHIVED — Ends the poll before the poll is scheduled to end, and then
   * archives it so it's no longer publicly visible.
   */
  status: | "TERMINATED"| "ARCHIVED",
}
export const GetPollsResponse = z.object({
  /**
   * A list of polls. The polls are returned in descending order of start
   * time unless you specify IDs in the request, in which case they're
   * returned in the same order as you passed them in the request. The
   * list is empty if the broadcaster hasn't created polls.
   */
  "data": z.object({
    "bits_per_vote": z.number(),
    "bits_voting_enabled": z.boolean(),
    "broadcaster_id": z.string(),
    "broadcaster_login": z.string(),
    "broadcaster_name": z.string(),
    "channel_points_per_vote": z.number(),
    "channel_points_voting_enabled": z.boolean(),
    "choices": z.object({
      "bits_votes": z.number(),
      "channel_points_votes": z.number(),
      "id": z.string(),
      "title": z.string(),
      "votes": z.number()
    }).transform((it) => ({
      /**
       * Not used; will be set to 0.
       */
      "bitsVotes": it["bits_votes"],
      /**
       * The number of votes cast using Channel Points.
       */
      "channelPointsVotes": it["channel_points_votes"],
      /**
       * An ID that identifies this choice.
       */
      "id": it["id"],
      /**
       * The choice’s title. The title may contain a maximum of 25
       * characters.
       */
      "title": it["title"],
      /**
       * The total number of votes cast for this choice.
       */
      "votes": it["votes"],

    })).array(),
    "duration": z.number(),
    "ended_at": z.string(),
    "id": z.string(),
    "started_at": z.string(),
    "status": z.enum(["ACTIVE", "COMPLETED", "TERMINATED", "ARCHIVED", "MODERATED", "INVALID"]),
    "title": z.string()
  }).transform((it) => ({
    /**
     * Not used; will be set to 0.
     */
    "bitsPerVote": it["bits_per_vote"],
    /**
     * Not used; will be set to **false**.
     */
    "bitsVotingEnabled": it["bits_voting_enabled"],
    /**
     * An ID that identifies the broadcaster that created the poll.
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
     * The number of points the viewer must spend to cast one additional
     * vote.
     */
    "channelPointsPerVote": it["channel_points_per_vote"],
    /**
     * A Boolean value that indicates whether viewers may cast additional
     * votes using Channel Points. For information about Channel Points,
     * see [Channel Points
     * Guide](https://help.twitch.tv/s/article/channel-points-guide).
     */
    "channelPointsVotingEnabled": it["channel_points_voting_enabled"],
    /**
     * A list of choices that viewers can choose from. The list will
     * contain a minimum of two choices and up to a maximum of five
     * choices.
     */
    "choices": it["choices"],
    /**
     * The length of time (in seconds) that the poll will run for.
     */
    "duration": it["duration"],
    /**
     * The UTC date and time (in RFC3339 format) of when the poll ended.
     * If `status` is ACTIVE, this field is set to **null**.
     */
    "endedAt": it["ended_at"],
    /**
     * An ID that identifies the poll.
     */
    "id": it["id"],
    /**
     * The UTC date and time (in RFC3339 format) of when the poll began.
     */
    "startedAt": it["started_at"],
    /**
     * The poll’s status. Valid values are:  
     *   
     * * ACTIVE — The poll is running.
     * * COMPLETED — The poll ended on schedule (see the `duration`
     * field).
     * * TERMINATED — The poll was terminated before its scheduled end.
     * * ARCHIVED — The poll has been archived and is no longer visible
     * on the channel.
     * * MODERATED — The poll was deleted.
     * * INVALID — Something went wrong while determining the state.
     */
    "status": it["status"],
    /**
     * The question that viewers are voting on. For example, _What game
     * should I play next?_ The title may contain a maximum of 60
     * characters.
     */
    "title": it["title"],

  })).array(),
  /**
   * Contains the information used to page through the list of results.
   * The object is empty if there are no more pages left to page through.
   * [Read More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  "pagination": z.object({
    /**
     * The cursor used to get the next page of results. Use the cursor to
     * set the request's _after_ query parameter.
     */
    "cursor": z.string().optional()
  }).optional()
});
export interface GetPollsResponse extends z.infer<typeof GetPollsResponse> {}

export const CreatePollResponse = z.object({
  /**
   * A list that contains the single poll that you created.
   */
  "data": z.object({
    "bits_per_vote": z.number(),
    "bits_voting_enabled": z.boolean(),
    "broadcaster_id": z.string(),
    "broadcaster_login": z.string(),
    "broadcaster_name": z.string(),
    "channel_points_per_vote": z.number(),
    "channel_points_voting_enabled": z.boolean(),
    "choices": z.object({
      "bits_votes": z.number(),
      "channel_points_votes": z.number(),
      "id": z.string(),
      "title": z.string(),
      "votes": z.number()
    }).transform((it) => ({
      /**
       * Not used; will be set to 0.
       */
      "bitsVotes": it["bits_votes"],
      /**
       * The number of votes cast using Channel Points.
       */
      "channelPointsVotes": it["channel_points_votes"],
      /**
       * An ID that identifies this choice.
       */
      "id": it["id"],
      /**
       * The choice’s title. The title may contain a maximum of 25
       * characters.
       */
      "title": it["title"],
      /**
       * The total number of votes cast for this choice.
       */
      "votes": it["votes"],

    })).array(),
    "duration": z.number(),
    "ended_at": z.string(),
    "id": z.string(),
    "started_at": z.string(),
    "status": z.enum(["ACTIVE", "COMPLETED", "TERMINATED", "ARCHIVED", "MODERATED", "INVALID"]),
    "title": z.string()
  }).transform((it) => ({
    /**
     * Not used; will be set to 0.
     */
    "bitsPerVote": it["bits_per_vote"],
    /**
     * Not used; will be set to **false**.
     */
    "bitsVotingEnabled": it["bits_voting_enabled"],
    /**
     * An ID that identifies the broadcaster that created the poll.
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
     * The number of points the viewer must spend to cast one additional
     * vote.
     */
    "channelPointsPerVote": it["channel_points_per_vote"],
    /**
     * A Boolean value that indicates whether viewers may cast additional
     * votes using Channel Points. For information about Channel Points,
     * see [Channel Points
     * Guide](https://help.twitch.tv/s/article/channel-points-guide).
     */
    "channelPointsVotingEnabled": it["channel_points_voting_enabled"],
    /**
     * A list of choices that viewers can choose from. The list will
     * contain a minimum of two choices and up to a maximum of five
     * choices.
     */
    "choices": it["choices"],
    /**
     * The length of time (in seconds) that the poll will run for.
     */
    "duration": it["duration"],
    /**
     * The UTC date and time (in RFC3339 format) of when the poll ended.
     * If `status` is ACTIVE, this field is set to **null**.
     */
    "endedAt": it["ended_at"],
    /**
     * An ID that identifies the poll.
     */
    "id": it["id"],
    /**
     * The UTC date and time (in RFC3339 format) of when the poll began.
     */
    "startedAt": it["started_at"],
    /**
     * The poll’s status. Valid values are:  
     *   
     * * ACTIVE — The poll is running.
     * * COMPLETED — The poll ended on schedule (see the `duration`
     * field).
     * * TERMINATED — The poll was terminated before its scheduled end.
     * * ARCHIVED — The poll has been archived and is no longer visible
     * on the channel.
     * * MODERATED — The poll was deleted.
     * * INVALID — Something went wrong while determining the state.
     */
    "status": it["status"],
    /**
     * The question that viewers are voting on. For example, _What game
     * should I play next?_ The title may contain a maximum of 60
     * characters.
     */
    "title": it["title"],

  })).array()
});
export interface CreatePollResponse extends z.infer<typeof CreatePollResponse> {}

export const EndPollResponse = z.object({
  /**
   * A list that contains the poll that you ended.
   */
  "data": z.object({
    "bits_per_vote": z.number(),
    "bits_voting_enabled": z.boolean(),
    "broadcaster_id": z.string(),
    "broadcaster_login": z.string(),
    "broadcaster_name": z.string(),
    "channel_points_per_vote": z.number(),
    "channel_points_voting_enabled": z.boolean(),
    "choices": z.object({
      "bits_votes": z.number(),
      "channel_points_votes": z.number(),
      "id": z.string(),
      "title": z.string(),
      "votes": z.number()
    }).transform((it) => ({
      /**
       * Not used; will be set to 0.
       */
      "bitsVotes": it["bits_votes"],
      /**
       * The number of votes cast using Channel Points.
       */
      "channelPointsVotes": it["channel_points_votes"],
      /**
       * An ID that identifies this choice.
       */
      "id": it["id"],
      /**
       * The choice’s title. The title may contain a maximum of 25
       * characters.
       */
      "title": it["title"],
      /**
       * The total number of votes cast for this choice.
       */
      "votes": it["votes"],

    })).array(),
    "duration": z.number(),
    "ended_at": z.string(),
    "id": z.string(),
    "started_at": z.string(),
    "status": z.enum(["ACTIVE", "COMPLETED", "TERMINATED", "ARCHIVED", "MODERATED", "INVALID"]),
    "title": z.string()
  }).transform((it) => ({
    /**
     * Not used; will be set to 0.
     */
    "bitsPerVote": it["bits_per_vote"],
    /**
     * Not used; will be set to **false**.
     */
    "bitsVotingEnabled": it["bits_voting_enabled"],
    /**
     * An ID that identifies the broadcaster that created the poll.
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
     * The number of points the viewer must spend to cast one additional
     * vote.
     */
    "channelPointsPerVote": it["channel_points_per_vote"],
    /**
     * A Boolean value that indicates whether viewers may cast additional
     * votes using Channel Points. For information about Channel Points,
     * see [Channel Points
     * Guide](https://help.twitch.tv/s/article/channel-points-guide).
     */
    "channelPointsVotingEnabled": it["channel_points_voting_enabled"],
    /**
     * A list of choices that viewers can choose from. The list will
     * contain a minimum of two choices and up to a maximum of five
     * choices.
     */
    "choices": it["choices"],
    /**
     * The length of time (in seconds) that the poll will run for.
     */
    "duration": it["duration"],
    /**
     * The UTC date and time (in RFC3339 format) of when the poll ended.
     * If `status` is ACTIVE, this field is set to **null**.
     */
    "endedAt": it["ended_at"],
    /**
     * An ID that identifies the poll.
     */
    "id": it["id"],
    /**
     * The UTC date and time (in RFC3339 format) of when the poll began.
     */
    "startedAt": it["started_at"],
    /**
     * The poll’s status. Valid values are:  
     *   
     * * ACTIVE — The poll is running.
     * * COMPLETED — The poll ended on schedule (see the `duration`
     * field).
     * * TERMINATED — The poll was terminated before its scheduled end.
     * * ARCHIVED — The poll has been archived and is no longer visible
     * on the channel.
     * * MODERATED — The poll was deleted.
     * * INVALID — Something went wrong while determining the state.
     */
    "status": it["status"],
    /**
     * The question that viewers are voting on. For example, _What game
     * should I play next?_ The title may contain a maximum of 60
     * characters.
     */
    "title": it["title"],

  })).array()
});
export interface EndPollResponse extends z.infer<typeof EndPollResponse> {}



export class Polls {
  readonly #twitch: Twitch;

  constructor(twitch: Twitch) {
    this.#twitch = twitch;
  }

  /**
   * Gets a list of polls that the broadcaster created.
   * 
   * Polls are available for 90 days after they’re created.
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **channel:read:polls** or **channel:manage:polls** scope.
   */
  async getPolls(options: GetPollsRequest): Promise<GetPollsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/polls", this.#twitch.base);
    if (options.id) {
      for (const value of options.id) {
      url.searchParams.append("id", value.toString());
    }
    }
    if (options.after) {
      url.searchParams.append("after", options.after.toString());
    }
    if (options.first) {
      url.searchParams.append("first", options.first.toString());
    }
    url.searchParams.append("broadcaster_id", snapshot.userId);
    const opts: RequestInit = { method: 'GET' };

    return await this.#twitch.request(url, opts, GetPollsResponse);
  }
  /**
   * Creates a poll that viewers in the broadcaster’s channel can vote on.
   * 
   * The poll begins as soon as it’s created. You may run only one poll at a
   * time.
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **channel:manage:polls** scope.
   */
  async createPoll(options: CreatePollRequest): Promise<CreatePollResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/polls", this.#twitch.base);
    const opts: RequestInit = { method: 'POST' };

    const body: Record<string, unknown> = {};

    body.channel_points_voting_enabled = options.channelPointsVotingEnabled;
    body.broadcaster_id = snapshot.userId;
    body.title = options.title;
    body.choices = options.choices;
    body.duration = options.duration;
    body.channel_points_per_vote = options.channelPointsPerVote;
    opts.body = JSON.stringify(body);
    return await this.#twitch.request(url, opts, CreatePollResponse);
  }
  /**
   * Ends an active poll. You have the option to end it or end it and archive
   * it.
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **channel:manage:polls** scope.
   */
  async endPoll(options: EndPollRequest): Promise<EndPollResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/polls", this.#twitch.base);
    const opts: RequestInit = { method: 'PATCH' };

    const body: Record<string, unknown> = {};

    body.id = options.id;
    body.status = options.status;
    body.broadcaster_id = snapshot.userId;
    opts.body = JSON.stringify(body);
    return await this.#twitch.request(url, opts, EndPollResponse);
  }
}
