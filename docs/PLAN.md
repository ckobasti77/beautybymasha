# Plan izrade — Beauty by Masha

Osam promptova, redom. Posle svakog: `npm run lint && npm run typecheck && npm run build`,
pa review, pa sledeći. Svaki sledeći nosi ispravke iz prethodnog review-a.

| # | Prompt | Model | Effort | Mode | Skills |
| --- | --- | --- | --- | --- | --- |
| 0 | Setup okruženja | Sonnet 4.8 | med | auto | — |
| 1 | Dizajn sistem, motion, podaci | **Fable** | high | plan | design-dna, text-reveal, gsap-react, gsap-core, humanizer |
| 2 | Backend: zakazivanje | Opus 4.8 | xhigh + ultrathink | plan | — |
| 3 | Backend: shop, auth, loyalty | Opus 4.8 | xhigh + ultrathink | plan | — |
| 4 | Landing + hero + zakazivanje | **Fable** | max + ultrathink | plan | threejs-*, gsap-scrolltrigger, gsap-timeline, gsap-plugins, text-reveal, humanizer |
| 5 | Shop, korpa, plaćanje, nalog | Opus 4.8 | high | auto | gsap-react, popups, seo-ecommerce, humanizer |
| 6 | Admin panel | **Fable** | max + ultracode | plan | gsap-react, gsap-performance, humanizer |
| 7 | SEO, QA, demo podaci, deploy | Opus 4.8 | high | auto | seo-local, seo-schema, seo-maps, seo-sitemap, seo-technical, seo-images |

## Zavisnosti

```
0 ─► 1 ─► 2 ─► 4 ─┐
        └► 3 ─► 5 ─┼─► 6 ─► 7
                   ┘
```

2 i 3 mogu paralelno u dva terminala. 4 zavisi od 2, 5 od 3.

## Zašto Fable na 1, 4 i 6

To su tri mesta gde se odlučuje da li sajt izgleda skupo:
temelj ukusa (1), prvi ekran koji Ivana vidi (4), i proizvod koji joj prodajemo (6).
Backend je pitanje tačnosti, ne ukusa — tamo Opus sa `ultrathink`.

## Definicija „gotovo"

1. `npm run lint` — nula upozorenja
2. `npm run typecheck` — prolazi
3. `npm run build` — prolazi
4. Ručna provera na 390 px i 1440 px, u obe teme
5. Provera reveal-a iz `docs/MOTION.md` vraća prazan niz
6. Nijedan izmišljen podatak o klijentu — sve nepoznato je `[POTVRDITI]`
