Brze akcije u korpu direktno sa kartice proizvoda — svuda gde su proizvodi izlistani (zid /shop,
slicni proizvodi na strani proizvoda, ShopHighlights na landingu, filtrirani rezultati).

PRVO PROCITAJ u celosti:
  .nightrun/specs/15-brze-akcije-korpa.md   <- anatomija pilule, ponasanje, gde se pojavljuje, provera D
  components/shop/{ProductCard,AddToCartForm,ShopWall}.tsx, lib/{cart,cartStore,shop}.ts,
  components/site/SiteNavClient.tsx (ikona korpe + count), components/sections/ShopHighlights.tsx,
  docs/MOTION.md, CLAUDE.md

SKILLS: motion-design, impeccable, apple-design (feedback, interruptible), design-taste-frontend

STA SE PRAVI:
1. `components/shop/CartPill.tsx` ("use client"): pilula cene, STALNO mint (bg-brand/text-brand-fg), CSS grid
   `0fr auto 0fr` -> `1fr auto 1fr` (tranzicija 240ms) pa se siri SIMETRICNO oko centra i otkriva „−" levo i
   „+" desno. Expanded = hover ILI focus-within ILI qty > 0 ILI uredjaj bez hovera (touch: uvek prosireno).
   Centar: `1.990 RSD`; kad je u korpi: `2 × 1.990 RSD` (crossfade brojke 160ms). Popust: precrtana stara cena.
2. Ponasanje: „+" ODMAH dodaje 1 (useCart().add), bez potvrde; opet „+" → 2. „−" skida jedan, na 0 uklanja
   liniju. „−" na qty 0: renderovan, aria-disabled, 40% opacity (simetrija, bez skoka). Max po liniji
   MAX_QTY_PER_LINE → „+" aria-disabled + shake 2px. Rasprodato → neutralna pilula bez dugmadi.
   Mikro-feedback: centar scale 1→1.06→1 (180ms); nav badge korpe bump (scale 1.25→1, 220ms) na svaku
   promenu, ljuljanje ikone ±8° kad korpa iz 0 postane 1. aria-label na dugmadima, aria-live objava.
   prefers-reduced-motion: bez tranzicija.
3. `ProductCard`: OSTAJE serverska. Link vise ne obuhvata cenu — Link = kap + brend + ime; ispod njega
   `<CartPill>` kao sibling (dugmad u <a> su nevalidna i navigirala bi). Prop `quickAdd` (default true);
   admin ProductsTab prosledjuje false. Bez skoka pri hidrataciji: pre `hydrated` pilula je staticka cena.
4. `ShopHighlights` (landing): 12 kapi dobijaju ime + kompaktnu pilulu; kap ostaje link. Ako je pregusto na
   390 — odluci po screenshotu (hover-only na desktopu / uvek na touch) i upisi razlog u STATUS.
5. `/korpa` i drugi tab: promena kolicine se vidi na zidu (storage event vec postoji — proveri).
6. `lib/cart.test.ts` prosiri (max po liniji, setQty 0 uklanja). Korpa i dalje nosi samo slug + qty.

PRAVILA: reveal ugovor iz docs/MOTION.md ostaje (pilula `data-reveal="off"`); mint nikad kao boja teksta;
dugmad >= 44px na touch; convex/ se ne dira; bez novih paketa.

PROVERA (spec D, Playwright, 1440 i 390, obe teme): klik „+" → localStorage bbm.korpa.v1 {slug, qty:1}, drugi
klik 2, badge 2; „−" na 0 aria-disabled; hover siri/skuplja (grid-template-columns); 390 uvek prosireno,
bez horizontalnog prekoracenja; tastatura Tab/Enter + aria-live; rasprodato bez „+"; admin bez pilule;
CLS 0 na zidu pre/posle hidratacije; typecheck + lint + test + build; pocetni JS /shop +<= 3KB. Tabela u STATUS.

Kraj: docs/STATUS.md vrh „Korak 15". Commit na tekucoj grani "korak 15: brze akcije u korpu sa kartice"
+ git push. Bez convex deploy.
