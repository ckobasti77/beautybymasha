import Image from "next/image";
import { Logo } from "@/components/brand/Logo";
import { LogoReplay } from "@/components/dev/LogoReplay";
import { SheetDemo } from "@/components/dev/SheetDemo";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Select } from "@/components/ui/Select";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { formatDuration, formatRsd } from "@/lib/format";
import { darkTheme, neutralScale, palette } from "@/lib/palette";
import { photoById, photos } from "@/lib/photos";
import { productBySlug, products, productsByCategory, swatchProducts } from "@/lib/products";
import { bookableServices, serviceByKey, serviceGroups, services } from "@/lib/services";
import { locations, site } from "@/lib/site";

/**
 * PRIVREMENA kontrolna tabla za review temelja (prompt 1). Briše se u promptu 4 kad
 * dođe pravi landing. Sve što je ovde je ili iz podataka ili kratak opis onoga što se vidi.
 */

const PALETTE_ROWS: { name: string; hex: string; note: string }[] = [
  { name: "mint", hex: palette.mint, note: "logo krug, primarna dugmad — površina, nikad tekst" },
  { name: "mint-deep", hex: palette.mintDeep, note: "linkovi, hover, fokus" },
  { name: "mint-soft", hex: palette.mintSoft, note: "čipovi, selektovano" },
  { name: "mint-wash", hex: palette.mintWash, note: "najsvetlija sekcijska podloga" },
  { name: "rose", hex: palette.rose, note: "rukopis — samo akcent" },
  { name: "rose-soft", hex: palette.roseSoft, note: "badge podloge, loyalty" },
  { name: "ink", hex: palette.ink, note: "wordmark i glavni tekst" },
  { name: "ink-soft", hex: palette.inkSoft, note: "sekundarni tekst" },
  { name: "paper", hex: palette.paper, note: "podloga sajta" },
  { name: "paper-elev", hex: palette.paperElev, note: "kartice" },
  { name: "sand", hex: palette.sand, note: "linije, razdvajači" },
  { name: "success", hex: palette.success, note: "potvrđen termin" },
  { name: "warning", hex: palette.warning, note: "čeka potvrdu" },
  { name: "danger", hex: palette.danger, note: "greška, otkazano" },
];

const CONTRAST_ROWS = [
  { pair: "ink na paper", ratio: "15,8:1", ok: true },
  { pair: "mint-deep na paper", ratio: "4,6:1", ok: true },
  { pair: "ink na mint (primarno dugme)", ratio: "8,1:1", ok: true },
  { pair: "paper na mint", ratio: "2,1:1", ok: false },
  { pair: "mint na paper kao tekst", ratio: "2,2:1", ok: false },
  { pair: "rose na paper", ratio: "3,6:1", ok: false },
];

const TYPE_ROWS: { cls: string; label: string; sample: string }[] = [
  { cls: "text-display", label: "display · Archivo 800", sample: "Beauty by Masha" },
  { cls: "text-h1", label: "h1 · Archivo 800", sample: "Nokti, depilacija, masaža" },
  { cls: "text-h2", label: "h2 · Archivo 700", sample: "Dva lokala u Belvilleu" },
  { cls: "text-h3", label: "h3 · Archivo 700", sample: "SPA ORLY manikir" },
  { cls: "text-body", label: "body · Manrope 400", sample: site.tagline },
  { cls: "text-body-sm text-fg-muted", label: "body-sm", sample: site.loyalty.sub },
  { cls: "text-caption text-fg-muted", label: "caption · 500", sample: "Trajanja su procena i menjaju se u adminu." },
  { cls: "text-overline text-link", label: "overline · 600 · 0.22em", sample: "Nega ruku" },
];

