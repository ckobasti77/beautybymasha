"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, ImagePlus, Package, Percent, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ProductSwatch } from "@/components/shop/ProductSwatch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { formatRsd } from "@/lib/format";
import { BRAND_LABELS, BRANDS, productCategories, type Brand, type ProductCategoryKey } from "@/lib/products";
import { discountedUnitPrice } from "@/lib/shop";
import { AdminReveal } from "../AdminReveal";
import { errorText } from "../strings";
import { EmptyState, InlineNumber, Panel, SaveHint, Segmented, Stepper, Toggle, useSave, useToast } from "../ui";
import { ImportSheet } from "./ImportSheet";

/**
 * Katalog webshopa.
 *
 * Dva su načina rada, jer je i posao takav: sitna popravka jednog proizvoda ide
 * kroz dodir na karticu, a cena celom brendu se menja kroz uvoz iz tabele ili
 * kroz brze radnje nad odabranim proizvodima.
 */

type Product = Doc<"products">;
type StockFilter = "sve" | "ima" | "nema";

export function ProductsTab({ adminKey }: { adminKey?: string }) {
  const products = useQuery(api.products.list, { includeInactive: true, key: adminKey });
  const toast = useToast();

  const [brand, setBrand] = useState<Brand | "sve">("sve");
  const [category, setCategory] = useState<ProductCategoryKey | "sve">("sve");
  const [stock, setStock] = useState<StockFilter>("sve");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!products) return [];
    const needle = search.trim().toLowerCase();
    return products.filter((p) => {
      if (brand !== "sve" && p.brand !== brand) return false;
      if (category !== "sve" && p.categoryKey !== category) return false;
      if (stock === "ima" && p.stock <= 0) return false;
      if (stock === "nema" && p.stock > 0) return false;
      if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [products, brand, category, stock, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (products === undefined) return <p className="text-body text-fg-muted">Učitavam katalog…</p>;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 text-fg">Proizvodi</h1>
          <p className="num mt-1 text-body-sm text-fg-muted">
            {products.length} u katalogu · {products.filter((p) => p.stock === 0).length} bez stanja
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => setImportOpen(true)} leading={<Upload size={16} aria-hidden />}>
          Uvezi tabelu
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            exportCsv(filtered);
            toast.show(`Izvezeno ${filtered.length} proizvoda.`);
          }}
          leading={<Download size={16} aria-hidden />}
        >
          Izvezi CSV
        </Button>
      </div>

      <BulkImageUpload adminKey={adminKey} />

      <div className="flex flex-col gap-2">
        <Input
          label="Pretraga"
          hideLabel
          placeholder="Naziv ili šifra"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="search"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Brend"
            hideLabel
            value={brand}
            onChange={(e) => setBrand(e.target.value as Brand | "sve")}
            options={[
              { value: "sve", label: "Svi brendovi" },
              ...BRANDS.map((b) => ({ value: b, label: BRAND_LABELS[b] })),
            ]}
          />
          <Select
            label="Kategorija"
            hideLabel
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategoryKey | "sve")}
            options={[
              { value: "sve", label: "Sve kategorije" },
              ...productCategories.map((c) => ({ value: c.key, label: c.title })),
            ]}
          />
        </div>
        <Segmented<StockFilter>
          label="Stanje"
          value={stock}
          onChange={setStock}
          options={[
            { value: "sve", label: "Sve" },
            { value: "ima", label: "Ima na stanju" },
            { value: "nema", label: "Nema" },
          ]}
        />
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex items-center justify-between gap-3 rounded-pill border border-line bg-bg-elev px-4 py-2 shadow-pop">
          <span className="num text-body-sm font-semibold text-fg">Odabrano {selected.size}</span>
          <div className="flex items-center gap-1">
            <Button magnetic={false} size="md" onClick={() => setBulkOpen(true)} leading={<Percent size={16} aria-hidden />}>
              Promeni
            </Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="min-h-11 rounded-pill px-3 text-body-sm font-semibold text-fg-muted focus-ring"
            >
              Poništi
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} strokeWidth={1.5} aria-hidden />}
          title="Nema proizvoda po ovim filterima"
          body="Otpustite filtere, ili uvezite cenovnik iz tabele da katalog dobije nove artikle."
          action={
            <Button variant="ghost" onClick={() => setImportOpen(true)}>
              Uvezi tabelu
            </Button>
          }
        />
      ) : (
        <AdminReveal
          className="grid grid-cols-2 gap-2 md:grid-cols-3"
          deps={`${brand}-${category}-${stock}-${filtered.length}`}
          stagger={0.015}
        >
          {filtered.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              selected={selected.has(p._id)}
              onToggle={() => toggle(p._id)}
              onOpen={() => setEditing(p)}
            />
          ))}
        </AdminReveal>
      )}

      <ImportSheet open={importOpen} adminKey={adminKey} onClose={() => setImportOpen(false)} />
      <EditSheet product={editing} adminKey={adminKey} onClose={() => setEditing(null)} />
      <BulkSheet
        open={bulkOpen}
        adminKey={adminKey}
        ids={[...selected] as Id<"products">[]}
        onClose={() => setBulkOpen(false)}
        onDone={() => setSelected(new Set())}
      />
    </div>
  );
}

