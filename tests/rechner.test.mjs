// Tests der Rechenlogik (js/rechner.js) mit dem eingebauten Test-Runner von Node.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// rechner.js ist ein klassisches Browser-Skript; Funktionen in einem eigenen Kontext laden
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../js/rechner.js', import.meta.url), 'utf8') +
  ';this.computeScenario=computeScenario;this.computeRendite=computeRendite;this.sonstEinnahme=sonstEinnahme;this.steuerEinordnung=steuerEinordnung;', ctx);

const massnahme = (id, kat, brutto, leistung, zahlung = leistung, extra = {}) =>
  ({ id, bez: id, kat, brutto, ust: 19, leistung, zahlung, verteil: 1, nd: 10, ...extra });

const basis = (extra = {}) => ({
  kaufpreis: 300000, grundanteil: 25, lifetime: 50, maklerPct: 0, notarKaufPct: 0.015, notarGsPct: 0.005,
  gutachten: 0, sonstPlus: 0, sonstAlle: 3, gstPct: 0.06, nkUmlJahr: 2650, nkNuJahr: 1650, nkInstJahr: 900,
  darlehen: 250000, zinsPct: 0.038, tilgPct: 0.02, qm: 75, baseMietqm: 12, steuersatz: 0.42, sonstEin: 0,
  kaufDate: new Date('2026-01-15'), einzugDate: new Date('2026-04-01'), wertzuwachsPct: 0.02, marktpreisQm: 4000,
  wertMode: 'rate', miete: { modus: 'fix', indexRate: 2, staffeln: [], basis: 12 }, investitionen: [],
  massnahmen: [], kaufStr: '2026-01-15', vorAnschaffung: 'position', ...extra
});

test('Gebäude-AfA im Kaufjahr zeitanteilig, danach voll', () => {
  const p = basis({ kaufDate: new Date('2026-10-01'), kaufStr: '2026-10-01' });
  const r = computeScenarioAus(p);
  const gebAK = (300000 + 300000 * (0.015 + 0.06)) * 0.75;
  assert.ok(Math.abs(r.gebwert - gebAK) < 0.01);
  assert.ok(Math.abs(r.yd[0].afaAkt - gebAK / 50 * 3 / 12) < 0.01);
  assert.ok(Math.abs(r.yd[1].afaAkt - gebAK / 50) < 0.01);
});

test('Grundschuldkosten gehören nicht zur Gebäudebasis, sind aber im Kaufjahr abziehbar', () => {
  const r = computeScenarioAus(basis({ gutachten: 1000 }));
  assert.ok(Math.abs(r.wkEinmalig - (300000 * 0.005 + 1000)) < 0.01);
  assert.equal(r.yd[0].wkEin, r.wkEinmalig);
  assert.equal(r.yd[1].wkEin, 0);
});

test('15-%-Grenze: nur Erhaltungsaufwand nach dem Übergang, netto', () => {
  const p = basis({ massnahmen: [
    massnahme('vorher', 'erhalt', 11900, '2026-01-10'),
    massnahme('nachher', 'erhalt', 11900, '2026-02-01'),
    massnahme('kueche', 'wg', 11900, '2026-02-01')
  ] });
  const st = computeScenarioAus(p).steuer;
  assert.ok(Math.abs(st.topf - 10000) < 0.01);
  assert.equal(st.ueber, false);
  assert.equal(st.wkKaufjahr, 23800);
});

test('Über der Grenze wird der gesamte Erhaltungsaufwand im Topf zu anschaffungsnahen HK', () => {
  const p = basis({ massnahmen: [massnahme('gross', 'erhalt', 60000, '2026-02-01')] });
  const r = computeScenarioAus(p);
  assert.equal(r.steuer.ueber, true);
  assert.equal(r.steuer.ank, 60000);
  assert.equal(r.yd[0].wkEr, 0);
});

test('Option „Finanzamt zählt Arbeiten vor dem Übergang zur Grenze“', () => {
  const m = [massnahme('vorher', 'erhalt', 59500, '2026-01-10')];
  assert.equal(computeScenarioAus(basis({ massnahmen: m })).steuer.ueber, false);
  const b = computeScenarioAus(basis({ massnahmen: m, vorAnschaffung: 'topf' })).steuer;
  assert.equal(b.ueber, true);
  assert.equal(b.ank, 59500);
});

test('§ 82b verteilt Erhaltungsaufwand gleichmäßig', () => {
  const p = basis({ massnahmen: [massnahme('bad', 'erhalt', 10000, '2026-02-01', '2026-02-15', { verteil: 4 })] });
  const yd = computeScenarioAus(p).yd;
  assert.deepEqual(Array.from(yd.slice(0, 5), d => Math.round(d.wkEr)), [2500, 2500, 2500, 2500, 0]);
});

test('Einbauküche: eigene AfA monatsgenau ab Lieferung', () => {
  const p = basis({ massnahmen: [massnahme('kueche', 'wg', 12000, '2026-11-05')] });
  const yd = computeScenarioAus(p).yd;
  assert.ok(Math.abs(yd[0].afaWG - 200) < 0.01);
  assert.ok(Math.abs(yd[1].afaWG - 1200) < 0.01);
});

test('Sonstige Einnahmen steigen alle n Jahre ab Einzug', () => {
  const p = basis({ sonstEin: 70, sonstPlus: 10, sonstAlle: 3 });
  assert.deepEqual([0, 35, 36, 72].map(m => ctx.sonstEinnahme(m, p)), [70, 70, 80, 90]);
});

test('Sanierung zählt zur Investition, nicht zusätzlich zum Cashflow', () => {
  const ohne = computeScenarioAus(basis());
  const mit = computeScenarioAus(basis({ massnahmen: [massnahme('maler', 'erhalt', 5000, '2026-02-01')] }));
  assert.equal(mit.investSum - ohne.investSum, 5000);
  assert.equal(mit.ek - ohne.ek, 5000);
  assert.equal(mit.yd[0].cfV, ohne.yd[0].cfV);
});

function computeScenarioAus(p) { return ctx.computeScenario(p); }
