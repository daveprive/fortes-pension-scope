# Pensioen-calculator

Een privacyvriendelijke, Nederlandstalige pensioen-calculator voor het lokaal
vergelijken van een progressieve leeftijdsstaffel en vlakke premiepercentages.
De calculator geeft indicatieve rekenresultaten, geen pensioenadvies.

## Privacy

Alle berekeningen vinden in de browser plaats. Er is geen backend, database,
telemetrie, analytics, cookie, tracking of automatische opslag. Invoer blijft
in React-state en verdwijnt bij verversen of afsluiten. De gebruiker kan zelf
een JSON-configuratie exporteren en later importeren.

## Functionaliteit (eerste versie)

- Pensioengevend salaris, franchise, pensioengrondslag en deeltijd.
- Progressieve staffel, vlakke premie of handmatige maandpremie.
- Werkgevers- en werknemersbijdrage.
- Maandelijkse projectie met effectief maandrendement, kosten en inflatie.
- Meerdere rendementsscenario's en equivalent vlak premiepercentage.
- Kapitaalgrafiek, jaaraggregatie in de engine en Excel-export.
- Gevalideerde JSON-configuratie en printvriendelijke basisweergave.

## Lokaal starten

```bash
npm install
npm run dev
```

Kwaliteitscontroles:

```bash
npm run lint
npm run test
npm run build
```

## Berekeningen

Zie [CALCULATION.md](CALCULATION.md) voor de exacte formules,
rendementsvolgorde en afrondstrategie. De berekeningen staan als pure
TypeScript-functies in `src/calculation/`; de React-interface bevat geen
financiële berekeningslogica.

## GitHub Pages

De workflow in `.github/workflows/deploy-pages.yml` draait `npm ci`, lint,
tests en productiebuild voordat hij publiceert. Activeer onder **Settings →
Pages** de bron **GitHub Actions**. De Vite-base wordt in GitHub Actions
automatisch ingesteld op `/fortes-pension-scope/`.

GitHub Pages voor private repositories is afhankelijk van het GitHub-abonnement
en de organisatie-instellingen. Controleer die instellingen vóór publicatie.

## Structuur

```text
src/calculation/  Pure domeinlogica en types
src/export/       JSON-validatie en Excel-export
src/formatting/   Nederlandse presentatieformatters
src/tests/        Testconfiguratie
```

## Beperkingen en disclaimer

De toepassing modelleert uitsluitend de ingevoerde gegevens en aannames.
Werkelijke pensioenuitkomsten kunnen afwijken door rendementen,
salarisontwikkeling, franchise, kosten, fiscale regelgeving,
pensioenreglementen en wijzigingen in wet- en regelgeving. Dit is geen
financieel, fiscaal, juridisch of pensioenadvies.