function ProductCard({
  product,
  selected,
  onToggle,
  onOpen,
}: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const finalPrice = discountedUnitPrice(product.priceRsd, product.discountPercent);
  return (
    <article
      data-enter
      className={[
        "relative flex flex-col gap-2 rounded-md border bg-bg-elev p-3 shadow-card transition-colors duration-150",
        selected ? "border-brand" : "border-line",
        product.active ? "" : "opacity-60",
      ].join(" ")}
    >
      <label className="absolute right-2 top-2 flex size-11 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Odaberi ${product.name}`}
          className="size-5 accent-mint-deep"
        />
      </label>

      <button type="button" onClick={onOpen} className="flex flex-col items-start gap-2 text-left focus-ring">
        <ProductSwatch hex={product.hex} finish={product.finish} size={48} className="shrink-0" />
        <span className="line-clamp-2 text-body-sm font-semibold text-fg">{product.name}</span>
        <span className="num text-caption text-fg-muted">{product.sku}</span>
        <span className="num flex items-baseline gap-1.5">
          <span className="text-body font-semibold text-fg">{formatRsd(finalPrice)}</span>
          {product.discountPercent > 0 && (
            <span className="text-caption text-fg-muted line-through">{formatRsd(product.priceRsd)}</span>
          )}
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        {product.stock > 0 ? (
          <Badge tone="neutral">
            <span className="num">{product.stock} kom</span>
          </Badge>
        ) : (
          <Badge tone="warning">Nema na stanju</Badge>
        )}
        {!product.active && <Badge tone="neutral">Sklonjen</Badge>}
      </div>
    </article>
  );
}

