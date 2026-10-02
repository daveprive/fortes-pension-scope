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
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: "€" | "%";
}) {
  return (
    <TextField
      fullWidth
      type="text"
      label={label}
      value={formatNumber(value)}
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
            ) : (
              <Field
              label={
                  isNewEmployer || input.currentScheme.type === "flat"
                    ? "Vlak premiepercentage"
                    : "Werknemersbijdrage over premie"
                }
                value={
                  isNewEmployer || input.currentScheme.type === "flat"
                    ? input.currentScheme.flatPremiumPercentage
                    : input.currentScheme.employeeContribution.value
                }
                unit="%"
                onChange={(value) =>
                  isNewEmployer || input.currentScheme.type === "flat"
                    ? patchScheme({ flatPremiumPercentage: value })
                    : patchScheme({
                        employeeContribution: {
                          method: "totalPremiumPercentage",
                          value,
                        },
                      })
                }
              />
            )}
          </Grid>
          <Grid size={12}>
            <Field
              label="Werknemersbijdrage over totale premie"
              value={input.currentScheme.employeeContribution.value}
              unit="%"
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
          <Typography variant="h5" gutterBottom>
            Welk salaris geeft hetzelfde pensioenkapitaal op pensioendatum?
          </Typography>
          {capitalBreakEven === undefined ? (
            <Alert severity="warning">
              Geen salarisomslagpunt gevonden binnen € 0 en € 100.000 bruto
              maandsalaris. Dit kan bijvoorbeeld gebeuren wanneer het
              pensioengevend salarismaximum wordt bereikt.
            </Alert>
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
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
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
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
