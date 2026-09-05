// @vitest-environment edge-runtime
/// <reference types="vite/client" />
/**
 * Backend testovi (convex-test, u memoriji). Ovde se dokazuje aritmetika koja
 * se inače vidi tek kad dve mušterije dobiju isti termin:
 * kapacitet po lokalu i po resursu, radno vreme dva lokala, izuzeci, najava,
 * i to da otkazani termini oslobađaju mesto.
 *
 * Datumi se računaju od stvarnog „danas" (Europe/Belgrade) jer mutacije čitaju
 * Date.now(); biramo dan bar dva dana unapred da najava nikad ne smeta.
 */
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { ADMIN_MESSAGES } from "./lib/admin";
import { MESSAGES } from "./lib/validate";
import { addDays, belgradeNow, diffDays, toMin, weekdayOf } from "../lib/slots";

const modules = import.meta.glob("./**/*.ts");

const KEY = "test-admin-key";
const NOW = () => Date.now();

/** Prvi dan bar `minOffset` dana unapred sa zadatim danom u nedelji (0 = nedelja). */
function nextWeekday(weekday: number, minOffset = 2): string {
  let d = addDays(belgradeNow().date, minOffset);
  for (let i = 0; i < 7; i++) {
    if (weekdayOf(d) === weekday) return d;
    d = addDays(d, 1);
  }
  return d;
}

/**
 * Trenutak (ms) koji u Europe/Belgrade pada tacno na `date` u `minutes`.
 * Upiti primaju `now` kao argument, pa se ovim najava testira determinsticki,
 * nezavisno od toga u koje doba dana testovi zaista rade.
 */
function belgradeMs(date: string, minutes: number): number {
  let guess = Date.parse(`${date}T00:00:00Z`) + minutes * 60_000;
  for (let i = 0; i < 4; i++) {
    const got = belgradeNow(guess);
    const deltaMin = diffDays(got.date, date) * 24 * 60 + (minutes - got.minutes);
    if (deltaMin === 0) break;
    guess += deltaMin * 60_000;
  }
  return guess;
}

const SREDA = nextWeekday(3);
const PONEDELJAK = nextWeekday(1);

/** Kapacitet iz data/site.json: Ljubičica nokti 3, Mimoza nokti 2, masaža i kozmetika 1. */
const MANIKIR = "manikir"; // nokti, 45 min
const MASAZA = "masaza-terapeutska-30"; // masaža, 30 min
const OBRVE = "farbanje-obrva"; // kozmetika, 15 min

async function setup() {
  process.env.ADMIN_KEY = KEY;
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.init, { key: KEY });
  return t;
}

type Gost = { name: string; phone: string };
const gost = (n: number): Gost => ({ name: `Gost Broj${n}`, phone: `06400000${String(n).padStart(2, "0")}` });

function zahtev(
  overrides: Partial<{
    name: string;
    phone: string;
    serviceKey: string;
    locationKey: "ljubicica" | "mimoza";
    date: string;
    startMin: number;
  }> = {},
) {
  return {
    ...gost(1),
    serviceKey: MANIKIR,
    locationKey: "ljubicica" as const,
    date: SREDA,
    startMin: toMin("10:00"),
    ...overrides,
  };
}

