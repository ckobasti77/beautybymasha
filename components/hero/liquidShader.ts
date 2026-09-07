/**
 * „Tečni lak" — fragment shader hero sekcije (ADR-005, docs/BRAND.md §6,
 * data/design-dna.json → visual_effects.shader_effects; razlivanje: spec 13 → E).
 *
 * Tri sloja simplex fBm šuma sa domenskim iskrivljenjem u dva prolaza daju
 * površinu tečnosti; preko nje lenjo klizi jedan specular pojas koji se čita kao
 * mokar lak. Pun ciklus je oko 24 s.
 *
 * Sve je u fragmentu. Vertex ne koristi kameru: plane 2×2 ide pravo u NDC i puni ceo
 * kadar bez obzira na kameru — hero scena od koraka 12 ima PERSPEKTIVNU kameru zbog
 * bočice, a pozadina mora da ostane ravna i puna (`frustumCulled` isključen na mesh-u).
 * Bez tekstura, bez učitavanja, bez grananja (`mix`/`smoothstep` umesto `if`).
 */

export const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Puni kadar nezavisno od kamere: koordinate ravni 2×2 su već NDC. Dubina je
    // nebitna — materijal ne testira ni ne piše dubinu, a crta se prvi (renderOrder -1).
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uPointer;     // -1..1, već ulerpovan na CPU strani
  uniform float uScroll;      // 0..1, izlazak heroja iz kadra (dubina)
  uniform float uPour;        // 0..1, radijalno razlivanje uhvaćene boje (spec 13 E)
  uniform vec3  uPourColor;   // uhvaćena boja tečnosti (THREE.Color, linearni prostor)
  uniform vec2  uPourOrigin;  // uv tačka iz koje kreće razlivanje (y na gore)
  uniform float uPourMax;     // najveće rastojanje od ishodišta do ugla kadra (uv, aspect-ispravljeno)
  // 0..3 = DNA paleta (mint → mint-soft → rose-soft → paper); 4 = --mint-deep (dublji mint u
  // niskom delu polja, da miran kadar ne otpliva u skoro-belo). Linearni prostor kroz THREE.Color.
  uniform vec3  uPalette[5];
  uniform float uReduced;     // 1 = bez kretanja (rezerva; mi tada i ne montiramo Canvas)
  uniform vec2  uResolution;
  // Broj fBm oktava: 3 na desktopu, 2 u mobilnom budžetu (korak 18 A). JEDAN uniform, ne dve
  // verzije koda — polje mora da ostane isto, samo bez najfinijeg sloja.
  uniform float uOctaves;

  varying vec2 vUv;

  /* ---- simplex noise 2D (Ashima Arts / Stefan Gustavson, MIT) ---- */
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  /* Do tri oktave (korak 16): fine nabore ne želimo — polje je ređe i krupnije, a jeftinije je.
     Lacunarity 2.02 ostaje; amplituda i dalje puca na pola po oktavi. Gornja granica petlje mora
     da bude konstanta (GLSL ES 1.00), pa se uOctaves čita kao uslov izlaska — na telefonu
     treći sloj šuma se ne računa uopšte, ne samo što mu je amplituda nula (korak 18 A). */
  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
      if (float(i) >= uOctaves) break;
      sum += amp * snoise(p);
      p = p * 2.02 + vec2(11.3, 7.1);
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    // Kvadratna mreža bez obzira na oblik prozora — mrlje ostaju okrugle.
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    // Niska prostorna frekvencija: krupne, lenje mrlje. Veći množilac ovde pretvara
    // površinu u mermer, a traži se lak koji se sliva. Korak 16: 1.15 → 0.80 (ređe, krupnije mrlje).
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 0.80;

    // Pun ciklus ~24 s.
    float t = uTime * 0.26;
    float warp = 1.0 - uReduced;

    // Pointer gura polje; skrol ga gura u dubinu (šire polje = udaljenije).
    p += uPointer * 0.11 * warp;
    p *= 1.0 + uScroll * 0.28;
    p.y -= uScroll * 0.35;

    // Domenski warping, prolaz 1
    vec2 q = vec2(fbm(p + t * 0.30), fbm(p + vec2(5.2, 1.3) - t * 0.20));
    // prolaz 2 — korak 16: manje uvijanja (1.35 → 0.85 warp q, 1.25 → 0.80 warp r), manje distorzije.
    vec2 r = vec2(
      fbm(p + 0.85 * q * warp + vec2(1.7, 9.2) + t * 0.14),
      fbm(p + 0.85 * q * warp + vec2(8.3, 2.8) - t * 0.12)
    );
    float f = fbm(p + 0.80 * r * warp);

    // Veći nagib = širi opseg n (jači kontrast); centar ostaje 0.5.
    float n = clamp(f * 0.85 + 0.5, 0.0, 1.0);

    // Paleta iz design-dna: mint → mint-soft → rose-soft → paper. Korak 16: pragovi pomereni naviše
    // (0.45, 0.90) da miran kadar bude 10-15 % manje svetla i mirniji — mint drži veći deo polja, a
    // papir se javlja tek na samom vrhu (n > 0.96), inače cela površina otpliva u krem.
    vec3 col = mix(uPalette[0], uPalette[1], smoothstep(0.45, 0.90, n));
    col = mix(col, uPalette[2], smoothstep(0.70, 0.92, n));
    col = mix(col, uPalette[3], smoothstep(0.96, 1.00, n));

    // Dublji mint u niskom delu polja: ne tamnije ka crnoj, nego dublji mint (--mint-deep) umesto
    // skoro-belog. Iznad n = 0.45 boja ostaje netaknuta.
    col = mix(uPalette[4], col, smoothstep(0.0, 0.45, n));

    // Mokri sjaj: jedan uzan pojas koji lenjo klizi dijagonalno preko polja. Jači, sa
    // podignutim podom (0.5) da se vidi i preko mint zona — mora da se čita kao mokar lak.
    float band = dot(p, normalize(vec2(0.82, 0.57))) * 1.5 + length(r) * 0.5 - t * 0.42;
    float ridge = 1.0 - abs(fract(band * 0.5) * 2.0 - 1.0);
    // Korak 16: uži pojas (8 → 12) i tiši sjaj (0.55 → 0.35) — ređe, mirnije „prelamanje".
    float spec = pow(clamp(ridge, 0.0, 1.0), 12.0);
    col += spec * 0.35 * (0.5 + 0.5 * n) * warp;

    // Ivice se blago povlače u papir — slabije i dalje od centra, da mrlja zadrži boju.
    // Korak 16: 0.30 → 0.22 (papir ne sme da izbeli kadar).
    float edge = smoothstep(0.62, 1.20, length(p));
    col = mix(col, uPalette[3], edge * 0.22);

    /*
     * Razlivanje (spec 13 → E): RADIJALNI front iz tačke gde je kap napustila kadar
     * (uPourOrigin). d je rastojanje u uv prostoru ispravljenom za aspect (front ostaje krug i
     * na širokom monitoru); ivica je iskrivljena istim warp poljem r, pa nije kružnica nego lak
     * koji se širi. Na uPour = 0 front je 0.3 IZA ishodišta (ni warp ga ne uvlači u kadar), na 1
     * je 0.35 iza najdaljeg ugla — isti brojevi kao pourFront u lib/heroChoreography.ts.
     */
    float d = length((vUv - uPourOrigin) * vec2(aspect, 1.0));
    float front = uPour * (uPourMax + 0.65) - 0.3;
    float pour = 1.0 - smoothstep(front - 0.14, front + 0.03, d + 0.15 * r.x);

    /*
     * Čitljiva površina ispod copy-ja: široki meki veo boje papira, pomeren ulevo,
     * tamo gde stoje wordmark, naslov i dugmad. Bez njega naslov sedi na šarenoj
     * podlozi i kontrast padne ispod AA. Desna polovina kadra nema veo — tamo mint
     * ostaje pun. Kad se lak razlije (uPour → 1) copy odlazi, pa veo popušta; ink
     * (--hero-ink) i DOM scrim tada preuzimaju kontrast (spec E).
     */
    vec2 d2 = (vUv - vec2(0.30, 0.46)) / vec2(0.74, 0.64);
    float veil = 1.0 - smoothstep(0.0, 1.0, length(d2));
    col = mix(col, uPalette[3], veil * 0.50 * (1.0 - 0.8 * pour));

    // Razlivena boja: uhvaćena boja sa 25 % minta (brend ne nestaje), sa mokrim odsjajem —
    // ali odsjaj ispod copy-ja prigušen: svetle pruge preko tamnog laka obaraju kontrast
    // svetlog teksta ispod AA (mereno u koraku 13).
    vec3 pourCol = mix(uPourColor, uPalette[0], 0.25);
    col = mix(col, pourCol, pour * 0.88);
    col += spec * 0.35 * pour * warp * (1.0 - 0.75 * veil);

    // Završni lift (linearni prostor, pre colorspace_fragment): zasićenost pa kontrast,
    // da mint i rose izađu iz skoro-belog. Paleta je inače po konstrukciji izbeljena.
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(luma), col, 1.35);
    // Korak 16: 1.12 → 1.06 — mirniji kadar (manje razvučen kontrast).
    col = clamp((col - 0.5) * 1.06 + 0.5, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Boje iz `data/design-dna.json` → visual_effects.background_effects.params.color_palette (0..3:
 * mint → mint-soft → rose-soft → paper). Peta boja je token `--mint-deep` (#2E8E7B, app/globals.css):
 * NIJE deo DNA palete, već dublji mint kojim se od koraka 16 seni nizak deo polja da miran kadar ne
 * otpliva u skoro-belo. Kroz `THREE.Color` ide u linearni prostor pre shadera (LiquidCanvas).
 */
export const HERO_PALETTE = ["#57BFA8", "#C9E9E1", "#FBDCE9", "#FAF6F1", "#2E8E7B"] as const;
