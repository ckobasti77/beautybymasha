"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/lib/cartStore";
import { CartTotals, type CartQuote } from "@/components/cart/CartTotals";
import { OrderReceipt, type PlacedOrder } from "@/components/cart/OrderReceipt";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatRsd } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/site";

/**
 * Naplata. Polja su ona koja kurir zaista traži i nijedno više.
 *
 * Cena se ni ovde ne šalje. Mutacija `orders.create` prima samo `slug` i `qty`,
 * pa sve preračuna iz baze — zbir na ekranu i zbir na računu ne mogu da se
 * raziđu ni ako neko između klika i slanja promeni cenu u adminu.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

type Fields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  note: string;
};

const EMPTY: Fields = { name: "", phone: "", email: "", address: "", city: "", postalCode: "", note: "" };

/** Ista pravila kao na serveru (`convex/lib/validate.ts`), samo bez putovanja tamo. */
function validate(f: Fields): Partial<Record<keyof Fields, string>> {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (f.name.trim().length < 2) errors.name = "Upišite ime i prezime.";
  if (!/^(\+381|0)\d{7,11}$/.test(f.phone.replace(/[\s/()-]/g, ""))) {
    errors.phone = "Upišite broj telefona, na primer 060 123 4567.";
  }
  if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(f.email.trim())) {
    errors.email = "Upišite imejl adresu.";
  }
  if (f.address.trim().length < 4) errors.address = "Upišite ulicu i broj.";
  if (f.city.trim().length < 2) errors.city = "Upišite grad.";
  if (!/^\d{5}$/.test(f.postalCode.replace(/\s/g, ""))) errors.postalCode = "Poštanski broj ima pet cifara.";
  if (f.note.length > 300) errors.note = "Napomena može imati najviše 300 znakova.";
  return errors;
}

function PaymentChoice({
  value,
  onChange,
  ipsAvailable,
}: {
  value: PaymentMethod;
  onChange: (next: PaymentMethod) => void;
  ipsAvailable: boolean;
}) {
  return (
    <fieldset className="mt-8">
      <legend className="text-h3 text-fg">Plaćanje</legend>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg-elev p-4 has-checked:border-brand has-checked:bg-tint-wash">
        <input
          type="radio"
          name="placanje"
          value="pouzecem"
          checked={value === "pouzecem"}
          onChange={() => onChange("pouzecem")}
          className="mt-1 size-5 accent-mint-deep focus-ring"
        />
        <span>
          <span className="block text-sm font-semibold text-fg">{PAYMENT_METHOD_LABELS.pouzecem}</span>
          <span className="mt-1 block text-sm text-fg-muted">Kuriru pri preuzimanju, gotovinom ili karticom.</span>
        </span>
      </label>

      <label
        className={[
          "mt-3 flex items-start gap-3 rounded-md border border-line p-4",
          ipsAvailable ? "cursor-pointer bg-bg-elev has-checked:border-brand has-checked:bg-tint-wash" : "bg-bg-sunken",
        ].join(" ")}
      >
        <input
          type="radio"
          name="placanje"
          value="ips"
          checked={value === "ips"}
          disabled={!ipsAvailable}
          onChange={() => onChange("ips")}
          className="mt-1 size-5 accent-mint-deep focus-ring disabled:opacity-40"
        />
        <span>
          <span className="block text-sm font-semibold text-fg">{PAYMENT_METHOD_LABELS.ips}</span>
          {ipsAvailable ? (
            <span className="mt-1 block text-sm text-fg-muted">
              Posle porudžbine dobijate QR kod za nalog. Skenirate ga u aplikaciji svoje banke.
            </span>
          ) : (
            <span className="mt-1 block text-sm text-fg-muted">
              Još nije uključeno: čekamo od vlasnice tačan broj računa i naziv primaoca iz banke. Dok toga
              nema, QR kod se ne pravi. [POTVRDITI]
            </span>
          )}
        </span>
      </label>
    </fieldset>
  );
}