describe("admin.init", () => {
  it("seeduje oba lokala, kapacitete, radno vreme i ceo cenovnik", async () => {
    const t = await setup();
    const status = await t.query(api.admin.status, { key: KEY });
    expect(status.seeded).toBe(true);
    expect(status.locations).toBe(2);
    expect(status.services).toBe(144);

    const capacities = await t.query(api.capacities.list, {});
    expect(capacities).toContainEqual({ locationKey: "ljubicica", resourceKey: "nokti", count: 3 });
    expect(capacities).toContainEqual({ locationKey: "mimoza", resourceKey: "nokti", count: 2 });
    expect(capacities).toContainEqual({ locationKey: "mimoza", resourceKey: "masaza", count: 1 });

    const settings = await t.query(api.settings.publicInfo, {});
    expect(settings).toMatchObject({ slotStepMin: 15, leadTimeMin: 120, horizonDays: 60, holdHours: 24 });
  });

  it("drugi poziv ne pravi duplikate i ne gazi izmene", async () => {
    const t = await setup();
    await t.mutation(api.capacities.set, { key: KEY, locationKey: "ljubicica", resourceKey: "nokti", count: 5 });
    await t.mutation(api.services.update, { key: KEY, serviceKey: MANIKIR, durationMin: 50 });

    const again = await t.mutation(api.admin.init, { key: KEY });
    expect(again).toEqual({ locations: 0, capacities: 0, schedules: 0, services: 0, settings: false });

    const status = await t.query(api.admin.status, { key: KEY });
    expect(status.services).toBe(144);
    expect(await t.query(api.capacities.list, {})).toContainEqual({
      locationKey: "ljubicica",
      resourceKey: "nokti",
      count: 5,
    });
    const manikir = (await t.query(api.services.list, {})).find((s) => s.key === MANIKIR);
    expect(manikir?.durationMin).toBe(50);
  });
});

