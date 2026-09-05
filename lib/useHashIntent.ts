import { useEffect, useRef } from "react";

export type IntentMeta = {
  /** `true` kad je vrednost pročitana iz URL-a pri montiranju, `false` kad stiže iz eventa. */
  initial: boolean;
};

type Options<T> = {
  event: string;
  parseHash: (hash: string) => T | null;
  fromEvent: (e: CustomEvent) => T | null;
  onIntent: (value: T, meta: IntentMeta) => void;
};

/**
 * Sekcija koja prima deep link (`lib/sectionIntent.ts`): pri montiranju pročita
 * `location.hash`, a posle sluša svoj `bbm:*` event i `hashchange` (nazad/napred
 * između sidara, ručno ukucan hash — `replaceState` iz emitera ga NE okida, pa nema
 * dvostrukog rukovanja). Handler se drži u ref-u koji se osvežava posle svakog
 * rendera, pa event uvek vidi tekuće stanje komponente — bez ponovnog pretplaćivanja
 * i bez zastarelih closure-a.
 */
export function useHashIntent<T>(options: Options<T>): void {
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const { parseHash, onIntent, event } = latest.current;
    const initial = parseHash(window.location.hash);
    if (initial !== null) onIntent(initial, { initial: true });

    const onEvent = (e: Event) => {
      const value = latest.current.fromEvent(e as CustomEvent);
      if (value !== null) latest.current.onIntent(value, { initial: false });
    };
    const onHashChange = () => {
      const value = latest.current.parseHash(window.location.hash);
      if (value !== null) latest.current.onIntent(value, { initial: false });
    };
    window.addEventListener(event, onEvent);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener(event, onEvent);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
}
