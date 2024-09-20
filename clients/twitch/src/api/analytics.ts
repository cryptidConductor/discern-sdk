
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

export interface GetExtensionAnalyticsRequest {
  /**
   * The reporting window's end date, in RFC3339 format. Set the time portion
   * to zeroes (for example, 2021-10-27T00:00:00Z). The report is inclusive of
   * the end date.  
   *   
   * Specify an end date only if you provide a start date. Because it can take
   * up to two days for the data to be available, you must specify an end date
   * that's earlier than today minus one to two days. If not, the API ignores
   * your end date and uses an end date that is today minus one to two days.
   */
  endedAt?: string,
  /**
   * The maximum number of report URLs to return per page in the response. The
   * minimum page size is 1 URL per page and the maximum is 100 URLs per page.
   * The default is 20.  
   *   
   * **NOTE**: While you may specify a maximum value of 100, the response will
   * contain at most 20 URLs per page.
   */
  first?: number,
  /**
   * The reporting window's start date, in RFC3339 format. Set the time portion
   * to zeroes (for example, 2021-10-22T00:00:00Z).  
   *   
   * The start date must be on or after January 31, 2018\. If you specify an
   * earlier date, the API ignores it and uses January 31, 2018\. If you
   * specify a start date, you must specify an end date. If you don't specify a
   * start and end date, the report includes all available data since January
   * 31, 2018.  
   *   
   * The report contains one row of data for each day in the reporting window.
   */
  startedAt?: string,
  /**
   * The cursor used to get the next page of results. The **Pagination** object
   * in the response contains the cursor’s value. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)  
   *   
   * This parameter is ignored if the _extension\_id_ parameter is set.
   */
  after?: string,
  /**
   * The extension's client ID. If specified, the response contains a report
   * for the specified extension. If not specified, the response includes a
   * report for each extension that the authenticated user owns.
   */
  extensionId?: string,
  /**
   * The type of analytics report to get. Possible values are:  
   *   
   * * overview\_v2
   */
  type?: | "overview_v2",
}
export interface GetGameAnalyticsRequest {
  /**
   * The maximum number of report URLs to return per page in the response. The
   * minimum page size is 1 URL per page and the maximum is 100 URLs per page.
   * The default is 20.  
   *   
   * **NOTE**: While you may specify a maximum value of 100, the response will
   * contain at most 20 URLs per page.
   */
  first?: number,
  /**
   * The reporting window’s start date, in RFC3339 format. Set the time
   * portion to zeroes (for example, 2021-10-22T00:00:00Z). If you specify a
   * start date, you must specify an end date.  
   *   
   * The start date must be within one year of today’s date. If you specify
   * an earlier date, the API ignores it and uses a date that’s one year
   * prior to today’s date. If you don’t specify a start and end date, the
   * report includes all available data for the last 365 days from today.  
   *   
   * The report contains one row of data for each day in the reporting window.
   */
  startedAt?: string,
  /**
   * The game’s client ID. If specified, the response contains a report for
   * the specified game. If not specified, the response includes a report for
   * each of the authenticated user’s games.
   */
  gameId?: string,
  /**
   * The cursor used to get the next page of results. The **Pagination** object
   * in the response contains the cursor’s value. [Read
   * More](https://dev.twitch.tv/docs/api/guide#pagination)  
   *   
   * This parameter is ignored if _game\_id_ parameter is set.
   */
  after?: string,
  /**
   * The type of analytics report to get. Possible values are:  
   *   
   * * overview\_v2
   */
  type?: | "overview_v2",
  /**
   * The reporting window’s end date, in RFC3339 format. Set the time portion
   * to zeroes (for example, 2021-10-22T00:00:00Z). The report is inclusive of
   * the end date.  
   *   
   * Specify an end date only if you provide a start date. Because it can take
   * up to two days for the data to be available, you must specify an end date
   * that’s earlier than today minus one to two days. If not, the API ignores
   * your end date and uses an end date that is today minus one to two days.
   */
  endedAt?: string,
}
export const GetExtensionAnalyticsResponse = z.object({
  /**
   * A list of reports. The reports are returned in no particular order;
   * however, the data within each report is in ascending order by date
   * (newest first). The report contains one row of data per day of the
   * reporting window; the report contains rows for only those days that
   * the extension was used. The array is empty if there are no reports.
   */
  "data": z.object({
    "URL": z.string(),
    "date_range": z.object({
      "ended_at": z.string(),
      "started_at": z.string()
    }).transform((it) => ({
      /**
       * The reporting window’s end date.
       */
      "endedAt": it["ended_at"],
      /**
       * The reporting window’s start date.
       */
      "startedAt": it["started_at"],

    })),
    "extension_id": z.string(),
    "type": z.string()
  }).transform((it) => ({
    /**
     * The URL that you use to download the report. The URL is valid for 5
     * minutes.
     */
    "url": it["URL"],
    /**
     * The reporting window’s start and end dates, in RFC3339 format.
     */
    "dateRange": it["date_range"],
    /**
     * An ID that identifies the extension that the report was generated
     * for.
     */
    "extensionId": it["extension_id"],
    /**
     * The type of report.
     */
    "type": it["type"],

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
export interface GetExtensionAnalyticsResponse extends z.infer<typeof GetExtensionAnalyticsResponse> {}

export const GetGameAnalyticsResponse = z.object({
  /**
   * A list of reports. The reports are returned in no particular order;
   * however, the data within each report is in ascending order by date
   * (newest first). The report contains one row of data per day of the
   * reporting window; the report contains rows for only those days that
   * the game was used. A report is available only if the game was
   * broadcast for at least 5 hours over the reporting period. The array
   * is empty if there are no reports.
   */
  "data": z.object({
    "URL": z.string(),
    "date_range": z.object({
      "ended_at": z.string(),
      "started_at": z.string()
    }).transform((it) => ({
      /**
       * The reporting window’s end date.
       */
      "endedAt": it["ended_at"],
      /**
       * The reporting window’s start date.
       */
      "startedAt": it["started_at"],

    })),
    "game_id": z.string(),
    "type": z.string()
  }).transform((it) => ({
    /**
     * The URL that you use to download the report. The URL is valid for 5
     * minutes.
     */
    "url": it["URL"],
    /**
     * The reporting window’s start and end dates, in RFC3339 format.
     */
    "dateRange": it["date_range"],
    /**
     * An ID that identifies the game that the report was generated for.
     */
    "gameId": it["game_id"],
    /**
     * The type of report.
     */
    "type": it["type"],

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
export interface GetGameAnalyticsResponse extends z.infer<typeof GetGameAnalyticsResponse> {}



export class Analytics {
  readonly #twitch: Twitch;

  constructor(twitch: Twitch) {
    this.#twitch = twitch;
  }

  /**
   * Gets an analytics report for one or more extensions. The response contains
   * the URLs used to download the reports (CSV files). [Learn
   * More](https://dev.twitch.tv/docs/insights)
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **analytics:read:extensions** scope.
   */
  async getExtensionAnalytics(options: GetExtensionAnalyticsRequest): Promise<GetExtensionAnalyticsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/analytics/extensions", this.#twitch.base);
    if (options.endedAt) {
      url.searchParams.append("ended_at", options.endedAt.toString());
    }
    if (options.first) {
      url.searchParams.append("first", options.first.toString());
    }
    if (options.startedAt) {
      url.searchParams.append("started_at", options.startedAt.toString());
    }
    if (options.after) {
      url.searchParams.append("after", options.after.toString());
    }
    if (options.extensionId) {
      url.searchParams.append("extension_id", options.extensionId.toString());
    }
    if (options.type) {
      url.searchParams.append("type", options.type.toString());
    }
    const opts: RequestInit = { method: 'GET' };

    return await this.#twitch.request(url, opts, GetExtensionAnalyticsResponse);
  }
  /**
   * Gets an analytics report for one or more games. The response contains the
   * URLs used to download the reports (CSV files). [Learn
   * more](https://dev.twitch.tv/docs/insights)
   * 
   * __Authorization:__
   * 
   * Requires a [user access
   * token](https://dev.twitch.tv/docs/authentication#user-access-tokens) that
   * includes the **analytics:read:games** scope.
   */
  async getGameAnalytics(options: GetGameAnalyticsRequest): Promise<GetGameAnalyticsResponse> {
    const snapshot = await this.#twitch.snapshot();
    const url = new URL("/analytics/games", this.#twitch.base);
    if (options.first) {
      url.searchParams.append("first", options.first.toString());
    }
    if (options.startedAt) {
      url.searchParams.append("started_at", options.startedAt.toString());
    }
    if (options.gameId) {
      url.searchParams.append("game_id", options.gameId.toString());
    }
    if (options.after) {
      url.searchParams.append("after", options.after.toString());
    }
    if (options.type) {
      url.searchParams.append("type", options.type.toString());
    }
    if (options.endedAt) {
      url.searchParams.append("ended_at", options.endedAt.toString());
    }
    const opts: RequestInit = { method: 'GET' };

    return await this.#twitch.request(url, opts, GetGameAnalyticsResponse);
  }
}
