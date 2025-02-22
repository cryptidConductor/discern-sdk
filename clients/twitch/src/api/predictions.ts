
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

export interface GetPredictionsRequest {
  /**
   * The ID of the prediction to get. To specify more than one ID, include this
   * parameter for each prediction you want to get. For example,
   * `id=1234&id=5678`. You may specify a maximum of 25 IDs. The endpoint
   * ignores duplicate IDs and those not owned by the broadcaster.
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
   * minimum page size is 1 item per page and the maximum is 25 items per page.
   * The default is 20.
   */
  first?: string,
}
export interface CreatePredictionRequest {
  /**
   * The list of possible outcomes that the viewers may choose from. The list
   * must contain a minimum of 2 choices and up to a maximum of 10 choices.
   */
  outcomes: {
  /**
   * The text of one of the outcomes that the viewer may select. The title
   * is limited to a maximum of 25 characters.
   */
  title: string
}[],
  /**
   * The length of time (in seconds) that the prediction will run for. The
   * minimum is 30 seconds and the maximum is 1800 seconds (30 minutes).
   */
  predictionWindow: number,
  /**
   * The question that the broadcaster is asking. For example, _Will I finish
   * this entire pizza?_ The title is limited to a maximum of 45 characters.
   */
  title: string,
}
export interface EndPredictionRequest {
  /**
   * The ID of the prediction to update.
   */
  id: string,
  /**
   * The status to set the prediction to. Possible case-sensitive values are:  
   *   
   * * RESOLVED — The winning outcome is determined and the Channel Points
   * are distributed to the viewers who predicted the correct outcome.
   * * CANCELED — The broadcaster is canceling the prediction and sending
   * refunds to the participants.
   * * LOCKED — The broadcaster is locking the prediction, which means
   * viewers may no longer make predictions.
   *   
   * The broadcaster can update an active prediction to LOCKED, RESOLVED, or
   * CANCELED; and update a locked prediction to RESOLVED or CANCELED.  
   *   
   * The broadcaster has up to 24 hours after the prediction window closes to
   * resolve the prediction. If not, Twitch sets the status to CANCELED and
   * returns the points.
   */
  status: | "RESOLVED"| "CANCELED"| "LOCKED",
  /**
   * The ID of the winning outcome. You must set this parameter if you set
   * `status` to RESOLVED.
   */
  winningOutcomeId?: string,
}
export const GetPredictionsResponse = z.object({
  /**
   * The broadcaster’s list of Channel Points Predictions. The list is
   * sorted in descending ordered by when the prediction began (the most
   * recent prediction is first). The list is empty if the broadcaster
   * hasn’t created predictions.
   */
  "data": z.object({
    "broadcaster_id": z.string(),
    "broadcaster_login": z.string(),
    "broadcaster_name": z.string(),
    "created_at": z.string(),
    "ended_at": z.string(),
    "id": z.string(),
    "locked_at": z.string(),
    "outcomes": z.object({
      "channel_points": z.number(),
      "color": z.enum(["BLUE", "PINK"]),
      "id": z.string(),
      "title": z.string(),
      "top_predictors": z.object({
        "channel_points_used": z.number(),
        "channel_points_won": z.number(),
        "user_id": z.string(),
        "user_login": z.string(),
        "user_name": z.string()
      }).transform((it) => ({
        /**
         * The number of Channel Points the viewer spent.
         */
        "channelPointsUsed": it["channel_points_used"],
        /**
         * The number of Channel Points distributed to the viewer.
         */
        "channelPointsWon": it["channel_points_won"],
        /**
         * An ID that identifies the viewer.
         */
        "userId": it["user_id"],
        /**
         * The viewer’s login name.
         */
        "userLogin": it["user_login"],
        /**
         * The viewer’s display name.
         */
        "userName": it["user_name"],

      })).array(),
      "users": z.number()
    }).transform((it) => ({
      /**
       * The number of Channel Points spent by viewers on this outcome.
       */
      "channelPoints": it["channel_points"],
      /**
       * The color that visually identifies this outcome in the UX.
       * Possible values are:  
       *   
       * * BLUE
       * * PINK
       *   
       * If the number of outcomes is two, the color is BLUE for the first
       * outcome and PINK for the second outcome. If there are more than
       * two outcomes, the color is BLUE for all outcomes.
       */
      "color": it["color"],
      /**
       * An ID that identifies this outcome.
       */
      "id": it["id"],
      /**
       * The outcome’s text.
       */
      "title": it["title"],
      /**
       * A list of viewers who were the top predictors; otherwise,
       * **null** if none.
       */
      "topPredictors": it["top_predictors"],
      /**
       * The number of unique viewers that chose this outcome.
       */
      "users": it["users"],

    })).array(),
    "prediction_window": z.number(),
    "status": z.enum(["ACTIVE", "CANCELED", "LOCKED", "RESOLVED"]),
    "title": z.string(),
    "winning_outcome_id": z.string()
  }).transform((it) => ({
    /**
     * An ID that identifies the broadcaster that created the prediction.
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
     * The UTC date and time of when the Prediction began.
     */
    "createdAt": it["created_at"],
    /**
     * The UTC date and time of when the Prediction ended. If `status` is
     * ACTIVE, this is set to **null**.
     */
    "endedAt": it["ended_at"],
    /**
     * An ID that identifies this prediction.
     */
    "id": it["id"],
    /**
     * The UTC date and time of when the Prediction was locked. If
     * `status` is not LOCKED, this is set to **null**.
     */
    "lockedAt": it["locked_at"],
    /**
     * The list of possible outcomes for the prediction.
     */
    "outcomes": it["outcomes"],
    /**
     * The length of time (in seconds) that the prediction will run for.
     */
    "predictionWindow": it["prediction_window"],
    /**
     * The prediction’s status. Valid values are:  
     *   
     * * ACTIVE — The Prediction is running and viewers can make
     * predictions.
     * * CANCELED — The broadcaster canceled the Prediction and refunded
     * the Channel Points to the participants.
     * * LOCKED — The broadcaster locked the Prediction, which means
     * viewers can no longer make predictions.
     * * RESOLVED — The winning outcome was determined and the Channel
     * Points were distributed to the viewers who predicted the correct
     * outcome.
     */
    "status": it["status"],
    /**
     * The question that the prediction asks. For example, _Will I finish
     * this entire pizza?_
     */
    "title": it["title"],
    /**
     * The ID of the winning outcome. Is **null** unless `status` is
     * RESOLVED.
     */
    "winningOutcomeId": it["winning_outcome_id"],

  })).array(),
  /**
   * Contains the information used to page through the list of results.
   * The object is empty if there are no more pages left to page through.
   * [Read More](https://dev.twitch.tv/docs/api/guide#pagination)
   */
  "pagination": z.object({
    /**
     * The cursor used to get the next page of results. Use the cursor to
     * set the request’s _after_ query parameter.
     */
    "cursor": z.string().optional()
  }).optional()
});
export interface GetPredictionsResponse extends z.infer<typeof GetPredictionsResponse> {}

