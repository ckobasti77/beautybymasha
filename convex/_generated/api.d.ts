/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as availability from "../availability.js";
import type * as blocks from "../blocks.js";
import type * as bookings from "../bookings.js";
import type * as capacities from "../capacities.js";
import type * as crons from "../crons.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_availability from "../lib/availability.js";
import type * as lib_validate from "../lib/validate.js";
import type * as locations from "../locations.js";
import type * as notify from "../notify.js";
import type * as schedules from "../schedules.js";
import type * as services from "../services.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  availability: typeof availability;
  blocks: typeof blocks;
  bookings: typeof bookings;
  capacities: typeof capacities;
  crons: typeof crons;
  "lib/admin": typeof lib_admin;
  "lib/availability": typeof lib_availability;
  "lib/validate": typeof lib_validate;
  locations: typeof locations;
  notify: typeof notify;
  schedules: typeof schedules;
  services: typeof services;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
