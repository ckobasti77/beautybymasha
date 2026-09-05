Završni prolaz: SEO, demo podaci, pristupačnost, performanse, priprema za deploy.
Bez novih funkcionalnosti — samo da sve što postoji radi besprekorno.

PROČITAJ: CLAUDE.md, docs/BRIEF.md, docs/MOTION.md, data/site.json
SKILLS: seo-local, seo-schema, seo-maps, seo-sitemap, seo-technical, seo-images, humanizer

1. SEED DEMO PODATAKA — sajt ne sme da bude prazan sutra:
   Napiši convex/seedDemo.ts (internal mutation) + npm skriptu "seed".
   - admin.init (lokacije, kapaciteti, radno vreme, 144 usluge, settings)
   - admin.seedShop (70 proizvoda)
   - 14 termina raspoređenih kroz TEKUĆU nedelju, po obe lokacije i sva tri resursa,
     mešano "nov" i "potvrdjen", sa srpskim imenima i realnim brojevima (06x xxx xxxx)
   - 5 porudžbina u različitim statusima, jedna sa primenjenim loyalty popustom
   - 3 loyalty člana sa istorijom
   - 2 poruke sa kontakt forme
   Seed mora biti IDEMPOTENTAN i mora da se može obrisati (seedDemo.clear).
   Datumi se računaju od "danas", ne hardkoduju.

2. SEO — dva lokala, dva LocalBusiness entiteta:
   - JSON-LD: BeautySalon × 2 sa tačnim NAP, openingHoursSpecification po lokalu
     (Mimoza NE radi ponedeljkom — mora da se vidi u schemi), geo, telefon, sameAs
     (Instagram, Facebook), priceRange
   - Product + Offer JSON-LD na stranicama proizvoda
   - BreadcrumbList, WebSite, Organization
   - app/sitemap.ts i app/robots.ts (admin i nalog su noindex)
   - generateMetadata na SVAKOJ ruti, srpski title i description, OG i Twitter
   - OG slika: app/opengraph-image.tsx generisana iz Logo komponente, 1200×630
   - alt tekstovi: proveri da svaka slika ima alt iz photos.json ili opisa proizvoda

3. PRISTUPAČNOST — WCAG 2.1 AA:
   - Kontrast svih parova (mint #57BFA8 NIKAD kao tekst)
   - Fokus vidljiv svuda, tab redosled logičan, skip-link
   - Forme: label, aria-describedby za greške, aria-live za rezultat
   - Sheet i modal: focus trap, Escape, vraćanje fokusa
   - prefers-reduced-motion gasi shader, parallax, magnetic i clip-reveal
   - Provera reveal-a iz docs/MOTION.md mora da vrati PRAZAN NIZ

4. PERFORMANSE:
   - Sve slike kroz next/image, AVIF, sizes postavljen, priority samo na hero
   - Bez layout shifta (rezervisan prostor)
   - three/R3F se učitava dinamički, NIKAD u početnom bundle-u i NIKAD na mobilnom
   - Proveri veličinu bundle-a posle builda i prijavi je

5. PRIPREMA ZA DEPLOY — NE deployuj sam:
   - README.md: kako se pokreće, koje env promenljive treba
     (NEXT_PUBLIC_CONVEX_URL, ADMIN_KEY, OWNER_EMAIL, RESEND_API_KEY?, SITE_URL)
   - docs/HANDOVER.md: uputstvo za VLASNICU na srpskom, bez tehničkog žargona —
     kako se prijavljuje, kako potvrđuje termin, kako menja cenu, kako uvozi proizvode
   - Proveri da nijedan secret nije u gitu

6. NAPIŠI docs/STATUS.md — šta radi, šta ne radi, i SVAKI [POTVRDITI] koji je ostao
   u kodu, sa putanjom fajla. To je moja lista za jutro.

PROVERA: npx convex dev --once && npm run typecheck && npm run lint && npm test && npm run build

---
PREGLED U BROWSERU (vazi za svaki korak):
Nista ne radi u pozadini. Kad menjas convex/ fajlove, sam pokreni `npx convex dev --once`
(to je i deo zavrsne provere). NE pokreci `npx convex dev` u watch rezimu - tuce se sa `--once`.
Next dev server takodje ne radi, jer bi se tukao sa `npm run build` oko .next foldera.
Ako ti treba vizuelna provera:
  1. pokreni `npm run dev -- -p 3001`
  2. otvori http://localhost:3001 i proveri sta ti treba
  3. OBAVEZNO ga ugasi pre nego sto zavrsis korak (inace `npm run build` puca)
Nikad ne koristi port 3000 - moze biti zauzet.
