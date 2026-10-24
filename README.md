# Immobilien-Simulator

Ein Rechner im Browser für vermietete Eigentumswohnungen in Deutschland. Er spielt durch, was Kauf, Finanzierung, Sanierung und Vermietung über 10 Jahre bedeuten: wie viel monatlich übrig bleibt, wie sich die Steuer auswirkt und was die Wohnung später wert ist.

> **Keine Steuer- oder Rechtsberatung.** Der Simulator ist ein vereinfachtes Modell. Alle Ergebnisse sind Schätzungen ohne Gewähr. Die steuerliche Einordnung im Einzelfall klärt eine Steuerberatung.

## Was der Simulator kann

- **Cashflow und Rendite:** monatlicher Überschuss vor und nach Steuer, Eigenkapitalrendite, interner Zinsfuß (IRR), Wertentwicklung
- **Finanzierung:** fester Darlehensbetrag mit Annuität; das Eigenkapital ergibt sich aus der Gesamtinvestition
- **Miete:** Festmiete, Indexmiete oder Staffelmiete ab Einzug, dazu sonstige Einnahmen (z. B. Stellplatz) mit eigener Erhöhung
- **Steuer (vereinfacht):** Werbungskosten nach § 21 EStG, Gebäude-AfA monatsgenau, Kaufnebenkosten anteilig in der AfA-Basis, Grundschuldkosten sofort abziehbar
- **Sanierung steuerlich:** Maßnahmenliste mit Ausführungs- und Zahlungsdatum, 15-%-Grenze für anschaffungsnahe Herstellungskosten (§ 6 Abs. 1 Nr. 1a EStG) mit Ampel, Erhaltungsaufwand im Zahlungsjahr (§ 11 EStG), Verteilung nach § 82b EStDV, eigene Wirtschaftsgüter wie die Einbauküche
- **Szenarien für Arbeiten vor dem Übergang** (wählbar, Standard ist „je Maßnahme“): Sofortabzug nach der Linie des FG Rheinland-Pfalz (2 K 2304/17, umstritten), Einbeziehung in die 15-%-Grenze oder Anschaffungskosten bei fehlender Betriebsbereitschaft
- **Szenarien speichern und vergleichen:** im Browser oder als JSON-Datei; der Vergleich zeigt die wichtigsten Kennzahlen nebeneinander
- **Handy:** als App zum Home-Bildschirm hinzufügbar, mit Anleitung für Einsteiger

Grenzen: fester Grenzsteuersatz (keine Progression), keine Mietausfälle, keine Anschlussfinanzierung, keine Verkaufskosten.

## Benutzen

Keine Installation nötig. Entweder die veröffentlichte Seite öffnen oder lokal:

```bash
python3 -m http.server 8000
```

Dann http://localhost:8000 im Browser öffnen. Eingaben und Szenarien bleiben nur im eigenen Browser gespeichert; es werden keine Daten an einen Server geschickt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenaufbau und Beispielwerte der Eingabefelder |
| `css/style.css` | Gestaltung |
| `js/rechner.js` | Rechenlogik als reine Funktionen, ohne Zugriff auf die Seite |
| `js/ui.js` | Bedienung, Tabellen, Diagramme, Szenarien |
| `tests/` | Tests der Rechenlogik |

## Tests

```bash
node --test
```

Benötigt Node.js 18 oder neuer.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
