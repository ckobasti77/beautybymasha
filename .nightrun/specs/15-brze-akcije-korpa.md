# 15 — Brze akcije: dodavanje u korpu direktno sa kartice proizvoda (svuda gde su proizvodi izlistani)

## Sta postoji
- `components/shop/ProductCard.tsx`: SERVERSKA kartica, CELA je `<Link>` na `/shop/[slug]`; cena je `ProductPrice`
  (statican katalog + `LivePrice` iz Convexa: finalPriceRsd, discountPercent, inStock). Koristi je `ShopWall`
  (zid shopa), strana proizvoda (`app/shop/[slug]` — slicni proizvodi) i admin `ProductsTab`.
- Korpa je klijentska: `lib/cart.ts` (cista logika: addToCart/setCartQty/removeFromCart/cartCount,
  `MAX_CART_LINES` 40) + `lib/cartStore.ts` (`useCart()` → items, count, hydrated, add, setQty, remove;
  localStorage `bbm.korpa.v1`, useSyncExternalStore, `storage` event za druge tabove).
- `components/shop/AddToCartForm.tsx` (strana proizvoda): QuantityStepper + „Dodaj u korpu", `MAX_QTY_PER_LINE`
  iz `lib/shop.ts`. Nav ima ikonu korpe sa `count` (`SiteNavClient`, `useCart`).
- Landing `ShopHighlights`: 12 `ProductSwatch` kapi (bestseleri) — trenutno bez cene i bez akcije.
- `can-hover:` varijanta postoji (`@custom-variant can-hover (hover: hover) and (pointer: fine)`).
- Tokeni: `--brand` (mint #57bfa8, POVRSINA — tekst na njoj je `--brand-fg` ink), `--brand-hover` (mint-deep,
  tekst paper), `--mint-soft`, `--mint-wash`. Mint nikad kao boja teksta (kontrast).

## Cilj (korisnik, doslovno)
Kartica proizvoda ima direktno dodavanje u korpu, bez odlaska na stranu proizvoda. Cena je pilula u tirkiznoj
(mint) boji. Na hover pilula se siri SIMETRICNO levo i desno i dobija „−" levo i „+" desno. Ako je kolicina u
korpi 0, „−" je NEAKTIVAN (vidljiv, ali ne radi), samo „+". Klik na „+" ODMAH dodaje 1 komad u korpu (bez
potvrde, bez modala); jos jedan klik → 2. „−" skida jedan; na 0 linija nestaje iz korpe. Isto vazi za brisanje
iz korpe na `/korpa` — kartica to odmah odrazi (isti store). Svuda gde su proizvodi izlistani.

## Ispravke i odluke (zasto nije bukvalno kao opisano)
1. Dugmad NE MOGU unutar `<Link>` (nevalidan HTML, klik bi navigirao). Kartica se deli: Link nosi kap + brend +
   ime; pilula cene je zaseban KLIJENTSKI ostrvo ispod, `components/shop/CartPill.tsx` (`"use client"`).
   `ProductCard` ostaje serverska; prop `quickAdd?: boolean` (default true; admin `ProductsTab` prosledjuje false).
2. Touch nema hover. Na uredjajima bez hovera pilula je UVEK u prosirenom stanju (− cena +); na desktopu se
   siri na hover/focus-within i ostaje prosirena dok je qty > 0 (da se iz zida vidi sta je u korpi).
3. Boja: pilula je STALNO mint (`bg-brand text-brand-fg`), ne samo na hover — korisnik je to i predlozio kao
   alternativu; na hover `bg-brand-hover text-brand-hover-fg`. Rasprodato: neutralna pilula „Rasprodato", bez dugmadi.
4. „−" na 0: RENDERUJE se, `aria-disabled`, 40% opacity, bez pointer-a — simetrija i bez skoka rasporeda.
5. Gornja granica po liniji: `MAX_QTY_PER_LINE` (lib/shop). Na maksimumu „+" je aria-disabled i pilula kratko
   zatrese (shake 2px, 200ms) — bez toasta.

## A. `CartPill` — anatomija i ponasanje
Struktura (jedan element, CSS grid sa 3 kolone: `0fr auto 0fr` → na expanded `1fr auto 1fr`; tranzicija
`grid-template-columns 240ms var(--ease-out-expo)` — simetricno sirenje oko centra bez merenja):
  [ − ] [ centar ] [ + ]
- Centar: `1.990 RSD` kad je qty 0; kad je qty > 0: `2 × 1.990 RSD` (num, tabular). Popust: precrtana stara cena
  ostaje kao sad (ProductPrice logika se prenosi u pilulu; `ProductPrice` ostaje export za druge upotrebe).
- Dugmad: 36×36 (44 touch), ikone lucide Minus/Plus 16px, `aria-label` „Dodaj {ime} u korpu" / „Ukloni jedan {ime}".
  Kad je expanded false, dugmad su `visibility:hidden` + `tabindex=-1` (ne hvataju fokus/klik).
