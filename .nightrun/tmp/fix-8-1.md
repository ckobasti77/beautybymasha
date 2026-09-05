Prethodni korak nije prosao provere. Padaju: build.

Pokreni ih sam, procitaj greske i POPRAVI ih. Ne dodaj nove funkcionalnosti i ne
prepravljaj ono sto vec radi - samo dovedi ovo do zelenog:

  npx convex dev --once
  npm run typecheck
  npm run lint      (nula upozorenja)
  npm test
  npm run build

Ako test pada zato sto je test pogresan a kod tacan, popravi test i objasni zasto u
docs/STATUS.md. Ako ne mozes da popravis, upisi u docs/STATUS.md tacno sta si probao
i sta je ostalo slomljeno, pa stani.