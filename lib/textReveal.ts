import gsap from "gsap";
import { REVEAL_WORD_CLASS, TEXT_REVEAL } from "@/constants/textRevealConfig";

/* ------------------------------------------------------------------ */
/*  Deljenje na reči — tekstualni čvorovi se POMERAJU, nikad ne kopiraju */
/*  Port iz _ref/colorcutchris/lib/textReveal.ts. Bez React importa.     */
/* ------------------------------------------------------------------ */

const WORD_SELECTOR = `.${REVEAL_WORD_CLASS}`;

function isFlexy(el: Element | null): boolean {
  if (!el) return false;
  const d = getComputedStyle(el).display;
  return d === "flex" || d === "inline-flex" || d === "grid" || d === "inline-grid";
}

function textNodesOf(el: HTMLElement): Text[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.nodeValue && node.nodeValue.trim()) out.push(node);
  }
  return out;
}

/**
 * Pomeri jedan tekstualni čvor u .reveal-word span-ove. `splitText` deli čvor
 * na licu mesta (pravi čvorovi, bez kloniranja), pa React zadržava ono što drži.
 * Idemo unazad da indeksi ostanu validni.
 */
function wrapTextNode(node: Text, out: HTMLElement[]) {
  const value = node.nodeValue ?? "";
  const ranges: [number, number][] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) ranges.push([m.index, m.index + m[0].length]);
  if (!ranges.length) return;

  const local: HTMLElement[] = [];
  const head = node;
  for (let i = ranges.length - 1; i >= 0; i--) {
    const [start, end] = ranges[i];
    if (end < (head.nodeValue?.length ?? 0)) head.splitText(end);
    const word = start > 0 ? head.splitText(start) : head;
    const span = document.createElement("span");
    span.className = REVEAL_WORD_CLASS;
    word.parentNode?.insertBefore(span, word);
    span.appendChild(word); // pomeraj, ne klon
    local.unshift(span);
    if (start === 0) break;
  }
  out.push(...local);
}

/** Podeli copy elementa na reči. Idempotentno. Vraća .reveal-word span-ove. */
export function splitWords(el: HTMLElement): HTMLElement[] {
  const existing = el.querySelectorAll<HTMLElement>(WORD_SELECTOR);
  if (existing.length) return [...existing];
  const words: HTMLElement[] = [];
  for (const node of textNodesOf(el)) wrapTextNode(node, words);
  if (words.length) el.dataset.revealSplit = "1";
  return words;
}

/** Vrati tekst u prvobitno stanje (čisti i inline stilove od animacije). */
export function restoreWords(el: HTMLElement) {
  const spans = el.querySelectorAll<HTMLElement>(WORD_SELECTOR);
  gsap.killTweensOf(spans);
  gsap.killTweensOf(el);
  for (const span of spans) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  }
  el.normalize();
  delete el.dataset.revealSplit;
  delete el.dataset.revealState;
  gsap.set(el, { clearProps: "opacity,filter,transform,visibility,willChange" });
}

/**
 * Posle završenog ulaza: skini .reveal-word omotače i spoji tekst nazad u jedan čvor,
 * ali ZADRŽI inline `opacity: 1` na elementu — hideCss() bi ga inače ponovo sakrio.
 * Site-wide prolaz ovo radi uvek (docs/MOTION.md: `.reveal-word` = 0 posle završetka);
 * hero i paneli koji posle zovu concealWords ne smeju (njima trebaju span-ovi).
 */
export function settleWords(el: HTMLElement) {
  const spans = el.querySelectorAll<HTMLElement>(WORD_SELECTOR);
  for (const span of spans) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  }
  el.normalize();
  delete el.dataset.revealSplit;
  gsap.set(el, { opacity: 1, clearProps: "filter,transform,willChange" });
  el.dataset.revealState = "done";
}

/* ------------------------------------------------------------------ */
/*  Animacija                                                          */
/* ------------------------------------------------------------------ */