export const CreatePredictionResponse = z.object({
  /**
   * A list that contains the single prediction that you created.
   */
  "data": z.object({
    "broadcaster_id": z.string(),
    "broadcaster_login": z.string(),
    "broadcaster_name": z.string(),
    "created_at": z.string(),
    "ended_at": z.string(),
    "id": z.string(),
    "locked_at": z.string(),
    "outcomes": z.object({
      "channel_points": z.number(),
      "color": z.enum(["BLUE", "PINK"]),
      "id": z.string(),
      "title": z.string(),
      "top_predictors": z.object({
        "channel_points_used": z.number(),
        "channel_points_won": z.number(),
        "user_id": z.string(),
        "user_login": z.string(),
        "user_name": z.string()
      }).transform((it) => ({
        /**
         * The number of Channel Points the viewer spent.
         */
        "channelPointsUsed": it["channel_points_used"],
        /**
         * The number of Channel Points distributed to the viewer.
         */
        "channelPointsWon": it["channel_points_won"],
        /**
         * An ID that identifies the viewer.
         */
        "userId": it["user_id"],
        /**
         * The viewer’s login name.
         */
        "userLogin": it["user_login"],
        /**
         * The viewer’s display name.
         */
        "userName": it["user_name"],

      })).array(),
      "users": z.number()
    }).transform((it) => ({
      /**
       * The number of Channel Points spent by viewers on this outcome.
       */
      "channelPoints": it["channel_points"],
      /**
       * The color that visually identifies this outcome in the UX.
       * Possible values are:  
       *   
       * * BLUE
       * * PINK
       *   
       * If the number of outcomes is two, the color is BLUE for the first
       * outcome and PINK for the second outcome. If there are more than
       * two outcomes, the color is BLUE for all outcomes.
       */
      "color": it["color"],
      /**
       * An ID that identifies this outcome.
       */
      "id": it["id"],
      /**
       * The outcome’s text.
       */
      "title": it["title"],
      /**
       * A list of viewers who were the top predictors; otherwise,
       * **null** if none.
       */
      "topPredictors": it["top_predictors"],
      /**
       * The number of unique viewers that chose this outcome.
       */
      "users": it["users"],

    })).array(),
    "prediction_window": z.number(),
    "status": z.enum(["ACTIVE", "CANCELED", "LOCKED", "RESOLVED"]),
    "title": z.string(),
    "winning_outcome_id": z.string()
  }).transform((it) => ({
    /**
     * An ID that identifies the broadcaster that created the prediction.
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
     * The UTC date and time of when the Prediction began.
     */
    "createdAt": it["created_at"],
    /**
     * The UTC date and time of when the Prediction ended. If `status` is
     * ACTIVE, this is set to **null**.
     */
    "endedAt": it["ended_at"],
    /**
     * An ID that identifies this prediction.
     */
    "id": it["id"],
    /**
     * The UTC date and time of when the Prediction was locked. If
     * `status` is not LOCKED, this is set to **null**.
     */
    "lockedAt": it["locked_at"],
    /**
     * The list of possible outcomes for the prediction.
     */
    "outcomes": it["outcomes"],
    /**
     * The length of time (in seconds) that the prediction will run for.
     */
    "predictionWindow": it["prediction_window"],
    /**
     * The prediction’s status. Valid values are:  
     *   
     * * ACTIVE — The Prediction is running and viewers can make
     * predictions.
     * * CANCELED — The broadcaster canceled the Prediction and refunded
     * the Channel Points to the participants.
     * * LOCKED — The broadcaster locked the Prediction, which means
     * viewers can no longer make predictions.
     * * RESOLVED — The winning outcome was determined and the Channel
     * Points were distributed to the viewers who predicted the correct
     * outcome.
     */
    "status": it["status"],
    /**
     * The question that the prediction asks. For example, _Will I finish
     * this entire pizza?_
     */
    "title": it["title"],
    /**
     * The ID of the winning outcome. Is **null** unless `status` is
     * RESOLVED.
     */
    "winningOutcomeId": it["winning_outcome_id"],

  })).array()
});
export interface CreatePredictionResponse extends z.infer<typeof CreatePredictionResponse> {}

