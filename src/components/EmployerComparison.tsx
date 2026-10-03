import { ContentCopyOutlined, FileDownloadOutlined } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  compareEmployerScenarios,
  calculateEmploymentValue,
} from "../calculation/employerComparison";
import type { EmployerScenario, SchemeType } from "../calculation/types";
import { currency } from "../formatting";
import { downloadEmployerComparisonExcel } from "../export/excel";
import { CalculationInfo } from "./CalculationInfo";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("nl-NL", {
    useGrouping: false,
    maximumFractionDigits: 8,
  }).format(value);
const parseNumber = (value: string) => {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

function Field({
  label,
  value,
  onChange,
  unit,
  helperText,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helperText?: string;
  unit?: "€" | "%";
}) {
  return (
    <TextField
      fullWidth
      type="text"
      label={label}
      value={formatNumber(value)}
      helperText={helperText}
      slotProps={{
        htmlInput: { inputMode: "decimal" },
        input: unit
          ? {
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            }
          : undefined,
      }}
      onChange={(event) => onChange(parseNumber(event.target.value))}
    />
  );
}

function OfferCard({
  scenario,
  onChange,
  onCopyFromCurrent,
}: {
  scenario: EmployerScenario;
  onChange: (scenario: EmployerScenario) => void;
  onCopyFromCurrent?: () => void;
}) {
  const isNewEmployer = Boolean(onCopyFromCurrent);
  const { input } = scenario;
  const patchInput = (patch: Partial<typeof input>) =>
    onChange({ ...scenario, input: { ...input, ...patch } });
  const patchSalary = (patch: Partial<typeof input.salary>) =>
    patchInput({ salary: { ...input.salary, ...patch } });
  const patchScheme = (patch: Partial<typeof input.currentScheme>) =>
    patchInput({ currentScheme: { ...input.currentScheme, ...patch } });
  const value = calculateEmploymentValue(scenario);
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <TextField
            label="Naam scenario"
            value={scenario.name}
            onChange={(event) =>
              onChange({ ...scenario, name: event.target.value })
            }
            sx={{ flexGrow: 1 }}
          />
          {onCopyFromCurrent && (
            <Button
              onClick={onCopyFromCurrent}
              startIcon={<ContentCopyOutlined />}
              size="small"
            >
              Overnemen
            </Button>
          )}
        </Stack>
        {isNewEmployer && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Vul het vlakke premiepercentage van de nieuwe werkgever in. Het
            benodigde bruto salaris wordt in het overzicht berekend.
          </Alert>
        )}
        <Typography variant="overline" color="primary" sx={{ mt: 2, display: "block" }}>
          Arbeidsvoorwaarden per jaar
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <Field
              label="Bruto maandsalaris"
              value={input.salary.grossMonthlySalary}
              unit="€"
              onChange={(grossMonthlySalary) => patchSalary({ grossMonthlySalary })}
            />
          </Grid>
          <Grid size={6}>
            <Field
              label="Salarisbetalingen p/j"
              value={input.salary.paymentsPerYear}
              onChange={(paymentsPerYear) => patchSalary({ paymentsPerYear })}
            />
          </Grid>
          <Grid size={6}>
            <Field
              label="Vakantiegeld"
              value={input.salary.holidayAllowancePercentage}
              unit="%"
              onChange={(holidayAllowancePercentage) =>
                patchSalary({ holidayAllowancePercentage })
              }
            />
          </Grid>
          <Grid size={6}>
            <Field
              label="Extra vaste beloning p/j"
              value={input.salary.annualExtraReward}
              unit="€"
              onChange={(annualExtraReward) => patchSalary({ annualExtraReward })}
            />
          </Grid>
          <Grid size={12}>
            <Field
              label="Overige werkgeversbijdragen p/j"
              value={scenario.annualEmployerBenefits}
              unit="€"
              onChange={(annualEmployerBenefits) =>
                onChange({ ...scenario, annualEmployerBenefits })
              }
            />
          </Grid>
        </Grid>
        <Typography variant="overline" color="primary" sx={{ mt: 2, display: "block" }}>
          Pensioenregeling
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <Field
              label="Franchise"
              value={input.franchise.current}
              unit="€"
              onChange={(current) =>
                patchInput({ franchise: { ...input.franchise, current } })
              }
            />
          </Grid>
          <Grid size={6}>
            <Field
              label="Pensioengevend maximum"
              value={input.maximumPensionableAnnualSalary}
              unit="€"
              onChange={(maximumPensionableAnnualSalary) =>
                patchInput({ maximumPensionableAnnualSalary })
              }
            />
          </Grid>
          <Grid size={6}>
            {isNewEmployer ? (
              <TextField fullWidth label="Type regeling" value="Vlakke premie" disabled />
            ) : (
              <TextField
                fullWidth
                select
                label="Type regeling"
                value={input.currentScheme.type}
                onChange={(event) =>
                  patchScheme({ type: event.target.value as SchemeType })
                }
              >
                <MenuItem value="progressive">Progressieve leeftijdsstaffel</MenuItem>
                <MenuItem value="flat">Vlakke premie</MenuItem>
                <MenuItem value="manual">Handmatige premie</MenuItem>
              </TextField>
            )}
          </Grid>
          <Grid size={6}>
            {input.currentScheme.type === "manual" ? (
              <Field
                label="Totale maandpremie"
                value={input.currentScheme.manualMonthlyPremium}
                unit="€"
                onChange={(manualMonthlyPremium) => patchScheme({ manualMonthlyPremium })}
              />
            ) : input.currentScheme.type === "progressive" ? (
              <TextField
                fullWidth
                label="Premiebepaling"
                value="Progressieve leeftijdsstaffel"
                disabled
                helperText="De premie volgt de ingevoerde leeftijdsstaffel."
              />
            ) : (
              <Field
                label="Vlak premiepercentage"
                value={input.currentScheme.flatPremiumPercentage}
                unit="%"
                onChange={(value) =>
                  patchScheme({ flatPremiumPercentage: value })
                }
              />
            )}
          </Grid>
          <Grid size={12}>
            <Field
              label="Werknemersbijdrage van totale pensioenpremie"
              value={input.currentScheme.employeeContribution.value}
              unit="%"
              helperText="Bij 10% betaalt de werknemer 10% van de pensioenpremie; de werkgever betaalt de overige 90%."
              onChange={(value) =>
                patchScheme({
                  employeeContribution: {
                    method: "totalPremiumPercentage",
                    value,
                  },
                })
              }
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2">
            Bruto arbeidsvoorwaardenwaarde: <b>{currency(value.annualEmploymentValue)}</b>
            <CalculationInfo title="Uitleg bruto arbeidsvoorwaardenwaarde">
              <Typography>
                We tellen het bruto jaarsalaris, vakantiegeld, een eventuele
                13e maand, extra vaste beloning, overige
                werkgeversbijdragen en de werkgeverspensioenpremie bij elkaar op.
              </Typography>
              <Typography>
                In dit scenario is de werkgeverspensioenpremie{" "}
                <b>{currency(value.annualEmployerPension)} per jaar</b>.
              </Typography>
              <Typography>
                De werknemersbijdrage van{" "}
                <b>{currency(value.annualEmployeePension)} per jaar</b> blijft
                apart: dit is geen onderdeel van de werkgeverswaarde.
              </Typography>
            </CalculationInfo>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Inclusief werkgeverspensioen en overige werkgeversbijdragen; werknemersbijdrage staat afzonderlijk in het overzicht.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function EmployerComparison({
  current,
  proposed,
  returnPercentage,
  onCurrentChange,
  onProposedChange,
}: {
  current: EmployerScenario;
  proposed: EmployerScenario;
  returnPercentage: number;
  onCurrentChange: (scenario: EmployerScenario) => void;
  onProposedChange: (scenario: EmployerScenario) => void;
}) {
  const comparison = compareEmployerScenarios(current, proposed, returnPercentage);
  const capitalBreakEven =
    comparison.breakEvenGrossMonthlySalaryForRetirementCapital;
  const alternativeAtCap =
    comparison.grossMonthlySalaryAtPensionableCap !== undefined &&
    comparison.retirementCapitalGapAtSalaryCap !== undefined &&
    comparison.retirementCapitalGapAtSalaryCap > 0 &&
    comparison.requiredExtraMonthlyPensionContribution !== undefined;
  const differenceText = (value: number) =>
    `${value >= 0 ? "+" : "−"}${currency(Math.abs(value))}`;
  return (
    <>
      <Alert severity="info" sx={{ mb: 3 }}>
        Vul bij de nieuwe werkgever een vlak premiepercentage in. De calculator
        bepaalt vervolgens welk bruto salaris de lagere of hogere
        werkgeverspensioenpremie compenseert. Dit is een rekenhulp, geen
        financieel, fiscaal, juridisch of pensioenadvies.
      </Alert>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="overline" color="primary">
            Pensioenkapitaal-omslagpunt
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
            <Typography variant="h5">
              Welk salaris geeft hetzelfde pensioenkapitaal op pensioendatum?
            </Typography>
            <CalculationInfo title="Uitleg salaris voor gelijk pensioenkapitaal">
              <Typography>
                De calculator rekent eerst het pensioenkapitaal van de huidige
                leeftijdsstaffel door tot de pensioendatum.
              </Typography>
              <Typography>
                Daarna test hij bruto maandsalarissen bij de nieuwe werkgever,
                met het ingevulde vlakke premiepercentage, totdat het
                geprojecteerde eindkapitaal gelijk is.
              </Typography>
              <Typography>
                Huidige projectie: <b>{currency(comparison.currentRetirementCapital)}</b>.
                Projectie nieuwe werkgever bij het ingevoerde salaris:{" "}
                <b>{currency(comparison.proposedRetirementCapital)}</b>.
              </Typography>
              <Typography>
                Het rendementsscenario is{" "}
                <b>{returnPercentage.toLocaleString("nl-NL")} % per jaar</b>.
                De pensioengevende salarisgrens blijft gelden.
              </Typography>
            </CalculationInfo>
          </Stack>
          {capitalBreakEven === undefined ? (
            <Stack spacing={2}>
              <Alert severity="warning">
                Geen salarisomslagpunt gevonden binnen € 0 en € 100.000 bruto
                maandsalaris. Dit kan bijvoorbeeld gebeuren wanneer het
                pensioengevend salarismaximum wordt bereikt.
              </Alert>
              {alternativeAtCap && (
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: "action.hover" }}>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                    <Typography variant="subtitle1">
                      Alternatief: salaris tot de pensioengrens plus eigen inleg
                    </Typography>
                    <CalculationInfo title="Uitleg aanvullende eigen pensioeninleg">
                      <Typography>
                        Eerst zoeken we het bruto salaris waarbij het
                        pensioengevende salarismaximum van de nieuwe regeling
                        wordt bereikt.
                      </Typography>
                      <Typography>
                        Daarna rekenen we het resterende verschil in
                        pensioenkapitaal terug naar een vaste maandelijkse
                        extra storting tot pensioendatum.
                      </Typography>
                      <Typography>
                        De uitkomst is <b>{currency(comparison.requiredExtraMonthlyPensionContribution!)} per maand</b>.
                        Deze storting wordt in de berekening na het maandrendement
                        ingelegd en rendeert vanaf de volgende maand.
                      </Typography>
                    </CalculationInfo>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Bruto salaris bij maximale pensioengrondslag
                      </Typography>
                      <Typography variant="h6">
                        {currency(Math.max(current.input.salary.grossMonthlySalary, comparison.grossMonthlySalaryAtPensionableCap!))} p/m
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Resterend kapitaalverschil op pensioendatum
                      </Typography>
                      <Typography variant="h6">
                        {currency(comparison.retirementCapitalGapAtSalaryCap!)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Aanvullende eigen pensioeninleg
                      </Typography>
                      <Typography variant="h6">
                        {currency(comparison.requiredExtraMonthlyPensionContribution!)} p/m
                      </Typography>
                    </Grid>
                  </Grid>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    De extra inleg wordt maandelijks tot pensioendatum ingelegd
                    en gebruikt hetzelfde rendementsscenario. Controleer bij de
                    werkgever of pensioenuitvoerder of vrijwillige extra inleg
                    mogelijk is en wat de fiscale ruimte is.
                  </Typography>
                </Box>
              )}
            </Stack>
          ) : (
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: "primary.main", color: "primary.contrastText" }}>
                  <Typography variant="body2">Te vragen bruto maandsalaris</Typography>
                  <Typography variant="h4">
                    {currency(capitalBreakEven)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography>
                  Huidig salaris: <b>{currency(current.input.salary.grossMonthlySalary)} p/m</b>
                </Typography>
                <Typography>
                  Nodige salariscompensatie: <b>{capitalBreakEven >= current.input.salary.grossMonthlySalary ? "+" : "−"}{currency(Math.abs(capitalBreakEven - current.input.salary.grossMonthlySalary))} p/m</b>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Dit salaris maakt het geprojecteerde pensioenkapitaal op de
                  pensioendatum gelijk. Het projectierendement is {returnPercentage.toLocaleString("nl-NL")} % per jaar.
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <OfferCard scenario={current} onChange={onCurrentChange} />
        <OfferCard
          scenario={proposed}
          onChange={onProposedChange}
          onCopyFromCurrent={() =>
            onProposedChange({
              ...current,
              id: "new",
              name: proposed.name,
              input: {
                ...current.input,
                currentScheme: {
                  ...current.input.currentScheme,
                  type: "flat",
                  flatPremiumPercentage:
                    proposed.input.currentScheme.flatPremiumPercentage,
                },
              },
            })
          }
        />
        <Card sx={{ gridColumn: { lg: "span 2" } }}>
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">Vergelijking van het aanbod</Typography>
                <Typography variant="body2" color="text.secondary">
                  Uitgangspunt voor de projectie: {returnPercentage.toLocaleString("nl-NL")} % rendement per jaar.
                </Typography>
              </Box>
              <Chip label="Indicatief en scenario-afhankelijk" variant="outlined" />
            </Stack>
            <Button
              startIcon={<FileDownloadOutlined />}
              sx={{ mb: 2 }}
              onClick={() =>
                void downloadEmployerComparisonExcel(
                  current,
                  proposed,
                  comparison,
                  returnPercentage,
                )
              }
            >
              Exporteer vergelijking naar Excel
            </Button>
            <Grid container spacing={2}>
              {[
                ["Verschil bruto arbeidsvoorwaarden p/j", comparison.annualEmploymentValueDifference],
                ["Verschil werkgeverspensioen p/j", comparison.annualEmployerPensionDifference],
                ["Verschil werknemersbijdrage p/j", comparison.annualEmployeePensionDifference],
                ["Verschil werkgeverspensioen tot pensioen", comparison.careerEmployerPensionDifference],
                ["Verschil werknemersbijdrage tot pensioen", comparison.careerEmployeePensionDifference],
                ["Verschil pensioenkapitaal op pensioendatum", comparison.retirementCapitalDifference],
              ].map(([label, value]) => (
                <Grid key={String(label)} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={0.25}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <CalculationInfo title={`Uitleg: ${label}`}>
                        <Typography>
                          We berekenen dit bedrag afzonderlijk voor de huidige
                          werkgever en de nieuwe werkgever. Daarna trekken we
                          de huidige uitkomst af van de nieuwe uitkomst.
                        </Typography>
                        <Typography>
                          Een minteken betekent dus dat de nieuwe werkgever in
                          dit scenario lager uitkomt; een plusteken betekent
                          hoger.
                        </Typography>
                        {label === "Verschil pensioenkapitaal op pensioendatum" && (
                          <Typography>
                            Huidige regeling:{" "}
                            <b>{currency(comparison.currentRetirementCapital)}</b>.
                            Nieuwe regeling:{" "}
                            <b>{currency(comparison.proposedRetirementCapital)}</b>.
                          </Typography>
                        )}
                        <Typography>
                          De berekening gebruikt dezelfde geboortedatum,
                          pensioendatum en het rendementsscenario voor beide
                          werkgevers.
                        </Typography>
                      </CalculationInfo>
                    </Stack>
                    <Typography variant="h6">{differenceText(Number(value))}</Typography>
                    <Typography variant="caption">Nieuwe werkgever t.o.v. huidige werkgever</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Alert severity="info" sx={{ mt: 2 }}>
              {capitalBreakEven === undefined
                ? "Geen omslagpunt gevonden binnen € 0 en € 100.000 bruto maandsalaris."
                : `Indicatief kapitaal-omslagpunt: bij de nieuwe werkgever is circa ${currency(capitalBreakEven)} bruto maandsalaris nodig voor hetzelfde geprojecteerde pensioenkapitaal op pensioendatum.`}
            </Alert>
            {capitalBreakEven === undefined && alternativeAtCap && (
              <Box
                sx={{
                  mt: 2,
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle1">
                    Uitwerking: salaris tot pensioengrens plus eigen inleg
                  </Typography>
                  <CalculationInfo title="Uitleg alternatief bij pensioengrens">
                    <Typography>
                      Boven het pensioengevende salarismaximum leidt extra salaris
                      niet meer tot extra pensioenpremie in deze regeling.
                    </Typography>
                    <Typography>
                      We gebruiken daarom eerst het salaris dat de maximale
                      pensioengrondslag bereikt. Daarna rekenen we het resterende
                      eindkapitaalverschil terug naar een vaste maandelijkse
                      extra pensioeninleg.
                    </Typography>
                    <Typography>
                      De aanvullende inleg is{" "}
                      <b>{currency(comparison.requiredExtraMonthlyPensionContribution!)} per maand</b>.
                    </Typography>
                  </CalculationInfo>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Bruto salaris bij maximale pensioengrondslag
                    </Typography>
                    <Typography variant="h6">
                      {currency(Math.max(current.input.salary.grossMonthlySalary, comparison.grossMonthlySalaryAtPensionableCap!))} p/m
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Resterend kapitaalverschil op pensioendatum
                    </Typography>
                    <Typography variant="h6">
                      {currency(comparison.retirementCapitalGapAtSalaryCap!)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Aanvullende eigen pensioeninleg
                    </Typography>
                    <Typography variant="h6">
                      {currency(comparison.requiredExtraMonthlyPensionContribution!)} p/m
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
