"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";

/** Kontrolna tabla: otvara Sheet (bottom sheet na mobilnom, modal na desktopu). */
export function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" magnetic={false} onClick={() => setOpen(true)}>
        Otvori sheet
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Podaci za termin"
        description="Na telefonu povucite nadole da zatvorite."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" magnetic={false} onClick={() => setOpen(false)}>
              Odustani
            </Button>
            <Button onClick={() => setOpen(false)}>Potvrdi</Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Ime i prezime" name="name" autoComplete="name" placeholder="Ana Anić" />
          <Input
            label="Telefon"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="064 000 0000"
            hint="Zovemo samo ako treba da pomerimo termin."
          />
        </form>
      </Sheet>
    </>
  );
}
