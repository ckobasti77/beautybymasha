ultrathink

Napravi Convex backend za SHOP, NALOGE i LOYALTY.

PROČITAJ PRE KODA:
- CLAUDE.md, docs/BRIEF.md (ADR-002, ADR-003, ADR-004), data/products.json
- convex/schema.ts i sve što je napravio prethodni korak — nadograđuješ, ne prepisuješ
- _ref/studio-lady-gaga/convex/products.ts — proizvodi, kategorije, Convex storage za slike
- _ref/studio-lady-gaga/convex/orders.ts — porudžbine, statusi, analitika prodaje
- _ref/studio-lady-gaga/lib/ips-qr.ts i lib/ips-purpose.ts — srpski IPS QR za plaćanje
- _ref/studio-lady-gaga/contexts/cart-context.tsx — kako je korpa modelovana
- lib/products.ts (već tipovan)

ŠEMA — dodaj na postojeću:
- productCategories: key, title, order
- products: slug, sku, name, brand ("orly"|"entity"), categoryKey, priceRsd,
    discountPercent (0-90, default 0), hex, finish, family, description,
    swatchOnly, imagePath (string|null), storageImageIds (za slike koje ONA uploaduje),
    stock, bestseller, active, order
    index by_slug, by_category, by_brand, by_sku
- orders: orderNumber (čitljiv, npr. "BM-2609-0042"), items[] (embedovan snimak:
    slug, name, brand, unitPriceRsd, discountPercent, qty, lineTotal),
    customer { name, phone, email, address, city, postalCode, note? },
    customerId? , subtotalRsd, loyaltyDiscountRsd, shippingRsd, totalRsd,
    paymentMethod "pouzecem"|"ips", paymentStatus, status
    ("nova"|"u_obradi"|"poslata"|"zavrsena"|"otkazana"),
    createdAt, updatedAt, statusHistory[]
    index by_orderNumber, by_status, by_customer, by_createdAt
- inquiries: kontakt forma — name, email, message, status, createdAt

AUTH (ADR-003) — @convex-dev/auth, Password provider:
- Registracija: SAMO email + lozinka + potvrda lozinke. Ništa više.
- users tabla: email, name?, phone?, role ("admin"|"staff"|"customer", default "customer"),
    loyaltyNumber, createdAt
- BEZ verifikacije email-a za sada (demo je sutra, Resend možda nije podešen) —
    ali napiši tako da se uključi jednom zastavicom.
- Prepiši assertAdminKey iz prethodnog koraka na proveru role, ALI zadrži ADMIN_KEY
    kao rezervni put dok ne postoji nijedan admin nalog (inače se zaključavaš napolju).
- Prva registracija sa emailom iz env-a OWNER_EMAIL automatski dobija role "admin".
- auth.config.ts, http.ts — sve što @convex-dev/auth traži. Proveri njihovu
    dokumentaciju u node_modules umesto da pišeš po sećanju.

LOYALTY (ADR-004):
- Svaki customer pri registraciji dobija loyaltyNumber: "BM" + 6 cifara, jedinstven
- loyaltyRedemptions: userId, kind ("web"|"salon"), orderId?, bookingId?,
    amountRsd, discountRsd, redeemedAt, redeemedBy (adminId)
- loyalty.status({ userId }) — da li član ima neiskorišćen popust
- loyalty.findMember({ query }) — admin traži po broju kartice, imenu, telefonu ili emailu
- loyalty.redeem({ userId, kind, amountRsd }) — admin troši popust, upisuje u istoriju
- PRAVILO: 10% popusta, važi na SLEDEĆI račun posle registracije, jednom po ciklusu.
  Posle iskorišćenja član ponovo stiče pravo posle sledeće plaćene posete.
  Tačna pravila su [POTVRDITI kod vlasnice] — napiši ih kao JEDNU funkciju
  `computeLoyaltyEligibility` da se menjaju na jednom mestu.
- QR sadržaj je SAMO loyaltyNumber, ništa lično. QR se crta na klijentu (qrcode paket).

PORUDŽBINE:
- orders.create — javno. Server PONOVO računa svaku cenu iz baze; klijentske cene
  se ignorišu. Proverava stanje, umanjuje stock u istoj transakciji.
  Ako je korisnik ulogovan i ima pravo na loyalty — primenjuje 10% i upisuje redemption.
- orders.byNumber({ orderNumber, phone }) — praćenje bez naloga
- orders.list / setStatus / salesAnalytics — admin
- generateUploadUrl + saveProductImages — Convex storage, za njen upload slika
- products.bulkUpsert({ rows }) — uparivanje po `sku`; postojeće ažurira, nova dodaje,
  NIŠTA ne briše. Vraća izveštaj { updated, created, skipped[] }.
  Ovo je temelj CSV/XLSX uvoza iz admin panela (prompt 6).
- admin.seedShop — idempotentan seed svih 70 proizvoda iz data/products.json

IPS QR: port iz _ref/studio-lady-gaga/lib/ips-*.ts. Podaci primaoca su [POTVRDITI] —
stavi ih u data/site.json pod `payment` sa jasnim [POTVRDITI] oznakama, ne izmišljaj račun.

TESTOVI:
- cena se računa na serveru: klijent pošalje 1 RSD, server naplati pravu cenu
- popust: 20% na 2000 = 1600
- loyalty 10% se primenjuje jednom i upisuje redemption
- stock se umanjuje; porudžbina preko stanja pada
- bulkUpsert: 3 postojeća + 2 nova = { updated: 3, created: 2 }
- korisnik ne može da vidi tuđu porudžbinu

NA KRAJU:
  npx convex dev --once
  npm run typecheck && npm run lint && npm test && npm run build

Ne izmišljaj podatke o klijentu. Nepoznato = [POTVRDITI].

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
