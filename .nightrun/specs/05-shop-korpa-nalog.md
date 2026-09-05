ultrathink

Napravi SHOP, KORPU, PLAĆANJE i NALOG.

PROČITAJ PRE KODA:
- CLAUDE.md, docs/BRAND.md (§7 /shop, /korpa, /placanje, /nalog), docs/MOTION.md
- data/design-dna.json → visual_effects.image_effects (gloss hover)
- lib/products.ts — 70 proizvoda, 2 brenda, 4 kategorije, swatchOnly zastavica
- convex/products.ts, convex/orders.ts, convex/auth*, convex/loyalty.ts — backend postoji
- _ref/studio-lady-gaga/: contexts/cart-context.tsx, app/korpa/, app/placanje/,
  app/proizvodi/, components/product-card-image-slider.tsx, lib/ips-qr.ts
- SKILLS: gsap-react, popups, seo-ecommerce, humanizer

/shop — zid swatch-eva:
- Filteri: brend (ORLY / ENTITY) · kategorija · porodica boje · finiš · cena. URL nosi stanje.
- Kartica: veliki KRUG boje (hex) + ime + cena. Popust prikazuje precrtanu staru cenu.
- HOVER: gloss sweep — dijagonalni specular prelazi preko swatch kruga, 600 ms.
  Za ORLY (ima sliku) posle sweep-a slika proizvoda crossfade-uje preko boje.
  Za ENTITY (swatchOnly) NEMA crossfade — samo sweep. Ne izmišljaj slike.
- Na touch uređajima nema hovera: swatch se blago uveća na tap, slika se vidi na detalju.
- Reveal stagger po mreži. Bez layout shifta — rezerviši prostor za sliku.

/shop/[slug]:
- Velika slika ili veliki swatch, ime, brend, opis, cena, količina, "Dodaj u korpu"
- "Dostupno i u salonu" sa linkom na lokacije
- Srodni proizvodi iz iste porodice boje
- generateMetadata + Product/Offer JSON-LD (skill seo-ecommerce)

/korpa i /placanje — port iz _ref/studio-lady-gaga, prilagođen brendu:
- Korpa u localStorage (kao referenca), ali cene se UVEK preračunavaju sa servera
- Loyalty: ako je korisnik ulogovan i ima pravo, popust 10% je ZASEBAN red u zbiru,
  jasno označen. Ako NIJE ulogovan — prikaži tihu poruku sa linkom na registraciju.
- Poštarina iz data/site.json (400 RSD, besplatno preko 6000) — obe [POTVRDITI]
- Plaćanje: pouzećem ili IPS QR. QR se generiše iz podataka u site.json.
  Ako su podaci primaoca [POTVRDITI] placeholderi, prikaži IPS opciju ali sa
  jasnom napomenom da čeka podatke — NE generiši QR sa izmišljenim računom.
- Posle porudžbine: broj porudžbine + "prati porudžbinu" preko broja i telefona

/nalog:
- Registracija: email, lozinka, potvrda lozinke. Ništa više.
- Prijava, odjava, greške na srpskom
- Ulogovan vidi: ČLANSKU KARTICU (loyaltyNumber + QR, crta se na klijentu iz `qrcode`),
  status loyalty popusta, istoriju termina i porudžbina
- Kartica mora lepo da izgleda na telefonu — to ona pokazuje u salonu

LOYALTY POZIV (skill `popups`):
Traka na landingu i u korpi, SAMO za neulogovane:
"Registrujte se i ostvarite 10% popusta na sledeći račun — i u salonu i na sajtu."
Nenametljiva, gasi se, pamti da je ugašena (localStorage), NE iskače preko ekrana.

TEKST kroz skill `humanizer`. PROVERA: typecheck, lint, test, build, mobilni 390px.

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