/** Izmena jednog proizvoda. Svako polje se čuva čim se napusti — bez „Sačuvaj“. */
function EditSheet({
  product,
  adminKey,
  onClose,
}: {
  product: Product | null;
  adminKey?: string;
  onClose: () => void;
}) {
  const update = useMutation(api.products.update);
  const { state, error, run } = useSave();

  if (!product) return null;

  const patch = (fields: Partial<Product>) =>
    run(() =>
      update({
        key: adminKey,
        id: product._id,
        name: fields.name ?? product.name,
        categoryKey: fields.categoryKey ?? product.categoryKey,
        priceRsd: fields.priceRsd ?? product.priceRsd,
        discountPercent: fields.discountPercent ?? product.discountPercent,
        stock: fields.stock ?? product.stock,
        description: fields.description ?? product.description,
        hex: fields.hex ?? product.hex,
        bestseller: fields.bestseller ?? product.bestseller,
        active: fields.active ?? product.active,
      }),
    );

  return (
    <Sheet open onClose={onClose} title={product.name} description={`Šifra ${product.sku}`}>
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex items-center justify-between">
          <ProductSwatch hex={product.hex} finish={product.finish} size={48} />
          <SaveHint state={state} error={error} />
        </div>

        <Input
          label="Naziv"
          defaultValue={product.name}
          onBlur={(e) => e.target.value.trim() && patch({ name: e.target.value.trim() })}
        />

        <Select
          label="Kategorija"
          defaultValue={product.categoryKey}
          onChange={(e) => patch({ categoryKey: e.target.value as ProductCategoryKey })}
          options={productCategories.map((c) => ({ value: c.key, label: c.title }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Cena</span>
            <InlineNumber
              label="Cena"
              value={product.priceRsd}
              suffix="RSD"
              min={1}
              onCommit={(priceRsd) => patch({ priceRsd })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Popust</span>
            <InlineNumber
              label="Popust"
              value={product.discountPercent}
              suffix="%"
              max={90}
              onCommit={(discountPercent) => patch({ discountPercent })}
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-fg">Stanje</span>
          <Stepper
            label="Stanje"
            value={product.stock}
            max={9999}
            suffix=" kom"
            onChange={(stock) => patch({ stock })}
          />
        </div>

        <Input
          label="Boja swatch-a"
          defaultValue={product.hex}
          hint="U obliku #RRGGBB — to je krug boje na sajtu."
          onBlur={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value.trim()) && patch({ hex: e.target.value.trim() })}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Opis</span>
          <textarea
            defaultValue={product.description}
            rows={3}
            onBlur={(e) => patch({ description: e.target.value })}
            className="w-full rounded-sm border border-line bg-bg-elev px-3.5 py-2.5 text-base text-fg focus-ring"
          />
        </label>

        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm font-medium text-fg">Vidljiv na sajtu</span>
          <Toggle
            label="Vidljiv na sajtu"
            checked={product.active}
            onChange={(active) => patch({ active })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-fg">Izdvojen na naslovnoj</span>
          <Toggle
            label="Izdvojen na naslovnoj"
            checked={product.bestseller}
            onChange={(bestseller) => patch({ bestseller })}
          />
        </div>
      </div>
    </Sheet>
  );
}

/** Brze radnje nad odabranim proizvodima. */
function BulkSheet({
  open,
  ids,
  adminKey,
  onClose,
  onDone,
}: {
  open: boolean;
  ids: Id<"products">[];
  adminKey?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const bulkAction = useMutation(api.products.bulkAction);
  const { error, run, busy } = useSave();
  const toast = useToast();
  const [percent, setPercent] = useState(10);
  const [discount, setDiscount] = useState(20);

  if (!open) return null;

  const apply = async (action: Parameters<typeof bulkAction>[0]["action"], text: string) => {
    const result = await run(() => bulkAction({ key: adminKey, ids, action }));
    if (result) {
      toast.show(`${text} — ${result.changed} ${result.changed === 1 ? "proizvod" : "proizvoda"}.`);
      onDone();
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Odabrano ${ids.length}`}
      description="Izmena važi za sve odabrane proizvode odjednom."
    >
      <div className="flex flex-col gap-5 pt-1">
        <section className="flex flex-col gap-3">
          <h3 className="text-body font-semibold text-fg">Promeni cenu</h3>
          <div className="flex items-center justify-between gap-3">
            <Stepper label="Procenat" value={percent} min={-90} max={200} step={5} suffix="%" onChange={setPercent} />
            <Button magnetic={false}
              onClick={() => apply({ kind: "cenaProcenat", percent }, percent >= 0 ? "Cene su podignute" : "Cene su spuštene")}
              loading={busy}
            >
              Primeni
            </Button>
          </div>
          <p className="text-caption text-fg-muted">
            Pozitivan broj poskupljuje, negativan pojeftinjuje. Menja se osnovna cena, ne popust.
          </p>
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-body font-semibold text-fg">Postavi popust</h3>
          <div className="flex items-center justify-between gap-3">
            <Stepper label="Popust" value={discount} max={90} step={5} suffix="%" onChange={setDiscount} />
            <Button magnetic={false} onClick={() => apply({ kind: "popust", discountPercent: discount }, "Popust je postavljen")} loading={busy}>
              Primeni
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-body font-semibold text-fg">Vidljivost na sajtu</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={() => apply({ kind: "vidljivost", active: true }, "Vraćeno na sajt")}
              loading={busy}
              magnetic={false}
            >
              Prikaži
            </Button>
            <Button
              variant="ghost"
              onClick={() => apply({ kind: "vidljivost", active: false }, "Sklonjeno sa sajta")}
              loading={busy}
              magnetic={false}
            >
              Skloni
            </Button>
          </div>
        </section>

        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/**
 * Masovni upload slika: prevuče 50 fotografija odjednom, a svaka se upari po
 * nazivu fajla — `GUMDROP.jpg` ide na proizvod sa šifrom `GUMDROP`.
 * Fajl koji se ne prepozna se ne čuva; njegov naziv se ispiše da može da ga preimenuje.
 */
function BulkImageUpload({ adminKey }: { adminKey?: string }) {
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const attach = useMutation(api.products.attachImageByName);
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList) => {
    setBusy(true);
    setError(null);
    setUnmatched([]);
    setProgress({ done: 0, total: files.length });
    const missed: string[] = [];
    let matched = 0;

    try {
      for (const [index, file] of [...files].entries()) {
        const url = await generateUploadUrl({ key: adminKey });
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        const result = await attach({ key: adminKey, storageId, fileName: file.name });
        if (result.matched) matched++;
        else missed.push(file.name);
        setProgress({ done: index + 1, total: files.length });
      }
      setUnmatched(missed);
      toast.show(
        missed.length === 0
          ? `${matched} ${matched === 1 ? "slika je dodata" : "slika je dodato"}.`
          : `${matched} dodato · ${missed.length} bez para`,
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Slike proizvoda" hint="Naziv fajla mora da bude šifra ili slug proizvoda.">
      <div className="p-4">
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
        <Button
          variant="ghost"
          onClick={() => input.current?.click()}
          loading={busy}
          leading={<ImagePlus size={16} aria-hidden />}
          magnetic={false}
        >
          {busy ? `Šaljem ${progress.done} / ${progress.total}` : "Dodaj slike"}
        </Button>

        {error && (
          <p role="alert" className="mt-2 text-body-sm text-danger-text">
            {error}
          </p>
        )}

        {unmatched.length > 0 && (
          <div className="mt-3 rounded-sm bg-bg-sunken px-3 py-2">
            <p className="text-body-sm font-semibold text-fg">Bez para ostalo:</p>
            <p className="mt-1 text-body-sm text-fg-muted">
              {unmatched.join(", ")} — preimenujte fajl u šifru proizvoda pa pošaljite ponovo.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

/**
 * Izvoz u CSV koji Excel na srpskom otvara bez mučenja: tačka-zarez kao razdvajač
 * i BOM na početku, da š, đ, č, ć i ž ne postanu kvadratići.
 */
function exportCsv(products: readonly Product[]): void {
  const headers = ["Sifra", "Naziv", "Brend", "Kategorija", "Cena", "Popust %", "Stanje", "Boja", "Na sajtu"];
  const rows = products.map((p) => [
    p.sku,
    p.name,
    BRAND_LABELS[p.brand],
    productCategories.find((c) => c.key === p.categoryKey)?.title ?? p.categoryKey,
    String(p.priceRsd),
    String(p.discountPercent),
    String(p.stock),
    p.hex,
    p.active ? "da" : "ne",
  ]);

  const escape = (cell: string) => (/[";\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  const csv = [headers, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");

  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `proizvodi-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