const DEMO_CARDS: { title: string; text: string }[] = [
  {
    title: "Nega ruku",
    text: "Manikir, SPA ORLY manikir, trajni lak i ojačanje vitaminskim ORLY gelom u veličinama od S do XL.",
  },
  {
    title: "Nega nogu",
    text: "Klasičan, aparaturni i medicinski pedikir, SPA ORLY pedikir, kurje oko i urasli nokat.",
  },
  {
    title: "Depilacija",
    text: "Topli vosak i šećerna pasta, za žene i za muškarce, po zoni ili u paketu.",
  },
  {
    title: "Masaža",
    text: "Parcijalna, terapeutska, relax, sportska, antistres i anticelulit masaža, od 30 do 120 minuta.",
  },
  {
    title: "Trepavice i obrve",
    text: "Farbanje, lash lift i brow lift sa botoxom, pojedinačno ili u paru.",
  },
  {
    title: "Shop",
    text: `ORLY lakovi, baze i nega, uz Entity gel lak u ${productsByCategory("gel-lak").length} nijansi.`,
  },
];

const SELECT_OPTIONS = locations.map((l) => ({ value: l.key, label: l.fullName }));

function Section({
  id,
  title,
  children,
  lead,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line py-16 first:border-t-0 lg:py-24">
      <div className="mx-auto w-full max-w-content px-4 md:px-6">
        <SectionHeading eyebrow={id.replace(/-/g, " ")} title={title} lead={lead} className="mb-10" />
        {children}
      </div>
    </section>
  );
}

