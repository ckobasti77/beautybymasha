ultrathink

Napravi Convex backend za SHOP, NALOGE i LOYALTY. Nadogradjujes semu iz prethodnog
koraka, ne prepisujes je.

PRVO PROCITAJ, u celosti, pa radi tacno ono sto pise:
  .nightrun/specs/03-backend-shop-auth-loyalty.md   <- puna specifikacija
  CLAUDE.md
  docs/BRIEF.md (ADR-002, ADR-003, ADR-004)
  convex/schema.ts i sve sto je napravio korak 02

Tri stvari na koje da pazis dok citas spec:
1. Cene se UVEK racunaju na serveru iz baze. Klijentske cene se ignorisu.
   Ako klijent posalje 1 RSD, server naplacuje pravu cenu. Za to postoji test.
2. Registracija je SAMO email + lozinka + potvrda lozinke. Nista vise.
   Zadrzi ADMIN_KEY kao rezervni put dok ne postoji nijedan admin nalog,
   inace se zakljucavas napolju.
3. products.bulkUpsert je temelj CSV/XLSX uvoza iz admin panela (korak 06).
   Uparuje po sku, azurira postojece, dodaje nova, NISTA ne brise.

IPS QR: podaci primaoca su [POTVRDITI]. Stavi ih u data/site.json sa tom oznakom.
Ne izmisljaj broj racuna.

Zavrsna provera:
  npx convex dev --once && npm run typecheck && npm run lint && npm test && npm run build
PRE SVEGA - provera prethodnog koraka (najvise 10 minuta na ovo):
Procitaj docs/STATUS.md ako postoji i pokreni `npm run typecheck` i `npm run lint`.
Ako je prethodni korak nesto ostavio slomljeno ili nedovrseno, popravi TO prvo.
Proveri i produkciju: https://beautybymasha-mu.vercel.app - prethodni korak je
vec deployovan. Ako je prod pao ili prikazuje gresku, to je prioritet nad tvojim zadatkom.
Jedan prolaz, ne vise. Ako ne mozes da popravis za 10 minuta, upisi u docs/STATUS.md
sta je slomljeno i nastavi sa svojim zadatkom - ne zaglavljuj se.

PREGLED U BROWSERU: nista ne radi u pozadini. Ako ti treba pogled, pokreni
`npm run dev -- -p 3001`, proveri, pa ga OBAVEZNO ugasi pre kraja koraka -
inace `npm run build` puca. Nikad port 3000.