- Expanded = (hover ILI focus-within ILI qty > 0 ILI uredjaj bez hovera). Na desktopu izlazak misa uz qty 0 →
  skupljanje sa 120ms zadrskom (da ne treperi izmedju kapi i pilule).
- Klik „+": `add(slug, 1)` odmah; pilula „potvrdi": centar scale 1 → 1.06 → 1 (180ms), brojka se menja kroz
  kratki crossfade (stari broj gore-out, novi dole-in, 160ms). Klik „−": `setQty(slug, qty-1)`; na 0 → `remove`.
- Nav: badge na ikoni korpe dobija „bump" (scale 1.25 → 1, 220ms, spring) na svaku promenu count-a; prvi put kad
  korpa iz 0 postane 1, ikona korpe se krace zaljulja (rotate ±8°, 300ms). Bez letecih tackica — dovoljno.
- `aria-live="polite"` region (jedan, u `ShopWall`/nosiocu liste): „{ime}: {qty} u korpi" / „{ime} uklonjen iz korpe".
- Hidratacija: dok `hydrated` nije true, pilula je u statickom stanju (cena, bez dugmadi) — nema skoka ni
  „0 → 2" bljeska; server renderuje isti staticki oblik (kartica ostaje SSR).
- Klik na pilulu/centar ne navigira (nije u Linku). Ceo ostali deo kartice i dalje vodi na stranu proizvoda.
- `prefers-reduced-motion`: bez tranzicija sirenja/bump-a, stanja se menjaju trenutno.

## B. Gde se pojavljuje
1. `/shop` zid (`ShopWall`) — svaka kartica.
2. Strana proizvoda — „slicni proizvodi" kartice (isti `ProductCard`).
3. Landing `ShopHighlights`: 12 kapi dobijaju ISTU pilulu ispod kapi (ime + pilula), kompaktnu (32px dugmad na
   desktopu); kap ostaje link na proizvod. Ako je vizuelno pregusto, pilula se pojavljuje na hover kartice
   (desktop) / uvek (touch) — odluci po screenshotu na 1440 i 390 i upisi razlog.
4. Pretraga/filtri u shopu — automatski (isti `ProductCard`).
5. Admin `ProductsTab`: `quickAdd={false}` — vlasnica ne kupuje.
6. `/korpa`: ne menja se, osim sto promena kolicine tamo mora da se vidi na zidu u drugom tabu (vec radi kroz
   `storage` event — proveri).

## C. Cena i stanje
- Pilula koristi `LivePrice` kad postoji (isti izvor kao sad), fallback katalog. `inStock === false` → „Rasprodato",
  bez dugmadi; ako je proizvod vec u korpi a postane rasprodat, pilula pokazuje „Rasprodato · 2 u korpi" i samo „−".
- Korpa nosi samo `slug` + `qty` (cena se racuna u `orders.quote`) — ne menjati ugovor.

## D. Provera (Playwright, 1440 i 390, svetla i tamna tema)
 1. Kartica: klik na „+" → `localStorage["bbm.korpa.v1"]` ima {slug, qty:1}; drugi klik → 2; nav badge 2 sa bump-om.
 2. „−" na 0 ima `aria-disabled="true"`, klik ne menja store; na 1 → klik uklanja liniju, pilula se skuplja (desktop).
 3. Hover desktop: `grid-template-columns` prelazi u `1fr auto 1fr`; mouseleave uz qty 0 → skupljanje; uz qty > 0 ostaje.
 4. 390: pilula prosirena bez hovera, dugmad >= 44px, bez horizontalnog prekoracenja, kap i dalje vodi na proizvod.
 5. `/korpa` u drugom tabu: promena kolicine → kartica na zidu se azurira (storage event).
 6. Tastatura: Tab do „+", Enter dodaje; `aria-live` objava; fokus ostaje na dugmetu.
 7. Rasprodat proizvod (admin stanje 0 na devu): pilula „Rasprodato", bez „+".
 8. Max po liniji: „+" aria-disabled na `MAX_QTY_PER_LINE`, shake.
 9. `ProductsTab` u adminu: bez pilule.
10. Hidratacija: screenshot pre i posle hidratacije — bez skoka rasporeda (CLS 0 na zidu).
11. Reveal ugovor netaknut (pilula nije u reveal spanovima; `data-reveal="off"` na pilulu).
12. typecheck + lint + test (lib/cart.test.ts prosiriti: max po liniji, setQty na 0 uklanja) + build; pocetni JS `/shop` +<= 3KB.

## E. Dokumentacija i git
docs/STATUS.md vrh „Korak 15"; docs/ADMIN.md ne menjati (kupovina nije admin). Commit na tekucoj grani
`korak 15: brze akcije u korpu sa kartice` + push. Bez convex deploy (frontend).