export default function ControlPanel() {
  const hero = photoById("bbm-01");
  const gallery = photos.filter((p) => p.id !== "bbm-01").slice(0, 3);
  const manikir = serviceByKey("manikir");
  const relax = serviceByKey("masaza-relax-90");
  const vintage = productBySlug("vintage");

  return (
    <>
      <header
        data-reveal="off"
        className="sticky top-0 z-40 border-b border-line glass"
      >
        <nav
          aria-label="Kontrolna tabla"
          className="mx-auto flex h-16 w-full max-w-content items-center justify-between px-4 md:px-6"
        >
          <a href="#top" className="min-w-0 rounded-pill focus-ring">
            <Logo variant="full" size={36} className="text-base" />
          </a>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden md:inline-flex">
              <Badge tone="warning" dot>
                privremeno · prompt 1
              </Badge>
            </span>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main id="top" className="flex-1">
        <div className="mx-auto w-full max-w-content px-4 pt-16 pb-6 md:px-6 lg:pt-24">
          <p className="text-overline text-link">Kontrolna tabla</p>
          <h1 className="mt-4 text-h1 text-fg">Temelj sajta: tokeni, logo, tipografija, primitive, animacija</h1>
          <p className="mt-5 max-w-prose text-lg text-fg-muted">
            Ova strana služi samo za pregled i briše se kad dođe pravi landing. Svaki tekst na njoj
            stiže reč po reč, a kartice, slike i brojevi ulaze kroz Reveal.
          </p>
        </div>

        <Section id="logo" title="Logo u tri varijante" lead="SVG putanje iz Archivo i Sacramento glifova. Rukopis se ispisuje jednom po sesiji, 900 ms.">
          <div className="grid gap-10 lg:grid-cols-2">
            <Card>
              <p className="text-overline text-fg-muted">mark · 64 / 128 / 224</p>
              <div className="mt-6 flex flex-wrap items-end gap-8">
                <Logo variant="mark" size={64} />
                <Logo variant="mark" size={128} />
                <Logo variant="mark" size={224} />
              </div>
              <p className="mt-8 text-overline text-fg-muted">full · za navigaciju i footer</p>
              <div className="mt-4 flex flex-wrap items-center gap-8">
                <Logo variant="full" size={40} className="text-lg" />
                <Logo variant="full" size={48} className="text-xl" />
              </div>
            </Card>
            <Card>
              <p className="text-overline text-fg-muted">wordmark · ispis rukopisa</p>
              <div className="mt-6">
                <LogoReplay />
              </div>
            </Card>
          </div>
        </Section>

        <Section id="paleta" title="Paleta" lead="Sve boje su iz DNA profila. Mint je površina i nikad tekst; kad mint mora da bude tekst, ide mint-deep.">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            {PALETTE_ROWS.map((row) => (
              <li key={row.name} className="flex flex-col gap-2">
                <span
                  aria-hidden
                  className="aspect-square w-full rounded-pill border border-line"
                  style={{ background: row.hex }}
                />
                <span className="text-sm font-semibold text-fg">{row.name}</span>
                <span className="num text-caption text-fg-muted">{row.hex}</span>
                <span className="text-caption text-fg-muted">{row.note}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-overline text-fg-muted">Neutralna skala</p>
              <ul className="mt-4 flex gap-1">
                {neutralScale.map((hex) => (
                  <li key={hex} className="flex flex-1 flex-col items-center gap-2">
                    <span aria-hidden className="h-12 w-full rounded-sm border border-line" style={{ background: hex }} />
                    <span className="num text-[10px] text-fg-muted">{hex.slice(1)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-overline text-fg-muted">Tamna tema</p>
              <ul className="mt-4 flex gap-1">
                {Object.entries(darkTheme).map(([k, hex]) => (
                  <li key={k} className="flex flex-1 flex-col items-center gap-2">
                    <span aria-hidden className="h-12 w-full rounded-sm border border-line" style={{ background: hex }} />
                    <span className="num text-[10px] text-fg-muted">
                      {k} {hex}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-overline text-fg-muted">Kontrast (WCAG AA)</p>
              <ul className="mt-4 divide-y divide-line">
                {CONTRAST_ROWS.map((c) => (
                  <li key={c.pair} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="text-fg">{c.pair}</span>
                    <span className="flex items-center gap-3">
                      <span className="num text-fg-muted">{c.ratio}</span>
                      <Badge tone={c.ok ? "success" : "danger"}>{c.ok ? "prolazi" : "ne kao tekst"}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="tipografija" title="Tipografska skala" lead="Archivo za naslove, Manrope za telo, Sacramento samo za dve-tri reči. Brojevi su tabular.">
          <ul className="divide-y divide-line">
            {TYPE_ROWS.map((row) => (
              <li key={row.label} className="grid gap-3 py-6 lg:grid-cols-[200px_1fr] lg:items-baseline">
                <p className="text-caption text-fg-muted">{row.label}</p>
                <p className={`${row.cls} text-fg`}>{row.sample}</p>
              </li>
            ))}
            <li className="grid gap-3 py-6 lg:grid-cols-[200px_1fr] lg:items-baseline">
              <p className="text-caption text-fg-muted">script · Sacramento</p>
              <p className="text-script text-[clamp(2rem,5vw,3.5rem)] text-accent">by Masha</p>
            </li>
          </ul>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-overline text-fg-muted">Cene · formatRsd</p>
              <ul className="mt-3 divide-y divide-line">
                {[manikir, serviceByKey("spa-orly-manikir"), serviceByKey("ojacanje-orly-xl"), serviceByKey("paket-anticelulit-45-x10")].map(
                  (s) =>
                    s && (
                      <li key={s.key} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                        <span className="text-fg">{s.title}</span>
                        <span className="num font-semibold text-fg">{s.priceRsd !== null ? formatRsd(s.priceRsd) : "[POTVRDITI]"}</span>
                      </li>
                    ),
                )}
              </ul>
            </div>
            <div>
              <p className="text-overline text-fg-muted">Trajanja · formatDuration</p>
              <ul className="mt-3 divide-y divide-line">
                {[manikir, serviceByKey("lakiranje-ruke"), serviceByKey("izlivanje-orly-l"), relax].map(
                  (s) =>
                    s && (
                      <li key={s.key} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                        <span className="text-fg">{s.title}</span>
                        <span className="num text-fg-muted">{formatDuration(s.durationMin)}</span>
                      </li>
                    ),
                )}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="primitive" title="UI primitive" lead="Pill dugmad od 44 px, polja sa fokus prstenom, kartice sa jednom senkom, badge tonovi, sheet.">
          <div className="grid gap-10">
            <div>
              <p className="text-overline text-fg-muted">Button · primary / ghost / danger · md / lg · loading · disabled</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Button>Zakažite termin</Button>
                <Button variant="ghost">Pogledajte cenovnik</Button>
                <Button variant="danger">Otkažite termin</Button>
                <Button size="lg">Zakažite termin</Button>
                <Button loading>Šaljemo…</Button>
                <Button disabled>Nedostupno</Button>
                <Button as="a" href="#top" variant="ghost">
                  Kao link
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Input label="Ime i prezime" placeholder="Ana Anić" autoComplete="off" />
              <Input
                label="Telefon"
                type="tel"
                defaultValue="064 145 106"
                error="Broj ima devet cifara, ovde ih je osam. Proverite poslednju."
              />
              <Input label="Količina" numeric defaultValue="2" suffix="kom" hint="Najviše 10 po porudžbini." />
              <Input label="Popust" numeric defaultValue="10" prefix="%" disabled />
              <Select label="Lokal" options={SELECT_OPTIONS} defaultValue="ljubicica" />
              <Select label="Lokal (greška)" options={SELECT_OPTIONS} placeholder="Izaberite lokal" defaultValue="" error="Izaberite lokal da vidite slobodne termine." />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <h3 className="text-h3 text-fg">Statična kartica</h3>
                <p className="mt-2 text-sm text-fg-muted">Radijus 16, jedna senka, 1 px linija.</p>
              </Card>
              <Card interactive as="a" href="#primitive">
                <h3 className="text-h3 text-fg">Interaktivna kartica</h3>
                <p className="mt-2 text-sm text-fg-muted">Hover: 1 px gore i jača senka.</p>
              </Card>
              <Card flush>
                {hero && (
                  <Image
                    src={hero.card}
                    alt={hero.alt}
                    width={1350}
                    height={Math.round(1350 / hero.aspect)}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="aspect-[4/5] w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <h3 className="text-h3 text-fg">Kartica sa slikom</h3>
                  <p className="mt-2 text-sm text-fg-muted">Slika do ivice, radijus prati karticu.</p>
                </div>
              </Card>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge>neutral</Badge>
              <Badge tone="mint">mint</Badge>
              <Badge tone="rose">bestseller</Badge>
              <Badge tone="success" dot>
                potvrđeno
              </Badge>
              <Badge tone="warning" dot>
                čeka potvrdu
              </Badge>
              <Badge tone="danger" dot>
                otkazano
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <SheetDemo />
              <p className="text-sm text-fg-muted">Na telefonu: bottom sheet sa hvataljkom. Na desktopu: modal.</p>
            </div>
          </div>
        </Section>

        <Section
          id="dva-sistema"
          title="Kartica ulazi cela, reči stižu redom"
          lead="Reveal pomera kontejner, text-reveal razlaže naslov i pasus unutra. Nikad oba na istom čvoru."
        >
          <Reveal stagger as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_CARDS.map((c) => (
              <Card key={c.title} as="li">
                <h3 className="text-h3 text-fg">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{c.text}</p>
              </Card>
            ))}
          </Reveal>

          <Reveal variant="count" delay={0.1} className="mt-16 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { n: services.length, label: "stavki u cenovniku" },
              { n: bookableServices.length, label: "usluga za onlajn zakazivanje" },
              { n: products.length, label: "proizvoda u katalogu" },
              { n: locations.length, label: "lokala u Belvilleu" },
            ].map((s) => (
              <div key={s.label} className="border-t border-line pt-4">
                <p className="num text-h1 text-fg" data-count-to={s.n}>
                  {s.n}
                </p>
                <p className="mt-1 text-sm text-fg-muted">{s.label}</p>
              </div>
            ))}
          </Reveal>

          <Reveal variant="clip" stagger={0.08} as="ul" className="mt-16 grid grid-cols-3 gap-4">
            {gallery.map((ph) => (
              <li key={ph.id} className="overflow-hidden rounded-sm">
                <Image
                  src={ph.card}
                  alt={ph.alt}
                  width={1350}
                  height={Math.round(1350 / ph.aspect)}
                  sizes="(min-width: 1024px) 400px, 33vw"
                  className="aspect-[4/5] w-full object-cover"
                />
              </li>
            ))}
          </Reveal>
        </Section>

        <Section id="swatch" title="Swatch krugovi" lead="Boje iz products.json. ORLY lakovi imaju sliku, Entity gel lak je samo swatch.">
          <Reveal stagger={0.04} as="ul" className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
            {swatchProducts.slice(0, 12).map((p) => (
              <li key={p.slug} className="flex flex-col items-center gap-2 text-center">
                <span
                  aria-hidden
                  className="aspect-square w-full max-w-28 rounded-pill border border-line shadow-card"
                  style={{ background: p.hex }}
                />
                <p className="text-sm font-semibold text-fg">{p.name}</p>
                <p className="num text-caption text-fg-muted">
                  {p.hex} · {formatRsd(p.priceRsd)}
                </p>
                <Badge tone={p.swatchOnly ? "neutral" : "mint"}>{p.finish}</Badge>
              </li>
            ))}
          </Reveal>
        </Section>

        <Section id="podaci" title="Tipovani podaci" lead="lib/site, lib/services, lib/products i lib/photos čitaju JSON, proveravaju ga pri učitavanju i ne uvoze React.">
          <div className="grid gap-8 md:grid-cols-2">
            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
              <dt className="text-fg-muted">grupa usluga</dt>
              <dd className="num text-fg">{serviceGroups.length}</dd>
              <dt className="text-fg-muted">stavki / za zakazivanje</dt>
              <dd className="num text-fg">
                {services.length} / {bookableServices.length}
              </dd>
              <dt className="text-fg-muted">proizvoda / lakova / gel lak</dt>
              <dd className="num text-fg">
                {products.length} / {productsByCategory("lakovi").length} / {productsByCategory("gel-lak").length}
              </dd>
              <dt className="text-fg-muted">fotografija</dt>
              <dd className="num text-fg">{photos.length}</dd>
              <dt className="text-fg-muted">lokala</dt>
              <dd className="num text-fg">{locations.map((l) => l.name).join(" · ")}</dd>
            </dl>
            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
              <dt className="text-fg-muted">serviceByKey(&quot;manikir&quot;)</dt>
              <dd className="num text-fg">
                {manikir ? `${formatRsd(manikir.priceRsd ?? 0)} · ${formatDuration(manikir.durationMin)}` : "—"}
              </dd>
              <dt className="text-fg-muted">serviceByKey(&quot;masaza-relax-90&quot;)</dt>
              <dd className="num text-fg">
                {relax ? `${formatRsd(relax.priceRsd ?? 0)} · ${formatDuration(relax.durationMin)}` : "—"}
              </dd>
              <dt className="text-fg-muted">productBySlug(&quot;vintage&quot;)</dt>
              <dd className="num text-fg">{vintage ? `${vintage.name} · ${vintage.hex} · ${formatRsd(vintage.priceRsd)}` : "—"}</dd>
              <dt className="text-fg-muted">loyalty</dt>
              <dd className="num text-fg">{site.loyalty.discountPercent}%</dd>
            </dl>
          </div>
        </Section>
      </main>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-4 px-4 text-sm text-fg-muted md:px-6">
          <Logo variant="full" size={28} className="text-sm" />
          <p>Cene su iz cenovnika, trajanja su procena. Sve nepotvrđeno nosi oznaku [POTVRDITI].</p>
        </div>
      </footer>
    </>
  );
}