export const EndPredictionResponse = z.object({
  /**
   * A list that contains the single prediction that you updated.
   */
  "data": z.object({
    "broadcaster_id": z.string(),
    "broadcaster_login": z.string(),
    "broadcaster_name": z.string(),
    "created_at": z.string(),
    "ended_at": z.string(),
    "id": z.string(),
    "locked_at": z.string(),
    "outcomes": z.object({
      "channel_points": z.number(),
      "color": z.enum(["BLUE", "PINK"]),
      "id": z.string(),
      "title": z.string(),
      "top_predictors": z.object({
        "channel_points_used": z.number(),
        "channel_points_won": z.number(),
        "user_id": z.string(),
        "user_login": z.string(),
        "user_name": z.string()
      }).transform((it) => ({
        /**
         * The number of Channel Points the viewer spent.
         */
        "channelPointsUsed": it["channel_points_used"],
        /**
         * The number of Channel Points distributed to the viewer.
         */
        "channelPointsWon": it["channel_points_won"],
        /**
         * An ID that identifies the viewer.
         */
        "userId": it["user_id"],
        /**
         * The viewer’s login name.
         */
        "userLogin": it["user_login"],
        /**
         * The viewer’s display name.
         */
        "userName": it["user_name"],

      })).array(),
      "users": z.number()
    }).transform((it) => ({
      /**
       * The number of Channel Points spent by viewers on this outcome.
       */
      "channelPoints": it["channel_points"],
      /**
       * The color that visually identifies this outcome in the UX.
       * Possible values are:  
       *   
       * * BLUE
       * * PINK
       *   
       * If the number of outcomes is two, the color is BLUE for the first
       * outcome and PINK for the second outcome. If there are more than
       * two outcomes, the color is BLUE for all outcomes.
       */
      "color": it["color"],
      /**
       * An ID that identifies this outcome.
       */
      "id": it["id"],
      /**
       * The outcome’s text.
       */
      "title": it["title"],
      /**
       * A list of viewers who were the top predictors; otherwise,
       * **null** if none.
       */
      "topPredictors": it["top_predictors"],
      /**
       * The number of unique viewers that chose this outcome.
       */
      "users": it["users"],

    })).array(),
    "prediction_window": z.number(),
    "status": z.enum(["ACTIVE", "CANCELED", "LOCKED", "RESOLVED"]),
    "title": z.string(),
    "winning_outcome_id": z.string()
  }).transform((it) => ({
    /**
     * An ID that identifies the broadcaster that created the prediction.
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
     * The UTC date and time of when the Prediction began.
     */
    "createdAt": it["created_at"],
    /**
     * The UTC date and time of when the Prediction ended. If `status` is
     * ACTIVE, this is set to **null**.
     */
    "endedAt": it["ended_at"],
    /**
     * An ID that identifies this prediction.
     */
    "id": it["id"],
    /**
     * The UTC date and time of when the Prediction was locked. If
     * `status` is not LOCKED, this is set to **null**.
     */
    "lockedAt": it["locked_at"],
    /**
     * The list of possible outcomes for the prediction.
     */
    "outcomes": it["outcomes"],
    /**
     * The length of time (in seconds) that the prediction will run for.
     */
    "predictionWindow": it["prediction_window"],
    /**
     * The prediction’s status. Valid values are:  
     *   
     * * ACTIVE — The Prediction is running and viewers can make
     * predictions.
     * * CANCELED — The broadcaster canceled the Prediction and refunded
     * the Channel Points to the participants.
     * * LOCKED — The broadcaster locked the Prediction, which means
     * viewers can no longer make predictions.
     * * RESOLVED — The winning outcome was determined and the Channel
     * Points were distributed to the viewers who predicted the correct
     * outcome.
     */
    "status": it["status"],
    /**
     * The question that the prediction asks. For example, _Will I finish
     * this entire pizza?_
     */
    "title": it["title"],
    /**
     * The ID of the winning outcome. Is **null** unless `status` is
     * RESOLVED.
     */
    "winningOutcomeId": it["winning_outcome_id"],

  })).array()
});
export interface EndPredictionResponse extends z.infer<typeof EndPredictionResponse> {}



