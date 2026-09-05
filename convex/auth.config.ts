/**
 * Convex Auth sam izdaje JWT preko svog HTTP endpointa, pa je izdavalac ovaj
 * isti deployment. `CONVEX_SITE_URL` postavlja Convex — ne diramo ga ručno.
 * Bez ovog fajla `ctx.auth.getUserIdentity()` uvek vraća `null`.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
