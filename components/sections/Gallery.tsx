"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/site/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useOptionalLenis } from "@/components/providers/SmoothScroll";
import { photoById, photosByUse, type Photo } from "@/lib/photos";

/**
 * „Radovi" — masonry njenih fotografija sa lightbox-om.
 *
 * Varijanta je `photo` (čista fotografija bez wordmarka), OSIM za tri snimka čiji
 * `note` u `data/photos.json` izričito traži `card`: bbm-09 je pre/posle kartica,
 * bbm-10 je timska fotografija kojoj je rez odsekao deo tima, bbm-24 je zid lakova
 * sa natpisom. Njima je `photo` rez loš i mora da ostane njena original objava.
 *
 * `alt` tekstovi su već napisani u `data/photos.json` i koriste se doslovno.
 */

/** Vidi `note` u data/photos.json — ovim trima `photo` rez ne valja. */
const CARD_VARIANT = new Set(["bbm-09", "bbm-10", "bbm-24"]);

function galleryPhotos(): Photo[] {
  const out = [...photosByUse("galerija")];
  for (const id of CARD_VARIANT) {
    const p = photoById(id);
    if (p && !out.some((x) => x.id === id)) out.push(p);
  }
  return out;
}

const PHOTOS = galleryPhotos();

function srcOf(p: Photo): string {
  return CARD_VARIANT.has(p.id) ? p.card : p.photo;
}

function Lightbox({
  photo,
  onClose,
  onStep,
}: {
  photo: Photo;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lenis = useOptionalLenis();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const smooth = lenis?.current ?? null;
    smooth?.stop();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onStep(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onStep(-1);
      } else if (e.key === "Tab") {
        // Jedini fokusabilni element je dugme za zatvaranje — fokus ostaje u dijalogu.
        e.preventDefault();
        panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      smooth?.start();
      previous?.focus?.();
    };
  }, [onClose, onStep, lenis]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Zatvori"
        className="absolute top-4 right-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill bg-paper-elev text-ink focus-ring"
      >
        <X size={22} strokeWidth={1.5} aria-hidden />
      </button>
      <Image
        src={srcOf(photo)}
        alt={photo.alt}
        width={1350}
        height={Math.round(1350 / photo.aspect)}
        sizes="(min-width: 768px) 70vw, 92vw"
        className="max-h-[86dvh] w-auto max-w-full rounded-md object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback((delta: number) => {
    setIndex((i) => (i === null ? null : (i + delta + PHOTOS.length) % PHOTOS.length));
  }, []);

  return (
    <Section id="radovi" tone="wash">
      <SectionHeading
        eyebrow="Radovi"
        title="Njene fotografije, bez doterivanja"
        lead="Sve je snimljeno u salonu, na pravim klijentkinjama, pri dnevnom svetlu. Kliknite za veći prikaz."
      />

      <Reveal
        as="ul"
        variant="clip"
        stagger={0.06}
        // Prazni <li> (samo slika): hideCss() bi ih sakrio, a clip varijanta ne dira opacity.
        revealOff
        className="mt-14 columns-2 gap-4 md:columns-3 lg:columns-4 [&>li]:mb-4"
      >
        {PHOTOS.map((p, i) => (
          <li key={p.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="block w-full overflow-hidden rounded-md focus-ring"
            >
              <Image
                src={srcOf(p)}
                alt={p.alt}
                width={1080}
                height={Math.round(1080 / p.aspect)}
                sizes="(min-width: 1024px) 300px, (min-width: 768px) 33vw, 50vw"
                className="w-full transition-transform duration-300 ease-out-expo hover:scale-[1.02]"
              />
            </button>
          </li>
        ))}
      </Reveal>

      {index !== null && PHOTOS[index] ? (
        <Lightbox photo={PHOTOS[index]} onClose={close} onStep={step} />
      ) : null}
    </Section>
  );
}
