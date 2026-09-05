import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

/**
 * `/admin` — panel salona.
 *
 * `noindex, nofollow`: panel ne sme u pretragu. Sam pristup podacima čuva Convex
 * (`assertAdmin` / `assertStaff` na svakom upitu i svakoj izmeni), a ne ova strana.
 *
 * `force-dynamic` jer ovde nema šta da se unapred iscrta — sve zavisi od toga ko je
 * prijavljen.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminApp />;
}
