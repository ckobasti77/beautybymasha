import { httpRouter } from "convex/server";
import { auth } from "./auth";

/**
 * Convex Auth traži svoje HTTP rute (`/api/auth/*`) na ovom deployment-u —
 * preko njih idu prijava, odjava i osvežavanje tokena.
 */
const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