export type RevealOptions = {
  /** Bez animacije — odmah u finalno stanje (prefers-reduced-motion). */
  instant?: boolean;
  /** Po završetku vrati reči u običan tekst (settleWords). Site-wide prolaz: true. */
  settle?: boolean;
  /** Trajanje jedne reči (s). */
  duration?: number;
  /** Prozor u kome se reči raspoređuju (s). */
  staggerWindow?: number;
  blur?: number;
  /** Podizanje u em-ovima. */
  lift?: number;
  ease?: string;
  /** Odlaganje starta (s) — kad se poziva samostalno, bez roditeljskog timeline-a. */
  delay?: number;
};

function wordCount(el: HTMLElement): number {
  return (el.textContent ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Element bledi kao blok kad je predugačak ili kad bi reči postale flex/grid
 * stavke (svaki `gap` bi tada pao između reči).
 */
function mustFadeAsBlock(el: HTMLElement): boolean {
  if (wordCount(el) > TEXT_REVEAL.maxWords) return true;
  if (isFlexy(el.parentElement)) return true;
  if (isFlexy(el)) return true;
  return textNodesOf(el).some((n) => isFlexy(n.parentElement));
}

/**
 * Otkrij copy elementa: reč po reč, nasumičnim redom, iz blur-a i odozdo.
 * Vraća timeline da pozivalac (npr. hero) može da ga ugnezdi u svoj.
 */
export function revealWords(el: HTMLElement, opts: RevealOptions = {}): gsap.core.Timeline {
  const {
    instant = false,
    duration = TEXT_REVEAL.duration,
    staggerWindow = TEXT_REVEAL.staggerWindow,
    blur = TEXT_REVEAL.blur,
    lift = TEXT_REVEAL.lift,
    ease = TEXT_REVEAL.ease,
    delay = 0,
    settle = false,
  } = opts;

  el.dataset.revealState = "pending";

  const asBlock = mustFadeAsBlock(el);
  const words = asBlock ? [] : splitWords(el);

  // Bez animacije: postavlja se odmah (gsap.set), ne kroz timeline — pozivalac
  // (hero, reduced-motion) računa na to da je stanje primenjeno sinhrono.
  if (instant) {
    gsap.set(words.length ? [el, ...words] : el, { opacity: 1, filter: "none", y: 0 });
    el.dataset.revealState = "done";
    if (settle && words.length) settleWords(el);
    return gsap.timeline();
  }

  const tl = gsap.timeline({
    delay,
    onComplete: () => {
      el.dataset.revealState = "done";
      if (settle) {
        settleWords(el);
        return;
      }
      const spans = el.querySelectorAll(WORD_SELECTOR);
      if (spans.length) gsap.set(spans, { clearProps: "willChange,filter" });
    },
  });

  if (!words.length) {
    tl.fromTo(
      el,
      { opacity: 0, filter: `blur(${blur}px)`, y: `${lift}em` },
      { opacity: 1, filter: "blur(0px)", y: 0, duration, ease },
    );
    return tl;
  }

  // element više ne sme da bude taj koji je proziran — reči preuzimaju
  tl.set(el, { opacity: 1 }, 0);

  tl.fromTo(
    words,
    { opacity: 0, filter: `blur(${blur}px)`, y: `${lift}em` },
    {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      duration,
      ease,
      stagger: { amount: staggerWindow, from: "random" },
    },
    0,
  );
  return tl;
}

/**
 * Ogledalo od `revealWords` — copy odlazi reč po reč, istim nasumičnim ritmom.
 * Za hero i panele koji menjaju copy na licu mesta.
 */
export function concealWords(el: HTMLElement, opts: RevealOptions = {}): gsap.core.Timeline {
  const {
    instant = false,
    duration = TEXT_REVEAL.duration,
    staggerWindow = TEXT_REVEAL.staggerWindow,
    blur = TEXT_REVEAL.blur,
    lift = TEXT_REVEAL.lift,
    ease = "power2.in",
  } = opts;

  const words = el.querySelectorAll<HTMLElement>(WORD_SELECTOR);
  const targets: gsap.TweenTarget = words.length ? words : el;

  if (instant) {
    gsap.set(targets, { opacity: 0 });
    return gsap.timeline();
  }

  const tl = gsap.timeline();
  tl.to(targets, {
    opacity: 0,
    filter: `blur(${blur}px)`,
    y: `-${lift}em`,
    duration,
    ease,
    stagger: words.length ? { amount: staggerWindow, from: "random" } : 0,
  });
  return tl;
}