export class Predictions {
  readonly #twitch: Twitch;

  constructor(twitch: Twitch) {
    this.#twitch = twitch;
  }

  /**
   * Gets a list of Channel Points Predictions that the broadcaster created.
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **channel:read:predictions** or
   * **channel:manage:predictions** scope.
   */
  async getPredictions(options: GetPredictionsRequest): Promise<GetPredictionsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/predictions", this.#twitch.base);
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

    return await this.#twitch.request(url, opts, GetPredictionsResponse);
  }
  /**
   * Creates a Channel Points Prediction.
   * 
   * With a Channel Points Prediction, the broadcaster poses a question and
   * viewers try to predict the outcome. The prediction runs as soon as it’s
   * created. The broadcaster may run only one prediction at a time.
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **channel:manage:predictions** scope.
   */
  async createPrediction(options: CreatePredictionRequest): Promise<CreatePredictionResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/predictions", this.#twitch.base);
    const opts: RequestInit = { method: 'POST' };

    const body: Record<string, unknown> = {};

    body.broadcaster_id = snapshot.userId;
    body.outcomes = options.outcomes;
    body.prediction_window = options.predictionWindow;
    body.title = options.title;
    opts.body = JSON.stringify(body);
    return await this.#twitch.request(url, opts, CreatePredictionResponse);
  }
  /**
   * Locks, resolves, or cancels a Channel Points Prediction.
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **channel:manage:predictions** scope.
   */
  async endPrediction(options: EndPredictionRequest): Promise<EndPredictionResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/predictions", this.#twitch.base);
    const opts: RequestInit = { method: 'PATCH' };

    const body: Record<string, unknown> = {};

    body.id = options.id;
    body.status = options.status;
    body.broadcaster_id = snapshot.userId;
    body.winning_outcome_id = options.winningOutcomeId;
    opts.body = JSON.stringify(body);
    return await this.#twitch.request(url, opts, EndPredictionResponse);
  }
}
