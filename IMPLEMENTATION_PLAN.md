# Implementatieplan — pensioen-calculator

## Doel

Een volledig statische, Nederlandstalige React-app die pensioenpremies en
scenario's lokaal in de browser doorrekent. Er is geen backend, analytics,
tracking of automatische opslag van invoer.

## Uitgangspunten

- Alle domeinberekeningen worden pure TypeScript-functies buiten React.
- Bedragen worden intern met hoge precisie berekend en pas bij presentatie
  afgerond/geformatteerd.
- Persoonsgegevens blijven uitsluitend in React-state, tenzij de gebruiker
  expliciet een configuratiebestand downloadt of importeert.
- Resultaten zijn indicatief en bevatten steeds een neutrale disclaimer.

## Fasering

### 1. Projectbasis en kwaliteitsborging

- Vite, React, strict TypeScript, MUI, Vitest, Testing Library en linting
  configureren.
- Basisdocumentatie, privacyverklaring, formatters en domeintypes toevoegen.
- GitHub Pages-buildinstelling en CI-workflow voorbereiden.

### 2. Calculation engine

- Pensioengevend salaris, franchise, pensioengrondslag en deeltijdlogica.
- Leeftijdsbepaling, dynamische progressieve staffel en vlakke premie.
- Werkgevers-/werknemersbijdragen, maandelijkse projectie, rendement, kosten
  en inflatiecorrectie.
- Equivalent vlak percentage (nominaal en op eindkapitaal) via binary search.
- Jaaraggregatie en volledige maanddetails.

### 3. Tests en formuledocumentatie

- Unit- en regressietests voor alle kernformules en randgevallen.
- `CALCULATION.md` met formules, volgorde van rendement en afrondstrategie.

### 4. Invoer en resultateninterface

- Responsive MUI-formulieren met contextuele validatie.
- Huidige regeling, staffel, aannames en dynamische vlakke- en
  rendementsscenario's.
- Transparante premievergelijking, samenvatting, tabellen en neutrale analyse.

### 5. Visualisatie en rapportage

- MUI X Charts met scenarioselectie en consistente neutrale kleuren.
- Jaar- en optioneel maandoverzicht.
- Printvriendelijke rapportweergave met print-CSS.

### 6. Uitwisseling en oplevering

- Excel-export vanuit berekende gegevens.
- Versiegebonden JSON-export/import met validatie.
- Resetbevestiging, toegankelijkheidscontrole, responsive controle en README.
- GitHub Actions: lint, test, build en Pages-deployment.

## Belangrijke rekenkeuzes die zichtbaar worden gedocumenteerd

- Maandrendement: `(1 + jaarrendement)^(1/12) - 1`.
- Per maand: beginwaarde, rendement, premie-inleg, eindwaarde.
- Salaris- en franchisegroei worden onafhankelijk toegepast op de gekozen
  jaarlijkse ingangsdatum.
- Voor resultaten wordt niet tussentijds op centen afgerond; weergave/export
  gebruiken expliciete afronding en Nederlandse notatie.

## Acceptatie per fase

Elke fase is pas afgerond wanneer TypeScript, linting, tests en productiebuild
slagen. Een mogelijke pensioeninhoudelijke aanname wordt altijd configureerbaar
gemaakt of duidelijk in interface en documentatie vermeld.
