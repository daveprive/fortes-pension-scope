# Rekenmethodiek

De calculator is indicatief. Alle bedragen worden met `decimal.js` op hoge
precisie berekend; alleen presentatie en export ronden bedragen af.

## Salaris en grondslag

`pensioengevend salaris = basissalaris + geselecteerd vakantiegeld + geselecteerde extra beloning + geselecteerde 13e maand + overige vaste beloning`.

`pensioengrondslag = max(0, pensioengevend salaris − franchise)`. Als de
regeling dat aangeeft wordt deze fulltime grondslag vermenigvuldigd met het
deeltijdpercentage.

## Premie

Een vlakke premie is `grondslag × percentage / 12`. Bij een staffel geldt het
percentage van de leeftijd op de eerste dag van de maand, of op de
premiedatum, volgens de gekozen instelling. De werknemersbijdrage wordt van
de totale premie afgetrokken; het restant is de werkgeversbijdrage.

## Rendement en kosten

Het effectieve maandrendement is `(1 + jaarrendement)^(1/12) − 1`.
Per maand is de volgorde: beginwaarde, rendement (na eventuele procentuele
kosten), vaste maandkosten, premie-inleg, eindwaarde. Hierdoor rendeert een
inleg vanaf de volgende maand. Een kostenpercentage wordt van het jaarlijkse
rendement afgetrokken; een vaste jaarlijkse kost wordt maandelijks afgetrokken.

## Groei en inflatie

Salaris en franchise groeien onafhankelijk, jaarlijks vanaf de geselecteerde
maand. De koopkrachtwaarde is `nominaal eindkapitaal / (1 + inflatie)^jaren`.

## Equivalent vlak percentage

Voor elk rendement wordt binary search gebruikt binnen 0–100%. Het percentage
waarbij het eindkapitaal van de vlakke regeling gelijk is aan de huidige
regeling wordt geretourneerd. Bestaat er geen oplossing binnen dat bereik, dan
wordt dit expliciet gemeld. Een nominaal equivalent is de gemiddelde
premielast; die kan afwijken omdat vroegere inleg langer rendeert.
