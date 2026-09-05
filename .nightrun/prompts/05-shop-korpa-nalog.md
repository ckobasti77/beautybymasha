ultrathink

Napravi SHOP, KORPU, PLACANJE i NALOG.

PRVO PROCITAJ, u celosti, pa radi tacno ono sto pise:
  .nightrun/specs/05-shop-korpa-nalog.md   <- puna specifikacija
  docs/BRAND.md (paragraf 7), docs/MOTION.md, CLAUDE.md
  data/design-dna.json -> visual_effects.image_effects (gloss hover)

SKILLS: gsap-react, popups, seo-ecommerce, humanizer

Tri stvari na koje da pazis:
1. Katalog ima DVA brenda. ORLY (50) ima fotografije. ENTITY (20) ima swatchOnly:true
   i NEMA fotografiju - kartica prikazuje samo krug boje sa gloss sweep-om, bez
   crossfade-a na sliku. Ne izmisljaj slike koje nemamo.
2. Cene se preracunavaju sa servera i pre slanja porudzbine. Loyalty popust je
   ZASEBAN red u zbiru, ne utopljen u cenu.
3. Clanska kartica u /nalog mora lepo da izgleda na telefonu - to ona pokazuje
   u salonu. QR sadrzi samo loyaltyNumber, nista licno.

Sav srpski tekst kroz skill humanizer.
Zavrsna provera: typecheck, lint, test, build, i pogled na 390px.
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