function Form({ quote, onPlaced }: { quote: CartQuote; onPlaced: (order: PlacedOrder) => void }) {
  const { items, clear } = useCart();
  const createOrder = useMutation(api.orders.create);

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("pouzecem");
  const [sending, setSending] = useState(false);

  const set = (key: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      const result = await createOrder({
        items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
        customer: {
          name: fields.name.trim(),
          phone: fields.phone.trim(),
          email: fields.email.trim(),
          address: fields.address.trim(),
          city: fields.city.trim(),
          postalCode: fields.postalCode.replace(/\s/g, ""),
          note: fields.note.trim() || undefined,
        },
        paymentMethod: payment,
      });
      // Redosled je bitan: potvrda se prvo podigne iznad korpe, pa se korpa
      // isprazni. Obrnuto bi ispraznjena korpa srušila formu zajedno sa
      // potvrdom i kupac bi ostao bez broja porudžbine.
      onPlaced(result);
      clear();
    } catch (err) {
      setServerError(
        err instanceof ConvexError
          ? String(err.data)
          : "Porudžbina nije poslata. Proverite vezu pa probajte ponovo.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
      <div>
        <h2 className="text-h3 text-fg">Podaci za dostavu</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Input
            label="Ime i prezime"
            autoComplete="name"
            value={fields.name}
            onChange={set("name")}
            error={errors.name}
            className="md:col-span-2"
          />
          <Input
            label="Telefon"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="060 123 4567"
            value={fields.phone}
            onChange={set("phone")}
            error={errors.phone}
          />
          <Input
            label="Imejl"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={fields.email}
            onChange={set("email")}
            error={errors.email}
            hint="Za slučaj da moramo da vas potražimo oko dostave."
          />
          <Input
            label="Adresa"
            autoComplete="street-address"
            placeholder="Ulica i broj, stan"
            value={fields.address}
            onChange={set("address")}
            error={errors.address}
            className="md:col-span-2"
          />
          <Input
            label="Grad"
            autoComplete="address-level2"
            value={fields.city}
            onChange={set("city")}
            error={errors.city}
          />
          <Input
            label="Poštanski broj"
            numeric
            autoComplete="postal-code"
            placeholder="11070"
            value={fields.postalCode}
            onChange={set("postalCode")}
            error={errors.postalCode}
          />
          <Input
            label="Napomena za kurira"
            value={fields.note}
            onChange={set("note")}
            error={errors.note}
            hint="Sprat, interfon, kad ste kod kuće. Nije obavezno."
            className="md:col-span-2"
          />
        </div>

        <PaymentChoice value={payment} onChange={setPayment} ipsAvailable={quote.ipsAvailable} />
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-lg border border-line bg-bg-elev p-6">
          <h2 className="text-h3 text-fg">Vaša porudžbina</h2>
          <ul className="mt-4 space-y-2 border-b border-line pb-4">
            {quote.lines.map((l) => (
              <li key={l.slug} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 text-fg">
                  {l.name}
                  <span className="num text-fg-muted"> × {l.qty}</span>
                </span>
                <span className="num shrink-0 font-semibold text-fg">{formatRsd(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <CartTotals quote={quote} />
          </div>

          {serverError ? (
            <p role="alert" className="mt-5 rounded-sm border border-danger p-3 text-sm text-danger-text">
              {serverError}
            </p>
          ) : null}

          <p className="mt-6">
            <Button type="submit" size="lg" className="w-full" loading={sending} disabled={quote.lines.length === 0}>
              Pošaljite porudžbinu
            </Button>
          </p>
          <p className="mt-3 text-caption text-fg-muted">
            Slanjem porudžbine pristajete da vas kontaktiramo radi dostave.
          </p>
        </div>
      </aside>
    </form>
  );
}

function CheckoutWithQuote({ onPlaced }: { onPlaced: (order: PlacedOrder) => void }) {
  const { items } = useCart();
  const quote = useQuery(api.orders.quote, { items: items.map((i) => ({ slug: i.slug, qty: i.qty })) });

  if (quote === undefined) {
    return (
      <p className="mt-10 text-fg-muted" aria-live="polite">
        Zbir se učitava…
      </p>
    );
  }
  if (quote.lines.length === 0) {
    return (
      <div className="mt-10 rounded-lg border border-line bg-bg-elev p-8 text-center">
        <p className="text-base text-fg">U korpi nema nijednog proizvoda koji možemo da naplatimo.</p>
        <p className="mt-6">
          <Button as="a" href="/shop">
            Nazad u katalog
          </Button>
        </p>
      </div>
    );
  }
  return <Form quote={quote} onPlaced={onPlaced} />;
}

export function CheckoutView() {
  const { items, hydrated } = useCart();
  // Potvrda živi IZNAD korpe: kad se korpa isprazni posle slanja, broj
  // porudžbine mora da ostane na ekranu.
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  if (placed) return <OrderReceipt order={placed} />;
  if (!hydrated) {
    return (
      <p className="mt-10 text-fg-muted" aria-live="polite">
        Korpa se učitava…
      </p>
    );
  }
  if (!HAS_BACKEND) {
    return (
      <p className="mt-10 rounded-md border border-line bg-bg-sunken p-6 text-fg-muted">
        Naplata radi preko servera koji trenutno nije podešen. Pozovite salon i poručite telefonom.
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-lg border border-line bg-bg-elev p-8 text-center">
        <p className="text-base text-fg">Korpa je prazna.</p>
        <p className="mt-6">
          <Link href="/shop" className="font-semibold text-link underline underline-offset-4 focus-ring">
            Otvorite katalog
          </Link>
        </p>
      </div>
    );
  }
  return <CheckoutWithQuote onPlaced={setPlaced} />;
}