describe("kapacitet", () => {
  it("tri manikira u 10:00 prolaze, ČETVRTI pada", async () => {
    const t = await setup();
    for (let i = 1; i <= 3; i++) {
      const res = await t.mutation(api.bookings.create, zahtev(gost(i)));
      expect(res.id).not.toBeNull();
      expect(res.resourceKey).toBe("nokti");
      expect(res.endMin).toBe(toMin("10:45"));
    }
    await expect(t.mutation(api.bookings.create, zahtev(gost(4)))).rejects.toThrow(MESSAGES.taken);

    const slots = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(slots.slots).not.toContain(toMin("10:00"));
    // svaki početak koji seče 10:00–10:45 je pun…
    expect(slots.slots).not.toContain(toMin("09:30"));
    expect(slots.slots).not.toContain(toMin("10:30"));
    // …a onaj koji ga samo dodiruje krajem nije
    expect(slots.slots).toContain(toMin("10:45"));
    expect(slots.slots).toContain(toMin("09:15"));
    await t.finishInProgressScheduledFunctions();
  });

  it("kapacitet je po RESURSU: puni nokti ne blokiraju masažu ni obrve", async () => {
    const t = await setup();
    for (let i = 1; i <= 3; i++) await t.mutation(api.bookings.create, zahtev(gost(i)));
    await expect(t.mutation(api.bookings.create, zahtev(gost(4)))).rejects.toThrow(MESSAGES.taken);

    const masaza = await t.mutation(api.bookings.create, zahtev({ ...gost(5), serviceKey: MASAZA }));
    expect(masaza.resourceKey).toBe("masaza");
    const obrve = await t.mutation(api.bookings.create, zahtev({ ...gost(6), serviceKey: OBRVE }));
    expect(obrve.resourceKey).toBe("kozmetika");

    // masaža ima kapacitet 1 — druga u isto vreme pada, ali nokti to ne osećaju
    await expect(t.mutation(api.bookings.create, zahtev({ ...gost(7), serviceKey: MASAZA }))).rejects.toThrow(
      MESSAGES.taken,
    );
    await t.finishInProgressScheduledFunctions();
  });

  it("kapacitet je po LOKACIJI: puna Ljubičica ne blokira Mimozu", async () => {
    const t = await setup();
    for (let i = 1; i <= 3; i++) await t.mutation(api.bookings.create, zahtev(gost(i)));
    await expect(t.mutation(api.bookings.create, zahtev(gost(4)))).rejects.toThrow(MESSAGES.taken);

    // Mimoza ima svoja 2 mesta za nokte
    const prvi = await t.mutation(api.bookings.create, zahtev({ ...gost(5), locationKey: "mimoza" }));
    expect(prvi.locationKey).toBe("mimoza");
    await t.mutation(api.bookings.create, zahtev({ ...gost(6), locationKey: "mimoza" }));
    await expect(t.mutation(api.bookings.create, zahtev({ ...gost(7), locationKey: "mimoza" }))).rejects.toThrow(
      MESSAGES.taken,
    );

    const ljubicica = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    const mimoza = await t.query(api.availability.slots, {
      locationKey: "mimoza",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(ljubicica.slots).not.toContain(toMin("10:00"));
    expect(mimoza.slots).not.toContain(toMin("10:00"));
    expect(mimoza.slots).toContain(toMin("10:45"));
    await t.finishInProgressScheduledFunctions();
  });

  it("otkazani i odbijeni termini NE zauzimaju kapacitet", async () => {
    const t = await setup();
    const a = await t.mutation(api.bookings.create, zahtev({ ...gost(1), serviceKey: MASAZA }));
    // masaža ima jedno mesto — dok prvi stoji, drugi ne može
    await expect(t.mutation(api.bookings.create, zahtev({ ...gost(2), serviceKey: MASAZA }))).rejects.toThrow(
      MESSAGES.taken,
    );

    await t.mutation(api.bookings.cancel, { key: KEY, id: a.id! });
    const b = await t.mutation(api.bookings.create, zahtev({ ...gost(2), serviceKey: MASAZA }));
    expect(b.id).not.toBeNull();

    await t.mutation(api.bookings.reject, { key: KEY, id: b.id! });
    const c = await t.mutation(api.bookings.create, zahtev({ ...gost(3), serviceKey: MASAZA }));
    expect(c.id).not.toBeNull();

    // potvrđen termin i dalje drži mesto
    await t.mutation(api.bookings.confirm, { key: KEY, id: c.id! });
    await expect(t.mutation(api.bookings.create, zahtev({ ...gost(4), serviceKey: MASAZA }))).rejects.toThrow(
      MESSAGES.taken,
    );
    await t.finishInProgressScheduledFunctions();
  });

  it("kapacitet 0 sklanja uslugu iz tog lokala", async () => {
    const t = await setup();
    await t.mutation(api.capacities.set, { key: KEY, locationKey: "mimoza", resourceKey: "masaza", count: 0 });
    const slots = await t.query(api.availability.slots, {
      locationKey: "mimoza",
      serviceKey: MASAZA,
      date: SREDA,
      now: NOW(),
    });
    expect(slots.slots).toEqual([]);
    expect(slots.open).toBe(true); // lokal radi, samo tu uslugu ne
    await expect(
      t.mutation(api.bookings.create, zahtev({ ...gost(1), locationKey: "mimoza", serviceKey: MASAZA })),
    ).rejects.toThrow(MESSAGES.taken);
  });
});

describe("radno vreme dva lokala", () => {
  it("Mimoza ponedeljkom nema nijedan slot, Ljubičica radi", async () => {
    const mimoza = await setup().then((t) =>
      t.query(api.availability.slots, {
        locationKey: "mimoza",
        serviceKey: MANIKIR,
        date: PONEDELJAK,
        now: NOW(),
      }),
    );
    expect(mimoza.open).toBe(false);
    expect(mimoza.slots).toEqual([]);

    const t = await setup();
    const ljubicica = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: PONEDELJAK,
      now: NOW(),
    });
    expect(ljubicica.open).toBe(true);
    expect(ljubicica.slots.length).toBeGreaterThan(0);

    await expect(
      t.mutation(api.bookings.create, zahtev({ locationKey: "mimoza", date: PONEDELJAK })),
    ).rejects.toThrow(MESSAGES.closed);
  });

  it("nedeljna traka razlikuje zatvoren dan od dana bez termina", async () => {
    const t = await setup();
    const nedelja = nextWeekday(0);
    const week = await t.query(api.availability.week, {
      locationKey: "mimoza",
      serviceKey: MANIKIR,
      fromDate: nedelja,
      now: NOW(),
    });
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ date: nedelja, open: true }); // nedelja 10–20
    expect(week[1].open).toBe(false); // ponedeljak
    expect(week[1].count).toBe(0);
  });

  it("scheduleOverride kind=off gasi ceo dan, custom ga otvara", async () => {
    const t = await setup();
    await t.mutation(api.schedules.upsertOverride, {
      key: KEY,
      locationKey: "ljubicica",
      date: SREDA,
      kind: "off",
      note: "godišnji",
    });
    const zatvoreno = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(zatvoreno.open).toBe(false);
    expect(zatvoreno.slots).toEqual([]);
    await expect(t.mutation(api.bookings.create, zahtev())).rejects.toThrow(MESSAGES.closed);

    // drugi lokal nije dirnut
    const mimoza = await t.query(api.availability.slots, {
      locationKey: "mimoza",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(mimoza.slots.length).toBeGreaterThan(0);

    // izuzetak sa posebnim vremenom ima prednost nad nedeljnim rasporedom
    await t.mutation(api.schedules.upsertOverride, {
      key: KEY,
      locationKey: "ljubicica",
      date: SREDA,
      kind: "custom",
      startMin: toMin("12:00"),
      endMin: toMin("15:00"),
    });
    const skraceno = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(skraceno.slots).not.toContain(toMin("10:00"));
    expect(skraceno.slots).toContain(toMin("12:00"));
    expect(skraceno.slots).not.toContain(toMin("14:30")); // 14:30 + 45 min > 15:00
    // i dalje tačno jedan izuzetak po lokalu i danu
    const overrides = await t.query(api.schedules.listOverrides, { key: KEY, from: SREDA, to: SREDA });
    expect(overrides).toHaveLength(1);
  });

  it("pauza gasi samo svoj resurs u svom lokalu", async () => {
    const t = await setup();
    await t.mutation(api.blocks.add, {
      key: KEY,
      locationKey: "ljubicica",
      resourceKey: "nokti",
      date: SREDA,
      startMin: toMin("10:00"),
      endMin: toMin("11:00"),
      reason: "dostava",
    });
    const nokti = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(nokti.slots).not.toContain(toMin("10:00"));
    expect(nokti.slots).toContain(toMin("11:00"));

    const masaza = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MASAZA,
      date: SREDA,
      now: NOW(),
    });
    expect(masaza.slots).toContain(toMin("10:00"));
  });
});

