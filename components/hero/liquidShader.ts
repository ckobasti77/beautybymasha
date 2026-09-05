/**
 * „Tečni lak" — fragment shader hero sekcije (ADR-005, docs/BRAND.md §6,
 * data/design-dna.json → visual_effects.shader_effects).
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
  uniform float uPour;        // 0..1, razlivanje minta gore-desno → dole-levo (spec 12 C)
  uniform vec3  uPalette[4];
  uniform float uReduced;     // 1 = bez kretanja (rezerva; mi tada i ne montiramo Canvas)
  uniform vec2  uResolution;

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

  /* Četiri oktave — dalje se na 1.5 dpr ionako ne vidi, a košta. */
  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
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
    // površinu u mermer, a traži se lak koji se sliva.
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.15;

    // Pun ciklus ~24 s.
    float t = uTime * 0.26;
    float warp = 1.0 - uReduced;

    // Pointer gura polje; skrol ga gura u dubinu (šire polje = udaljenije).
    p += uPointer * 0.11 * warp;
    p *= 1.0 + uScroll * 0.28;
    p.y -= uScroll * 0.35;

    // Domenski warping, prolaz 1
    vec2 q = vec2(fbm(p + t * 0.30), fbm(p + vec2(5.2, 1.3) - t * 0.20));
    // prolaz 2
    vec2 r = vec2(
      fbm(p + 1.35 * q * warp + vec2(1.7, 9.2) + t * 0.14),
      fbm(p + 1.35 * q * warp + vec2(8.3, 2.8) - t * 0.12)
    );
    float f = fbm(p + 1.25 * r * warp);

    // Veći nagib = širi opseg n (jači kontrast); centar ostaje 0.5.
    float n = clamp(f * 0.85 + 0.5, 0.0, 1.0);

    // Paleta iz design-dna: mint → mint-soft → rose-soft → paper. Prag mint→mint-soft je
    // pomeren naviše (0.35) da zasićeni mint drži donju polovinu polja umesto da odmah
    // pređe u skoro-belo; papir ostaje samo na vrhu (n>0.92), inače se cela površina
    // proseči u krem i mint se izgubi.
    vec3 col = mix(uPalette[0], uPalette[1], smoothstep(0.35, 0.82, n));
    col = mix(col, uPalette[2], smoothstep(0.70, 0.92, n));
    col = mix(col, uPalette[3], smoothstep(0.92, 1.00, n));

    // Mokri sjaj: jedan uzan pojas koji lenjo klizi dijagonalno preko polja. Jači, sa
    // podignutim podom (0.5) da se vidi i preko mint zona — mora da se čita kao mokar lak.
    float band = dot(p, normalize(vec2(0.82, 0.57))) * 1.5 + length(r) * 0.5 - t * 0.42;
    float ridge = 1.0 - abs(fract(band * 0.5) * 2.0 - 1.0);
    float spec = pow(clamp(ridge, 0.0, 1.0), 8.0);
    col += spec * 0.55 * (0.5 + 0.5 * n) * warp;

    // Ivice se blago povlače u papir — slabije i dalje od centra, da mrlja zadrži boju.
    float edge = smoothstep(0.62, 1.20, length(p));
    col = mix(col, uPalette[3], edge * 0.30);

    /*
     * Razlivanje (spec 12 → C): dok se bočica naginje, mint FRONT kreće iz gornjeg desnog
     * ugla ka donjem levom. diag je rastojanje po dijagonali od tog ugla (0 tamo, ~1.41
     * u suprotnom); ivica fronta je iskrivljena istim warp poljem r, pa nije linija nego
     * lak koji curi. Na uPour = 0 front stoji van kadra (ništa ne curi), na 1 prekriva i
     * suprotni ugao.
     */
    float diag = dot(vec2(1.0) - vUv, vec2(0.7071));
    float front = uPour * 2.3 - 0.3;
    float pour = 1.0 - smoothstep(front - 0.45, front + 0.05, diag + 0.18 * r.x);

    /*
     * Čitljiva površina ispod copy-ja: široki meki veo boje papira, pomeren ulevo,
     * tamo gde stoje wordmark, naslov i dugmad. Bez njega naslov sedi na šarenoj
     * podlozi i kontrast padne ispod AA. Desna polovina kadra nema veo — tamo mint
     * ostaje pun. Kad se lak razlije (uPour → 1) copy je već iznad kadra, pa veo popušta.
     */
    vec2 d = (vUv - vec2(0.30, 0.46)) / vec2(0.74, 0.64);
    float veil = 1.0 - smoothstep(0.0, 1.0, length(d));
    col = mix(col, uPalette[3], veil * 0.50 * (1.0 - 0.8 * pour));

    // Razliveni lak: zasićen mint preko svega što je front prešao, sa mokrim odsjajem.
    col = mix(col, uPalette[0], pour * 0.85);
    col += spec * 0.35 * pour * warp;

    // Završni lift (linearni prostor, pre colorspace_fragment): zasićenost pa kontrast,
    // da mint i rose izađu iz skoro-belog. Paleta je inače po konstrukciji izbeljena.
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(luma), col, 1.35);
    col = clamp((col - 0.5) * 1.12 + 0.5, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Boje iz `data/design-dna.json` → visual_effects.background_effects.params.color_palette. */
export const HERO_PALETTE = ["#57BFA8", "#C9E9E1", "#FBDCE9", "#FAF6F1"] as const;
