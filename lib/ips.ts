/**
 * IPS QR kod po standardu Narodne banke Srbije.
 *
 * Format:
 *   K:PR|V:01|C:1|R:<racun>|N:<primalac>|I:RSD<iznos>,00|SF:<sifra>|S:<svrha>|RO:00<poziv na broj>
 *
 * Podaci primaoca stižu iz dva izvora, env ima prednost nad `data/site.json`:
 *   IPS_RECIPIENT_ACCOUNT, IPS_RECIPIENT_NAME, IPS_RECIPIENT_ADDRESS,
 *   IPS_RECIPIENT_CITY, IPS_PAYMENT_CODE
 * U repozitorijumu je račun prazan i označen sa [POTVRDITI] — dok se ne popuni,
 * `readIpsConfig()` vraća `null`, `buildIpsPaymentDetails()` vraća `null`,
 * i sajt nudi samo plaćanje pouzećem. Broj računa se ne izmišlja.
 *
 * BEZ React importa, BEZ `@/` aliasa i BEZ Node API-ja — uvozi ga i Convex backend.
 * Sam QR se crta drugde (`qrcode`); ovde se pravi samo tekstualni sadržaj.
 */
import { site } from "./site";
import { buildPaymentPurpose, buildPaymentReference, toAscii } from "./ips-purpose";

export const IPS_MAX_PAYLOAD_BYTES = 331;
const DEFAULT_PAYMENT_CODE = "289";
/** Tag N po IPS standardu prima najviše 70 karaktera za sva tri reda zajedno. */
const RECIPIENT_BLOCK_MAX_LENGTH = 70;

export type IpsConfig = {
  readonly account: string;
  readonly recipientName: string;
  readonly recipientAddress: string;
  readonly recipientCity: string;
  /** Naziv, adresa i grad spojeni prelomom reda — tačno ono što ide u tag N. */
  readonly recipientBlock: string;
  readonly paymentCode: string;
};

export type IpsPaymentDetails = {
  readonly payload: string;
  readonly formattedAccount: string;
  readonly recipientName: string;
  readonly amountRsd: number;
  readonly purpose: string;
  readonly reference: string;
  readonly paymentCode: string;
};

/** Račun mora da bude tačno 18 cifara, bez crtica i razmaka. */
function normalizeAccount(raw: string | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length === 18 ? digits : null;
}

/** Prikaz računa u uobičajenom obliku 000-0000000000000-00. */
export function formatAccount(account: string): string {
  if (account.length !== 18) return account;
  return `${account.slice(0, 3)}-${account.slice(3, 16)}-${account.slice(16)}`;
}

/**
 * Tag C:1 znači UTF-8, pa dijakritici u imenu primaoca smeju da ostanu — ime mora
 * da odgovara zapisu u banci. Uklanjaju se samo znaci koji bi razbili sam format:
 * uspravna crta (razdvaja tagove) i prelom reda (razdvaja redove unutar taga N).
 */
function sanitizeRecipientPart(value: string | undefined, max: number): string {
  const cleaned = (value ?? "")
    .replace(/[|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  // Nepopunjen podatak iz data/site.json nikad ne ulazi u nalog za plaćanje.
  return cleaned.includes("[POTVRDITI]") ? "" : cleaned;
}

/**
 * Naziv primaoca sme da ima do tri reda (naziv, adresa, grad). Ako sve ne stane
 * u 70 karaktera, prvo otpada adresa, pa grad — naziv se nikad ne skraćuje.
 */
function buildRecipientBlock(name: string, address: string, city: string): string {
  for (const parts of [[name, address, city], [name, city], [name]]) {
    const block = parts.filter((part) => part.length > 0).join("\n");
    if (block.length > 0 && block.length <= RECIPIENT_BLOCK_MAX_LENGTH) return block;
  }
  return name.slice(0, RECIPIENT_BLOCK_MAX_LENGTH);
}

/** Convex i Next oba imaju `process.env`; u browseru ga nema, pa se čita odbrambeno. */
function env(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

export function readIpsConfig(): IpsConfig | null {
  const fallback = site.payment.ips;
  const account = normalizeAccount(env("IPS_RECIPIENT_ACCOUNT") ?? fallback.account);
  const recipientName = sanitizeRecipientPart(
    env("IPS_RECIPIENT_NAME") ?? fallback.recipientName,
    RECIPIENT_BLOCK_MAX_LENGTH,
  );
  if (!account || recipientName.length === 0) return null;

  const recipientAddress = sanitizeRecipientPart(
    env("IPS_RECIPIENT_ADDRESS") ?? fallback.recipientAddress,
    RECIPIENT_BLOCK_MAX_LENGTH,
  );
  const recipientCity = sanitizeRecipientPart(
    env("IPS_RECIPIENT_CITY") ?? fallback.recipientCity,
    RECIPIENT_BLOCK_MAX_LENGTH,
  );
  const rawCode = (env("IPS_PAYMENT_CODE") ?? fallback.paymentCode ?? DEFAULT_PAYMENT_CODE).replace(/\D/g, "");

  return {
    account,
    recipientName,
    recipientAddress,
    recipientCity,
    recipientBlock: buildRecipientBlock(recipientName, recipientAddress, recipientCity),
    paymentCode: rawCode.length === 3 ? rawCode : DEFAULT_PAYMENT_CODE,
  };
}

/** Da li uopšte smemo da ponudimo IPS kao način plaćanja. */
export function isIpsConfigured(): boolean {
  return readIpsConfig() !== null;
}

/** IPS traži zarez kao decimalni separator i bez separatora hiljada. */
function formatIpsAmount(amount: number): string {
  return `${Math.max(0, Math.round(amount))},00`;
}

export function buildIpsPayload(options: {
  config: IpsConfig;
  amountRsd: number;
  purpose: string;
  reference: string;
}): string {
  const { config, amountRsd, purpose, reference } = options;
  const payload = [
    "K:PR",
    "V:01",
    "C:1",
    `R:${config.account}`,
    `N:${config.recipientBlock}`,
    `I:RSD${formatIpsAmount(amountRsd)}`,
    `SF:${config.paymentCode}`,
    `S:${purpose}`,
    `RO:00${reference}`,
  ].join("|");

  const byteLength = new TextEncoder().encode(payload).length;
  if (byteLength > IPS_MAX_PAYLOAD_BYTES) {
    throw new Error(`IPS QR sadržaj je predugačak (${byteLength} B, dozvoljeno ${IPS_MAX_PAYLOAD_BYTES} B).`);
  }
  return payload;
}

/** `null` kad IPS nije podešen ili je iznos nula — tada se nudi samo pouzeće. */
export function buildIpsPaymentDetails(options: {
  amountRsd: number;
  orderNumber: string;
  productShortNames: readonly string[];
  purpose?: string;
  reference?: string;
}): IpsPaymentDetails | null {
  const config = readIpsConfig();
  if (!config) return null;

  const amountRsd = Math.max(0, Math.round(options.amountRsd));
  if (amountRsd <= 0) return null;

  const purpose = toAscii(options.purpose ?? "") || buildPaymentPurpose([...options.productShortNames]);
  const reference = (options.reference ?? "").replace(/\D/g, "") || buildPaymentReference(options.orderNumber);

  return {
    payload: buildIpsPayload({ config, amountRsd, purpose, reference }),
    formattedAccount: formatAccount(config.account),
    recipientName: config.recipientName,
    amountRsd,
    purpose,
    reference,
    paymentCode: config.paymentCode,
  };
}