describe("najava i horizont", () => {
  it("leadTime 120 min ne nudi termin za 30 minuta unapred", async () => {
    const t = await setup();
    // podne u Ljubicici: radno vreme 09-21, najava 2 h -> najranije 14:00
    const podne = belgradeMs(SREDA, toMin("12:00"));
    const trazi = async () =>
      (
        await t.query(api.availability.slots, {
          locationKey: "ljubicica",
          serviceKey: MANIKIR,
          date: SREDA,
          now: podne,
        })
      ).slots;

    const saNajavom = await trazi();
    expect(saNajavom).not.toContain(toMin("12:30")); // 30 minuta unapred
    expect(saNajavom).not.toContain(toMin("13:45"));
    expect(saNajavom[0]).toBe(toMin("14:00"));

    await t.mutation(api.settings.update, { key: KEY, leadTimeMin: 0 });
    const bezNajave = await trazi();
    expect(bezNajave).toContain(toMin("12:30"));
    // bez najave najraniji termin je sam trenutak "sada", ne pocetak radnog vremena
    expect(bezNajave[0]).toBe(toMin("12:00"));
  });

  it("juceranji dan i dan u proslosti nemaju nijedan termin", async () => {
    const t = await setup();
    const juce = addDays(SREDA, -1);
    const slots = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: juce,
      now: belgradeMs(SREDA, toMin("12:00")),
    });
    expect(slots.slots).toEqual([]);
    expect(slots.open).toBe(true); // lokal tog dana radi, ali je dan prosao
  });

  it("dan iza horizonta se ne nudi i ne prima zahtev", async () => {
    const t = await setup();
    const daleko = addDays(belgradeNow().date, 61);
    const slots = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: daleko,
      now: NOW(),
    });
    expect(slots.slots).toEqual([]);
    await expect(t.mutation(api.bookings.create, zahtev({ date: daleko }))).rejects.toThrow(MESSAGES.horizon);
  });
});

