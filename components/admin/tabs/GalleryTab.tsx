"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, ImagePlus, Images, Star } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { AdminReveal } from "../AdminReveal";
import { errorText } from "../strings";
import { ConfirmButton, EmptyState, useSave, useToast } from "../ui";

/**
 * Galerija radova.
 *
 * Redosled se menja strelicama, ne prevlačenjem: prevlačenje na telefonu se bije
 * sa skrolom, a strelica je jedan siguran dodir. „Istaknuto“ bira šta ide na
 * naslovnu stranu.
 */

export function GalleryTab({ adminKey }: { adminKey?: string }) {
  const images = useQuery(api.gallery.list, {});
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const add = useMutation(api.gallery.add);
  const reorder = useMutation(api.gallery.reorder);
  const setFeatured = useMutation(api.gallery.setFeatured);
  const remove = useMutation(api.gallery.remove);
  const { run } = useSave();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList) => {
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: files.length });
    try {
      for (const [index, file] of [...files].entries()) {
        const url = await generateUploadUrl({ key: adminKey });
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        await add({ key: adminKey, storageId, alt: "Rad iz salona" });
        setProgress({ done: index + 1, total: files.length });
      }
      toast.show(`${files.length} ${files.length === 1 ? "fotografija dodata" : "fotografija dodato"}.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    if (!images) return;
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void run(() => reorder({ key: adminKey, ids: next.map((i) => i._id) }));
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-h2 text-fg">Galerija</h1>
        <p className="mt-1 text-body-sm text-fg-muted">
          Fotografije radova koje se vide na sajtu, redom kojim ih ovde poređate.
        </p>
      </header>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <Button magnetic={false} onClick={() => input.current?.click()} loading={busy} leading={<ImagePlus size={16} aria-hidden />}>
        {busy ? `Šaljem ${progress.done} / ${progress.total}` : "Dodaj fotografije"}
      </Button>

      {error && (
        <p role="alert" className="text-body-sm text-danger-text">
          {error}
        </p>
      )}

      {images === undefined ? (
        <p className="text-body text-fg-muted">Učitavam galeriju…</p>
      ) : images.length === 0 ? (
        <EmptyState
          icon={<Images size={28} strokeWidth={1.5} aria-hidden />}
          title="Galerija je prazna"
          body="Ovde idu fotografije vaših radova — one koje objavljujete na Instagramu. Prva u nizu je i prva na sajtu."
          action={
            <Button variant="ghost" onClick={() => input.current?.click()}>
              Dodaj prvu
            </Button>
          }
        />
      ) : (
        <AdminReveal className="grid grid-cols-2 gap-2 md:grid-cols-3" deps={images.length} stagger={0.02}>
          {images.map((img, index) => (
            <figure
              key={img._id}
              data-enter
              className="overflow-hidden rounded-md border border-line bg-bg-elev shadow-card"
            >
              <div className="relative aspect-square">
                {img.url && (
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 768px) 200px, 45vw"
                    className="object-cover"
                    unoptimized
                  />
                )}
                {img.featured && (
                  <span className="absolute left-2 top-2 rounded-pill bg-brand px-2 py-1 text-[11px] font-bold text-brand-fg">
                    Istaknuto
                  </span>
                )}
              </div>
              <figcaption className="flex items-center justify-between gap-0.5 p-1">
                <button
                  type="button"
                  aria-label="Pomeri unazad"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="inline-flex size-11 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:bg-bg-sunken disabled:opacity-30 focus-ring"
                >
                  <ArrowUp size={16} strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Pomeri unapred"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  className="inline-flex size-11 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:bg-bg-sunken disabled:opacity-30 focus-ring"
                >
                  <ArrowDown size={16} strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={img.featured ? "Skloni sa naslovne" : "Istakni na naslovnoj"}
                  aria-pressed={img.featured}
                  onClick={() => run(() => setFeatured({ key: adminKey, id: img._id, featured: !img.featured }))}
                  className={[
                    "inline-flex size-11 items-center justify-center rounded-pill transition-colors duration-150 hover:bg-bg-sunken focus-ring",
                    img.featured ? "text-accent" : "text-fg-muted",
                  ].join(" ")}
                >
                  <Star size={16} strokeWidth={1.75} fill={img.featured ? "currentColor" : "none"} aria-hidden />
                </button>
                <ConfirmButton
                  label="Obriši"
                  confirmLabel="Sigurno?"
                  onConfirm={() =>
                    run(async () => {
                      await remove({ key: adminKey, id: img._id });
                      toast.show("Fotografija je obrisana.");
                    })
                  }
                />
              </figcaption>
            </figure>
          ))}
        </AdminReveal>
      )}
    </div>
  );
}
