import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nepotvrđeni zahtevi stariji od settings.holdHours (24 h) ističu → „otkazan" / „isteklo",
// i time oslobađaju mesto koje su držali u kapacitetu.
crons.interval("isticanje nepotvrdjenih zahteva", { hours: 1 }, internal.bookings.expirePending, {});

export default crons;