describe("bookings.create — validacija", () => {
  let t: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    t = await setup();
  });

  it("upisuje zahtev na čekanju sa podacima iz baze, ne od klijenta", async () => {
    const res = await t.mutation(api.bookings.create, zahtev({ ...gost(1), phone: "064 145 10 64" }));
    const pending = await t.query(api.bookings.pending, { key: KEY });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      name: "Gost Broj1",
      phone: "0641451064",
      status: "nov",
      source: "web",
      serviceTitle: "Manikir",
      durationMin: 45,
      locationKey: "ljubicica",
      resourceKey: "nokti",
      startMin: toMin("10:00"),
      endMin: toMin("10:45"),
    });
    expect(res.id).toBe(pending[0]._id);
    expect(await t.query(api.bookings.pendingCount, { key: KEY })).toBe(1);
    await t.finishInProgressScheduledFunctions();
  });

  it("ime, telefon, imejl, prošli datum i nepoznata usluga se odbijaju", async () => {
    await expect(t.mutation(api.bookings.create, zahtev({ name: "A" }))).rejects.toThrow(MESSAGES.name);
    await expect(t.mutation(api.bookings.create, zahtev({ phone: "12" }))).rejects.toThrow(MESSAGES.phone);
    await expect(t.mutation(api.bookings.create, zahtev({ date: "2020-01-08" }))).rejects.toThrow(MESSAGES.datePast);
    await expect(t.mutation(api.bookings.create, zahtev({ date: "2026-13-45" }))).rejects.toThrow(MESSAGES.dateFormat);
    await expect(t.mutation(api.bookings.create, zahtev({ serviceKey: "nepostoji" }))).rejects.toThrow(
      MESSAGES.service,
    );
    await expect(
      t.mutation(api.bookings.create, { ...zahtev(), email: "nije-imejl" }),
    ).rejects.toThrow(MESSAGES.email);
  });

  it("početak van mreže ili van radnog vremena se odbija", async () => {
    await expect(t.mutation(api.bookings.create, zahtev({ startMin: toMin("10:07") }))).rejects.toThrow(MESSAGES.taken);
    await expect(t.mutation(api.bookings.create, zahtev({ startMin: toMin("07:00") }))).rejects.toThrow(MESSAGES.taken);
    await expect(t.mutation(api.bookings.create, zahtev({ startMin: 24 * 60 - 10 }))).rejects.toThrow(MESSAGES.range);
  });

  it("sakrivena usluga se ne nudi i ne prima zahteve, a admin je i dalje upisuje ručno", async () => {
    await t.mutation(api.services.setHidden, { key: KEY, serviceKey: MANIKIR, hidden: true });
    expect((await t.query(api.services.list, {})).some((s) => s.key === MANIKIR)).toBe(false);
    const slots = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(slots.slots).toEqual([]);
    await expect(t.mutation(api.bookings.create, zahtev())).rejects.toThrow(MESSAGES.service);

    const id = await t.mutation(api.bookings.createManual, {
      key: KEY,
      name: "Ručni Upis",
      serviceKey: MANIKIR,
      locationKey: "ljubicica",
      date: SREDA,
      startMin: toMin("10:00"),
    });
    expect(id).toBeTruthy();
  });

  it("honeypot vraća lažni uspeh bez upisa", async () => {
    const res = await t.mutation(api.bookings.create, { ...zahtev(), website: "http://spam.example" });
    expect(res.id).toBeNull();
    expect(await t.query(api.bookings.pendingCount, { key: KEY })).toBe(0);
  });

  it("rate limit: najviše 3 zahteva na sat po telefonu", async () => {
    await t.mutation(api.bookings.create, zahtev({ startMin: toMin("11:00") }));
    await t.mutation(api.bookings.create, zahtev({ startMin: toMin("13:00") }));
    await t.mutation(api.bookings.create, zahtev({ startMin: toMin("15:00") }));
    await expect(t.mutation(api.bookings.create, zahtev({ startMin: toMin("17:00") }))).rejects.toThrow(
      MESSAGES.rateLimit,
    );
    await t.finishInProgressScheduledFunctions();
  });
});

