# Immobilien-Simulator

**Ein freier Rechner im Browser für vermietete Eigentumswohnungen in Deutschland.**
Er spielt durch, was Kauf, Finanzierung, Sanierung und Vermietung über zehn Jahre bedeuten: wie viel Geld jeden Monat übrig bleibt, wie die Steuer wirkt, wie sich das eingesetzte Eigenkapital verzinst und was die Wohnung später wert ist.

**Direkt ausprobieren:** https://buggiplace.github.io/immobilien-simulator/

> **Keine Steuer- oder Rechtsberatung.** Der Simulator ist ein vereinfachtes Modell. Alle Ergebnisse sind Schätzungen ohne Gewähr, der Rechtsstand wird nicht laufend gepflegt. Die steuerliche Einordnung im Einzelfall klärt eine Steuerberatung.

---

## Inhalt

1. [Für wen ist der Rechner gedacht?](#für-wen-ist-der-rechner-gedacht)
2. [Funktionen im Überblick](#funktionen-im-überblick)
3. [Bedienung](#bedienung)
4. [So rechnet der Simulator](#so-rechnet-der-simulator)
5. [Kennzahlen](#kennzahlen)
6. [Grenzen und Annahmen](#grenzen-und-annahmen)
7. [Datenschutz](#datenschutz)
8. [Lokal starten, Tests, Aufbau](#lokal-starten-tests-aufbau)
9. [Mitmachen](#mitmachen)
10. [Lizenz und Haftungsausschluss](#lizenz-und-haftungsausschluss)

---

## Für wen ist der Rechner gedacht?

Für Privatleute, die eine Eigentumswohnung zur **Vermietung** kaufen oder schon gekauft haben und verstehen möchten, wie sich die Zahlen über die Jahre entwickeln. Der Rechner beantwortet vor allem diese Fragen:

- **Trägt sich die Wohnung?** Was bleibt im Schnitt pro Monat übrig, nachdem Rate, nicht umlagefähige Kosten und Steuer verrechnet sind?
- **Wie wirkt die Steuer?** Wie viel bringen Abschreibung, Zinsen und Sanierungskosten als Werbungskosten, und in welchem Jahr?
- **Lohnt sich das Eigenkapital?** Wie hoch ist die Gesamtrendite (interner Zinsfuß) einschließlich Wertentwicklung?
- **Wie entwickelt sich das Vermögen?** Wohnungswert, Restschuld und dein Anteil an der Wohnung nach zehn Jahren.
- **Wie werden Renovierungskosten steuerlich behandelt?** Sofort abziehbar oder über die Abschreibung, und wie nah liegt man an der 15-%-Grenze?

Vorwissen ist nicht nötig. Eine eingebaute **Anleitung** erklärt Bedienung und Begriffe in Alltagssprache, und kleine **ⓘ-Symbole** erklären Fachbegriffe direkt an Ort und Stelle.

## Funktionen im Überblick

**Eingaben**

| Bereich | Was sich einstellen lässt |
|---|---|
| Objekt | Wohnfläche, Übergang von Besitz und Nutzen (steuerlicher Anschaffungstag), Einzug des Mieters, Kaltmiete pro m², sonstige Einnahmen (z. B. Stellplatz) mit eigener Erhöhung alle *n* Jahre |
| Mietsteigerung | Festmiete, Indexmiete (jährliche Anpassung ab Mietbeginn) oder Staffelmiete (Stufen in Jahren nach Einzug) |
| Kauf | Kaufpreis, Anteil Grund und Boden, Nutzungsdauer bzw. AfA-Satz (2 %, 3 % oder 4 %) |
| Kaufnebenkosten | Makler, Notar/Grundbuch für den Kauf, Notar/Grundbuch für die Grundschuld, Gutachten u. Ä., Grunderwerbsteuer nach Bundesland mit zu zahlendem Anteil |
| Sanierung | Liste von Maßnahmen mit Bruttobetrag, Umsatzsteuersatz, Ausführungsdatum, Zahlungsdatum, steuerlicher Einordnung und optionaler Verteilung nach § 82b EStDV |
| Jahresinvestitionen | spätere Investitionen mit eigener Nutzungsdauer (z. B. Heizung, Fenster) |
| Finanzierung | fester Darlehensbetrag, Sollzins, anfängliche Tilgung; das Eigenkapital ergibt sich als Rest |
| Nebenkosten | umlagefähige Kosten (zahlt der Mieter) und nicht umlagefähige Kosten (Verwaltung, Instandhaltungsrücklage, Versicherung, Sonstiges) |
| Immobilienwert | Startwert aus Kaufpreis oder aus Marktpreis pro m², jährlicher Wertzuwachs |
| Steuer | persönlicher Grenzsteuersatz |

**Ergebnisse**

- Ergebnis-Karte „Monatlich übrig nach Steuer“ mit Einordnung in Worten, dazu die vier wichtigsten Kennzahlen und weitere zum Aufklappen
- Renditekennzahlen, Jahresübersicht, die ersten 36 Monate, Abschreibung, Sanierung steuerlich, Nebenkosten, Steuereffekt und Wertentwicklung als Tabellen
- zwei Diagramme: Cashflow über zehn Jahre sowie Immobilienwert, Restschuld und Eigenkapital
- eine **Ampel für die 15-%-Grenze** mit verbleibendem Spielraum und Fristende

**Szenarien und Vergleich**

- Den aktuellen Stand unter einem Namen speichern, später wieder laden, aktualisieren oder löschen
- **Vergleich A/B:** aktueller Stand und ausgewählte Szenarien nebeneinander, die jeweils besten Werte hervorgehoben
- **Als Datei speichern / aus Datei laden** (JSON), etwa als Sicherung oder um ein Szenario auf ein anderes Gerät mitzunehmen

**Komfort**

- Eingaben bleiben automatisch im Browser gespeichert, ein Knopf setzt alles auf die Beispielwerte zurück
- Anzeige der Veränderung gegenüber den Beispielwerten, auf dem Handy in einer mitlaufenden Ergebnisleiste
- für Handys optimiert und als App zum Home-Bildschirm hinzufügbar

## Bedienung

1. Die Seite öffnen. Sie startet mit **Beispielwerten**, die nur zur Orientierung dienen.
2. In den Bereichen links (auf dem Handy oben) die eigenen Werte eintragen. Jede Änderung wird sofort neu gerechnet.
3. Unter **Sanierung & Renovierung** die Maßnahmen einzeln erfassen. Für die Steuer zählen das **Ausführungsdatum** (15-%-Grenze) und das **Zahlungsdatum** (Abzugsjahr).
4. Über **Szenarien** oben rechts Varianten speichern, zum Beispiel „Wertzuwachs 1 %“ oder „Sanierung verteilt“, und im **Vergleich A/B** nebeneinanderstellen.
5. Wichtige Stände zusätzlich **als Datei speichern**, da der Browser-Speicher beim Löschen der Website-Daten verloren geht.

## So rechnet der Simulator

Die gesamte Rechenlogik steht in [`js/rechner.js`](js/rechner.js) und ist ohne Bezug zur Oberfläche geschrieben. Gerechnet werden zehn Kalenderjahre ab dem Kaufjahr; das Kaufjahr zählt ab dem Monat des Übergangs zeitanteilig.

### Finanzierung

- **Annuitätendarlehen:** Monatsrate = Darlehen × (Sollzins + anfängliche Tilgung) / 12. Zins und Tilgung werden Monat für Monat aus der Restschuld berechnet.
- **Eigenkapital** = Kaufpreis + Kaufnebenkosten + Sanierung + Gutachten − Darlehen. Teurere Sanierung erhöht also das Eigenkapital, nicht die Rate.
- Sanierungskosten sind Teil dieser Anfangsinvestition und werden nicht zusätzlich vom laufenden Cashflow abgezogen. Spätere **Jahresinvestitionen** dagegen werden im jeweiligen Jahr aus dem Cashflow bezahlt.

### Mieteinnahmen und Kosten

- Die Miete wird **monatsgenau ab Einzug** gerechnet. Staffeln und Indexanpassungen laufen ab Mietbeginn.
- Bis zum Einzug trägt der Eigentümer auch die **umlagefähigen Nebenkosten** (Leerstand).
- Die **Instandhaltungsrücklage** kostet Geld, ist aber nicht als Werbungskosten angesetzt, weil sie erst bei Verwendung abziehbar ist.

### Abschreibung (AfA)

- **Gebäude-Anschaffungskosten** = (Kaufpreis + Kaufnebenkosten ohne Grundschuldkosten) × Gebäudeanteil. Grund und Boden wird nicht abgeschrieben.
- Die Gebäude-AfA läuft linear mit dem gewählten Satz, im Kaufjahr **zeitanteilig ab dem Übergangsmonat**.
- **Aktivierte Sanierungskosten** (siehe unten) erhöhen die AfA-Basis: im Kaufjahr ebenfalls zeitanteilig, in späteren Jahren ab dem Jahr der Ausführung.
- **Eigene Wirtschaftsgüter** wie eine Einbauküche werden separat über ihre Nutzungsdauer abgeschrieben, monatsgenau ab Lieferung.
- **Jahresinvestitionen** werden über ihre jeweilige Nutzungsdauer abgeschrieben.

### Sanierung steuerlich

Jede Maßnahme wird einer von vier Kategorien zugeordnet:

| Kategorie | Behandlung im Rechner |
|---|---|
| Erhaltungsaufwand | sofort abziehbare Werbungskosten im Jahr der Zahlung (§ 11 EStG), optional gleichmäßig auf 2 bis 5 Jahre verteilt (§ 82b EStDV) |
| Anschaffungskosten (Betriebsbereitschaft) | erhöhen die Gebäude-AfA-Basis |
| Herstellungskosten (Standardhebung, Erweiterung) | erhöhen die Gebäude-AfA-Basis |
| Eigenes Wirtschaftsgut (z. B. Einbauküche) | eigene AfA über die Nutzungsdauer, zählt nicht zur 15-%-Grenze |

**15-%-Grenze (anschaffungsnahe Herstellungskosten, § 6 Abs. 1 Nr. 1a EStG):** Erhaltungsaufwand, der innerhalb von drei Jahren nach dem Übergang ausgeführt wird, wird **netto** (ohne Umsatzsteuer) gegen 15 % der Gebäude-Anschaffungskosten geprüft. Liegt die Summe darüber, wird dieser Aufwand **insgesamt** aktiviert und über die Gebäude-AfA abgeschrieben. Abzug und Abschreibung selbst rechnen mit dem **Bruttobetrag**, weil private Vermieter in der Regel keine Vorsteuer abziehen. Die Ampel steht unter 80 % auf Grün, bis 100 % auf Gelb, darüber auf Rot.

**Arbeiten vor dem Übergang:** Für Maßnahmen, die vor dem Übergang von Besitz und Nutzen ausgeführt wurden, lässt sich die Behandlung wählen:

| Option | Wirkung |
|---|---|
| Je Maßnahme (Standard) | die Einordnung der einzelnen Maßnahme gilt; Erhaltungsaufwand vor dem Übergang zählt nicht zur 15-%-Grenze |
| Sofortabzug vor Übergang (FG-Linie, umstritten) | Maßnahmen vor dem Übergang werden als Erhaltungsaufwand sofort abgezogen (angelehnt an FG Rheinland-Pfalz, 2 K 2304/17) |
| Finanzamt zählt sie zur 15-%-Grenze | Erhaltungsaufwand vor dem Übergang fließt mit in die 15-%-Prüfung |
| Nicht betriebsbereit: Anschaffungskosten | Erhaltungsaufwand vor dem Übergang wird als Anschaffungskosten aktiviert |

Ob und wie eine Option im Einzelfall zutrifft, ist eine Frage für die Steuerberatung. Der Rechner zeigt nur die Auswirkungen.

### Einmalige Werbungskosten im Kaufjahr

Die Kosten für die **Grundschuld** (Notar und Grundbuch) sowie **Gutachten** werden im Kaufjahr sofort als Werbungskosten angesetzt. Die übrigen Kaufnebenkosten gehören zu den Anschaffungskosten.

### Steuer

Steuerliche Einkünfte pro Jahr = Mieteinnahmen − Zinsen − AfA (Gebäude, eigene Wirtschaftsgüter, Jahresinvestitionen) − Erhaltungsaufwand − abziehbare Nebenkosten − einmalige Werbungskosten.

Die **Steuerwirkung** ist dieses Ergebnis mal dem eingegebenen Grenzsteuersatz. Ein Verlust führt zu einer Steuerersparnis, ein Gewinn zu Mehrsteuer. Es wird angenommen, dass Verluste vollständig mit anderen Einkünften verrechnet werden können.

### Wertentwicklung

Wohnungswert = Startwert × (1 + Wertzuwachs) ^ (vergangene Monate / 12). Der Startwert ist entweder der Kaufpreis oder Marktpreis pro m² × Wohnfläche.

## Kennzahlen

| Kennzahl | Bedeutung |
|---|---|
| Monatlich übrig nach Steuer | Durchschnitt des Cashflows nach Steuer über alle gerechneten Monate. Die Tilgung ist bereits abgezogen, obwohl sie Vermögen aufbaut. |
| Gesamtrendite (IRR) | Interner Zinsfuß auf das Eigenkapital: Start mit −Eigenkapital, dann die jährlichen Cashflows nach Steuer, im letzten Jahr zusätzlich Wohnungswert minus Restschuld |
| Vermögenszuwachs auf EK p. a. | jährliches Wachstum des Eigenkapitals aus Überschüssen, Tilgung und Wertentwicklung |
| Überschuss auf EK p. a. | durchschnittlicher jährlicher Cashflow nach Steuer im Verhältnis zum Eigenkapital, ohne Wertentwicklung |
| Dein Anteil nach 10 Jahren | Wohnungswert minus Restschuld |
| Brutto-Mietrendite | Jahreskaltmiete / Kaufpreis |
| Netto-Mietrendite | (Jahreskaltmiete − nicht umlagefähige Kosten) / Gesamtinvestition |
| Mietmultiplikator | Kaufpreis / Jahreskaltmiete |

## Grenzen und Annahmen

Der Simulator vereinfacht bewusst. Insbesondere gilt:

- **Fester Grenzsteuersatz:** keine Progression, kein Splittingtarif, kein separater Solidaritätszuschlag oder Kirchensteuer. Bei hohen Verlusten in einem einzelnen Jahr überschätzt der Rechner deshalb die Ersparnis.
- **Verluste** werden als vollständig verrechenbar angenommen.
- **Zehn Jahre** Betrachtungszeitraum; keine Anschlussfinanzierung nach Ende der Zinsbindung, keine Sondertilgungen.
- **Keine Mietausfälle**, keine Mietminderungen, keine Kosten für Neuvermietung.
- **Keine Verkaufskosten** und keine Besteuerung eines Verkaufsgewinns.
- Die steuerliche Einordnung von Sanierungsmaßnahmen hängt stark vom Einzelfall ab (Zustand beim Erwerb, Umfang der Maßnahmen, Zeitpunkte). Der Rechner zeigt Szenarien, keine verbindliche Einordnung.
- Gesetzeslage und Rechtsprechung werden nicht laufend nachgeführt.

## Datenschutz

- Der Simulator läuft **vollständig im Browser**. Es werden keine Eingaben an einen Server geschickt, es gibt kein Konto und kein Tracking.
- Eingaben und Szenarien liegen im **lokalen Speicher des Browsers** (Schlüssel beginnen mit `immo-sim-`). Sie verschwinden, wenn die Website-Daten gelöscht werden.
- Exportierte Dateien sind einfache JSON-Dateien und bleiben auf dem eigenen Gerät.

## Lokal starten, Tests, Aufbau

Keine Installation und kein Build nötig. Lokal genügt ein einfacher Webserver:

```bash
python3 -m http.server 8000
```

Dann http://localhost:8000 im Browser öffnen.

Tests der Rechenlogik (Node.js 18 oder neuer):

```bash
node --test
```

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenaufbau, Beispielwerte der Eingabefelder, Anleitung |
| `css/style.css` | Gestaltung, inklusive Handy-Ansicht |
| `js/rechner.js` | Rechenlogik als reine Funktionen ohne Zugriff auf die Seite |
| `js/ui.js` | Bedienung, Tabellen, Diagramme, Szenarien, Speichern |
| `tests/rechner.test.mjs` | Tests für AfA, 15-%-Grenze, § 82b, Einbauküche, Kaufnebenkosten und Cashflow |
| `manifest.json`, Icons | Installation als App auf dem Home-Bildschirm |

Es werden keine externen Bibliotheken geladen; die Diagramme sind mit dem Canvas des Browsers gezeichnet.

## Mitmachen

Fehler gefunden oder eine Idee? Gern ein **Issue** eröffnen. Bei Änderungen an der Rechenlogik bitte möglichst einen passenden Test in `tests/` ergänzen und kurz die Quelle (Gesetz, Verwaltungsanweisung, Urteil) nennen.

## Lizenz und Haftungsausschluss

Veröffentlicht unter der **MIT-Lizenz**, siehe [LICENSE](LICENSE).

Der Simulator dient der Orientierung und ersetzt **keine Steuer-, Rechts- oder Finanzberatung**. Für die Richtigkeit, Vollständigkeit und Aktualität der Berechnungen wird keine Gewähr übernommen. Entscheidungen auf Grundlage der Ergebnisse erfolgen auf eigene Verantwortung.
