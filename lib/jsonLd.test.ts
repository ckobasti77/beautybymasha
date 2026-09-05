import { describe, expect, it } from "vitest";
import { localBusinessJsonLd, locationId, organizationJsonLd, websiteJsonLd } from "./jsonLd";
import { locationByKey, locations, site } from "./site";

/**
 * Struktuirani podaci se ne vide na ekranu, pa greška u njima ostaje tiha mesecima.
 * Ovi testovi hvataju baš ono što bi tiho palo: pogrešan broj entiteta, izgubljeno
 * „zatvoreno ponedeljkom", i izmišljene koordinate.
 */

type OpeningHours = { dayOfWeek: string; opens: string; closes: string };

function hoursFor(key: "ljubicica" | "mimoza"): OpeningHours[] {
  return localBusinessJsonLd(locationByKey(key)).openingHoursSpecification as OpeningHours[];
}

describe("localBusinessJsonLd", () => {
  it("daje po jedan BeautySalon entitet za svaki lokal, sa različitim @id i adresom", () => {
    const entities = locations.map(localBusinessJsonLd);
    expect(entities).toHaveLength(2);
    expect(new Set(entities.map((e) => e["@id"])).size).toBe(2);
    expect(new Set(entities.map((e) => e.address.streetAddress)).size).toBe(2);
    for (const e of entities) expect(e["@type"]).toBe("BeautySalon");
  });

  it("Mimoza ponedeljkom ne radi — i to piše u schemi, ne izostaje iz nje", () => {
    const monday = hoursFor("mimoza").filter((h) => h.dayOfWeek === "Monday");
    expect(monday).toHaveLength(1);
    expect(monday[0]).toMatchObject({ opens: "00:00", closes: "00:00" });
  });

  it("Ljubičica ponedeljkom radi", () => {
    const monday = hoursFor("ljubicica").filter((h) => h.dayOfWeek === "Monday");
    expect(monday).toHaveLength(1);
    expect(monday[0].opens).toBe("09:00");
    expect(monday[0].closes).toBe("21:00");
  });

  it("pokriva svih sedam dana u oba lokala", () => {
    for (const l of locations) {
      const days = (localBusinessJsonLd(l).openingHoursSpecification as OpeningHours[]).map((h) => h.dayOfWeek);
      expect(new Set(days).size).toBe(7);
    }
  });

  it("razdvaja poštanski broj od mesta", () => {
    const address = localBusinessJsonLd(locationByKey("ljubicica")).address;
    expect(address.postalCode).toBe("11070");
    expect(address.addressLocality).toBe("Novi Beograd");
    expect(address.addressCountry).toBe("RS");
  });

  it("nema geo koordinate — nisu potvrđene i ne izmišljaju se", () => {
    expect(localBusinessJsonLd(locationByKey("mimoza"))).not.toHaveProperty("geo");
  });

  it("NAP je doslovno isti kao u data/site.json", () => {
    for (const l of locations) {
      const e = localBusinessJsonLd(l);
      expect(e.name).toBe(l.fullName);
      expect(e.telephone).toBe(l.phone.href.replace("tel:", ""));
    }
  });
});

describe("organizationJsonLd i websiteJsonLd", () => {
  it("organizacija pokazuje na oba lokala, a lokali nazad na nju", () => {
    const org = organizationJsonLd();
    expect(org.subOrganization.map((s) => s["@id"])).toEqual(locations.map(locationId));
    for (const l of locations) {
      expect(localBusinessJsonLd(l).parentOrganization["@id"]).toBe(org["@id"]);
    }
  });

  it("sajt je na srpskoj latinici i izdavač mu je organizacija", () => {
    const web = websiteJsonLd();
    expect(web.inLanguage).toBe(site.lang);
    expect(web.publisher["@id"]).toBe(organizationJsonLd()["@id"]);
  });
});