describe("admin", () => {
  let t: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    t = await setup();
  });

  it("pogrešan ključ se odbija svuda", async () => {
    await expect(t.query(api.bookings.pending, { key: "pogresan" })).rejects.toThrow(ADMIN_MESSAGES.badKey);
    await expect(t.query(api.bookings.list, { key: "", from: SREDA, to: SREDA })).rejects.toThrow(
      ADMIN_MESSAGES.badKey,
    );
    await expect(t.mutation(api.admin.init, { key: "" })).rejects.toThrow(ADMIN_MESSAGES.badKey);
    await expect(t.query(api.settings.get, { key: "x" })).rejects.toThrow(ADMIN_MESSAGES.badKey);
    await expect(
      t.mutation(api.capacities.set, { key: "x", locationKey: "mimoza", resourceKey: "nokti", count: 9 }),
    ).rejects.toThrow(ADMIN_MESSAGES.badKey);
    await expect(
      t.mutation(api.blocks.add, {
        key: "x",
        locationKey: "mimoza",
        resourceKey: "nokti",
        date: SREDA,
        startMin: 600,
        endMin: 660,
      }),
    ).rejects.toThrow(ADMIN_MESSAGES.badKey);
  });

  it("tranzicije statusa: nov → potvrđen → otkazan, a odbijen je kraj", async () => {
    const res = await t.mutation(api.bookings.create, zahtev());
    const id = res.id!;
    await t.mutation(api.bookings.confirm, { key: KEY, id });
    await expect(t.mutation(api.bookings.reject, { key: KEY, id })).rejects.toThrow(MESSAGES.transition);
    await t.mutation(api.bookings.cancel, { key: KEY, id });
    await expect(t.mutation(api.bookings.confirm, { key: KEY, id })).rejects.toThrow(MESSAGES.transition);

    const sve = await t.query(api.bookings.list, { key: KEY, from: SREDA, to: SREDA });
    expect(sve).toHaveLength(1);
    expect(sve[0].status).toBe("otkazan");
    expect(sve[0].decidedAt).toBeTypeOf("number");
    await t.finishInProgressScheduledFunctions();
  });

  it("ručni upis sme van radnog vremena, ali ne preko kapaciteta ni preko pauze", async () => {
    // 07:00 je van radnog vremena — vlasnica ipak sme
    const rano = await t.mutation(api.bookings.createManual, {
      key: KEY,
      name: "Rani Termin",
      serviceKey: MASAZA,
      locationKey: "ljubicica",
      date: SREDA,
      startMin: toMin("07:00"),
    });
    expect(rano).toBeTruthy();
    // masaža ima jedno mesto — drugi u isto vreme ne prolazi
    await expect(
      t.mutation(api.bookings.createManual, {
        key: KEY,
        name: "Drugi Termin",
        serviceKey: MASAZA,
        locationKey: "ljubicica",
        date: SREDA,
        startMin: toMin("07:00"),
      }),
    ).rejects.toThrow(MESSAGES.overlap);
    // odmah posle njega prolazi
    await t.mutation(api.bookings.createManual, {
      key: KEY,
      name: "Treci Termin",
      serviceKey: MASAZA,
      locationKey: "ljubicica",
      date: SREDA,
      startMin: toMin("07:30"),
    });

    await t.mutation(api.blocks.add, {
      key: KEY,
      locationKey: "ljubicica",
      resourceKey: "masaza",
      date: SREDA,
      startMin: toMin("12:00"),
      endMin: toMin("13:00"),
    });
    await expect(
      t.mutation(api.bookings.createManual, {
        key: KEY,
        name: "Preko Pauze",
        serviceKey: MASAZA,
        locationKey: "ljubicica",
        date: SREDA,
        startMin: toMin("12:30"),
      }),
    ).rejects.toThrow(MESSAGES.overlap);
  });

  it("move: termin ne blokira sam sebe, ali poštuje kapacitet na odredištu", async () => {
    const a = await t.mutation(api.bookings.create, zahtev({ ...gost(1), serviceKey: MASAZA }));
    // pomeranje na isto mesto prolazi — sopstveni termin se izuzima iz brojanja
    await t.mutation(api.bookings.move, { key: KEY, id: a.id!, startMin: toMin("10:00") });

    const b = await t.mutation(api.bookings.create, zahtev({ ...gost(2), serviceKey: MASAZA, startMin: toMin("14:00") }));
    // b na 10:00 bi bio drugi u jedinom mestu masaže
    await expect(t.mutation(api.bookings.move, { key: KEY, id: b.id!, startMin: toMin("10:00") })).rejects.toThrow(
      MESSAGES.overlap,
    );
    // u drugi lokal može
    await t.mutation(api.bookings.move, { key: KEY, id: b.id!, locationKey: "mimoza", startMin: toMin("10:00") });

    // otkazan termin se ne pomera
    await t.mutation(api.bookings.cancel, { key: KEY, id: b.id! });
    await expect(t.mutation(api.bookings.move, { key: KEY, id: b.id!, startMin: toMin("16:00") })).rejects.toThrow(
      MESSAGES.transition,
    );
    const posle = await t.query(api.bookings.list, { key: KEY, from: SREDA, to: SREDA, locationKey: "mimoza" });
    expect(posle).toHaveLength(1);
    expect(posle[0]).toMatchObject({ startMin: toMin("10:00"), endMin: toMin("10:30") });

    await t.finishInProgressScheduledFunctions();
  });

  it("promena kapaciteta odmah menja ponudu", async () => {
    for (let i = 1; i <= 3; i++) await t.mutation(api.bookings.create, zahtev(gost(i)));
    await expect(t.mutation(api.bookings.create, zahtev(gost(4)))).rejects.toThrow(MESSAGES.taken);
    await t.mutation(api.capacities.set, { key: KEY, locationKey: "ljubicica", resourceKey: "nokti", count: 4 });
    const res = await t.mutation(api.bookings.create, zahtev(gost(4)));
    expect(res.id).not.toBeNull();
    await t.finishInProgressScheduledFunctions();
  });

  it("izmena radnog vremena se odmah vidi u ponudi", async () => {
    await t.mutation(api.schedules.set, {
      key: KEY,
      locationKey: "ljubicica",
      weekday: weekdayOf(SREDA),
      ranges: [{ startMin: toMin("12:00"), endMin: toMin("16:00") }],
    });
    const slots = await t.query(api.availability.slots, {
      locationKey: "ljubicica",
      serviceKey: MANIKIR,
      date: SREDA,
      now: NOW(),
    });
    expect(slots.slots[0]).toBe(toMin("12:00"));
    expect(slots.slots).not.toContain(toMin("10:00"));
    expect((await t.query(api.settings.get, { key: KEY })).hoursConfirmed).toBe(true);
  });

  it("expirePending otkazuje samo zahteve starije od holdHours i oslobađa mesto", async () => {
    const a = await t.mutation(api.bookings.create, zahtev({ ...gost(1), serviceKey: MASAZA }));
    expect(await t.mutation(internal.bookings.expirePending, {})).toBe(0);

    await t.run(async (ctx) => {
      await ctx.db.patch("bookings", a.id!, { createdAt: Date.now() - 25 * 60 * 60 * 1000 });
    });
    expect(await t.mutation(internal.bookings.expirePending, {})).toBe(1);

    const sve = await t.query(api.bookings.list, { key: KEY, from: SREDA, to: SREDA });
    expect(sve[0]).toMatchObject({ status: "otkazan", note: "isteklo" });
    // mesto je oslobođeno
    const res = await t.mutation(api.bookings.create, zahtev({ ...gost(2), serviceKey: MASAZA }));
    expect(res.id).not.toBeNull();
    await t.finishInProgressScheduledFunctions();
  });

  it("purgeByPhone briše po broju, ali nikad ručne termine bez telefona", async () => {
    await t.mutation(api.bookings.create, zahtev(gost(1)));
    await t.mutation(api.bookings.createManual, {
      key: KEY,
      name: "Bez Telefona",
      serviceKey: MASAZA,
      locationKey: "ljubicica",
      date: SREDA,
      startMin: toMin("16:00"),
    });
    expect(await t.mutation(internal.bookings.purgeByPhone, { phone: "" })).toBe(0);
    expect(await t.mutation(internal.bookings.purgeByPhone, { phone: gost(1).phone })).toBe(1);
    const sve = await t.query(api.bookings.list, { key: KEY, from: SREDA, to: SREDA });
    expect(sve).toHaveLength(1);
    expect(sve[0].name).toBe("Bez Telefona");
    await t.finishInProgressScheduledFunctions();
  });
});
