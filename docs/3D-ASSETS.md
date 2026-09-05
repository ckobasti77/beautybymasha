# 3D asseti — specifikacija za spoljnu izradu (GPT-6 Astra)

> Hero NE koristi 3D model — on je shader na jednom plane-u (`docs/BRAND.md` §6).
> Modeli ispod su za **shop**, i svaki je opcion: sajt mora da radi i bez njih.
> Dok fajl ne stigne, komponenta prikazuje AVIF sliku proizvoda. Bez praznog mesta.

## Budžet i pravila (važe za svaki model)

| Stavka | Vrednost |
| --- | --- |
| Format | `.glb`, glTF 2.0, **Draco** kompresija |
| Veličina fajla | **≤ 600 KB** po modelu, teksture uključene |
| Trouglovi | ≤ 40.000 |
| Teksture | ≤ 1024×1024, KTX2/Basis ako je moguće, inače WebP |
| Materijali | PBR (`metalness`/`roughness`), bez custom shadera |
| Orijentacija | Y = gore, model gleda u **+Z** |
| Pivot | Dno objekta u **y = 0**, centriran po X i Z |
| Skala | 1 jedinica = 1 cm; bočica laka visoka **≈ 9,5** jedinica |
| Animacije | nema — rotaciju radi sajt |
| Putanja | `public/models/<ime>.glb` |

Sve se učitava lenjo (`<Suspense>` + `useGLTF`), **nikad na mobilnom** i nikad uz
`prefers-reduced-motion`. Fallback je uvek slika proizvoda iz `public/products/orly/`.

## Model 1 — `orly-bocica.glb` (prioritet)

ORLY bočica laka za nokte, realistična ali čista:
- Staklo: prozirno, `roughness` 0.05, `transmission` 1.0, debljina zida vidljiva
- Tečnost unutra: **zaseban mesh** sa imenom `Liquid`, `MeshStandardMaterial`,
  da sajt može da mu menja boju po nijansi proizvoda (`hex` iz `data/products.json`)
- Zatvarač: mat crn, cilindričan, blago konusan
- Etiketa: **prazna bela površina**, zaseban mesh `Label` — sajt na nju projektuje
  naziv nijanse. Ne modelovati ORLY logo, ne stavljati nikakav brend na model.
- Nivo tečnosti oko 80% bočice

Koristi se u: hero sekciji shopa (spora rotacija, boja prati nijansu preko koje je kursor)
i na stranici proizvoda (drag za rotaciju).

## Model 2 — `kap-laka.glb` (opciono, nice-to-have)

Jedna gusta kap laka u trenutku pre nego što se otkine — glatka, sjajna, bez teksture.
Boja se postavlja iz koda. Koristi se kao razdvajač između sekcija na desktopu.

## Šta NE treba modelovati

- Logo salona — ostaje ravan, to je njen identitet
- Ruke, nokti, ljudi — koristimo njene prave fotografije
- Enterijer salona — isto, prave fotografije

## Provera pre nego što fajl uđe u projekat

```bash
npx gltf-transform inspect public/models/orly-bocica.glb
```

Mora da pokaže: ≤ 40k trouglova, ≤ 600 KB, Draco uključen, meshevi `Liquid` i `Label` postoje.
