import { useMemo, useRef, useState } from "react";
import {
  Add,
  Brightness4,
  Brightness7,
  DeleteOutline,
  FileDownloadOutlined,
  RestartAlt,
  UploadFileOutlined,
} from "@mui/icons-material";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parseISO } from "date-fns";
import {
  defaultFlatPremiumScenarios,
  defaultInput,
  defaultReturnScenarios,
  exampleTiers,
} from "./calculation/defaults";
import {
  calculatePensionBase,
  calculatePensionableSalary,
  findEquivalentFlatPremium,
  projectScenario,
  validateTiers,
} from "./calculation/calculator";
import type {
  CalculationInput,
  FlatPremiumScenario,
  ReturnScenario,
} from "./calculation/types";
import { currency, percentage } from "./formatting";
import { configurationJson, parseConfiguration } from "./export/configuration";
import { downloadExcel } from "./export/excel";
import { FlatComparison } from "./components/FlatComparison";

const dutchNumber = (value: number) =>
  new Intl.NumberFormat("nl-NL", {
    useGrouping: false,
    maximumFractionDigits: 8,
  }).format(value);
const parseDutchNumber = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const isCurrency = /salaris|franchise|premie|waarde|beloning|kapitaal/i.test(
    label,
  );
  const adornment = suffix?.includes("%") ? "%" : isCurrency ? "€" : undefined;
  return (
    <TextField
      fullWidth
      type="text"
      label={label}
      value={dutchNumber(value)}
      slotProps={{
        htmlInput: { inputMode: "decimal" },
        input: adornment
          ? {
              endAdornment: (
                <InputAdornment position="end">{adornment}</InputAdornment>
              ),
            }
          : undefined,
      }}
      onChange={(event) => onChange(parseDutchNumber(event.target.value))}
    />
  );
}

export default function App({
  mode,
  onToggleTheme,
}: {
  mode: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [input, setInput] = useState<CalculationInput>(defaultInput);
  const [returns, setReturns] = useState<ReturnScenario[]>(
    defaultReturnScenarios,
  );
  const [flatScenarios, setFlatScenarios] = useState<FlatPremiumScenario[]>(
    defaultFlatPremiumScenarios,
  );
  const [activeStep, setActiveStep] = useState(0);
  const [calculatedInput, setCalculatedInput] =
    useState<CalculationInput>(defaultInput);
  const [calculatedReturns, setCalculatedReturns] = useState<ReturnScenario[]>(
    defaultReturnScenarios,
  );
  const [calculatedFlatScenarios, setCalculatedFlatScenarios] = useState<
    FlatPremiumScenario[]
  >(defaultFlatPremiumScenarios);
  const [loadedExample, setLoadedExample] = useState(false);
  const [importError, setImportError] = useState<string>();
  const importRef = useRef<HTMLInputElement>(null);
  const tierIssues = validateTiers(input.currentScheme.progressiveTiers);
  const pensionableSalary = Math.min(
    calculatePensionableSalary(input.salary),
    input.maximumPensionableAnnualSalary,
  );
  const pensionBase = calculatePensionBase(
    pensionableSalary,
    input.franchise.current,
    input.salary.partTimePercentage,
    input.salary.pensionBaseUsesFullTimeSalary,
  );
  const historicalReturnStartDate =
    parseISO(input.pensionInsuranceStartDate) > parseISO(input.employmentDate)
      ? input.pensionInsuranceStartDate
      : input.employmentDate;
  const pensionInsuranceYears = Math.max(
    1 / 12,
    (parseISO(input.calculationDate).getTime() -
      parseISO(historicalReturnStartDate).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );
  const indicativeHistoricReturn =
    input.totalPremiumContributedToDate > 0 && input.existingCapital > 0
      ? (input.existingCapital / input.totalPremiumContributedToDate) **
          (1 / pensionInsuranceYears) -
        1
      : undefined;
  const closestHistoricalReturnId =
    indicativeHistoricReturn === undefined
      ? undefined
      : returns.reduce((closest, scenario) =>
          Math.abs(scenario.annualPercentage / 100 - indicativeHistoricReturn) <
          Math.abs(closest.annualPercentage / 100 - indicativeHistoricReturn)
            ? scenario
            : closest,
        ).id;
  const results = useMemo(
    () =>
      calculatedReturns.map((scenario) => ({
        scenario,
        result: projectScenario(
          calculatedInput,
          calculatedInput.currentScheme,
          scenario.annualPercentage,
        ),
      })),
    [calculatedInput, calculatedReturns],
  );
  const firstResult =
    indicativeHistoricReturn === undefined
      ? results[0]
      : results.reduce((closest, scenarioResult) =>
          Math.abs(
            scenarioResult.scenario.annualPercentage / 100 -
              indicativeHistoricReturn,
          ) <
          Math.abs(
            closest.scenario.annualPercentage / 100 - indicativeHistoricReturn,
          )
            ? scenarioResult
            : closest,
        );
  const flatResults = useMemo(
    () =>
      calculatedReturns.flatMap((returnScenario) =>
        calculatedFlatScenarios.map((flatScenario) => ({
          returnId: returnScenario.id,
          scenarioId: flatScenario.id,
          result: projectScenario(
            calculatedInput,
            {
              ...calculatedInput.currentScheme,
              type: "flat",
              flatPremiumPercentage: flatScenario.totalPremiumPercentage,
              employeeContribution: flatScenario.employeeContribution,
            },
            returnScenario.annualPercentage,
          ),
        })),
      ),
    [calculatedInput, calculatedReturns, calculatedFlatScenarios],
  );
  const firstReturnFlatResults = firstResult
    ? flatResults.filter((item) => item.returnId === firstResult.scenario.id)
    : [];
  const firstFlatComparison = firstReturnFlatResults[0];
  const update = (patch: Partial<CalculationInput>) =>
    setInput((current) => ({ ...current, ...patch }));
  const reset = () => {
    if (window.confirm("Alle ingevoerde gegevens wissen?")) {
      setInput(defaultInput);
      setReturns(defaultReturnScenarios);
      setFlatScenarios(defaultFlatPremiumScenarios);
      setCalculatedInput(defaultInput);
      setCalculatedReturns(defaultReturnScenarios);
      setCalculatedFlatScenarios(defaultFlatPremiumScenarios);
      setLoadedExample(false);
    }
  };
  const downloadConfiguration = () => {
    const blob = new Blob([configurationJson(input, returns)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pensioen-configuratie.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importConfiguration = async (file: File): Promise<void> => {
    try {
      const parsed = parseConfiguration(JSON.parse(await file.text()));
      setInput(parsed.input);
      setReturns(parsed.returns);
      setImportError(undefined);
    } catch {
      setImportError(
        "Dit configuratiebestand is ongeldig of wordt niet ondersteund. Er zijn geen gegevens gewijzigd.",
      );
    }
  };
  const excelResults = results.map(({ scenario, result }) => ({
    scenario,
    result,
    equivalent: findEquivalentFlatPremium(
      calculatedInput,
      result.endCapital,
      scenario.annualPercentage,
    ),
  }));
  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Pensioen-calculator
          </Typography>
          <Tooltip
            title={mode === "light" ? "Donkere weergave" : "Lichte weergave"}
          >
            <IconButton color="inherit" onClick={onToggleTheme}>
              {mode === "light" ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          </Tooltip>
          {activeStep === 0 && (
            <>
              <Button
                color="inherit"
                onClick={() => importRef.current?.click()}
                startIcon={<UploadFileOutlined />}
              >
                Importeren
              </Button>
              <input
                hidden
                ref={importRef}
                type="file"
                accept="application/json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importConfiguration(file);
                  event.target.value = "";
                }}
              />
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Alle berekeningen worden lokaal in uw browser uitgevoerd. De
          ingevoerde gegevens worden niet verzonden of automatisch opgeslagen.
        </Alert>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
          {[
            "Basisgegevens",
            "Nationale Nederlanden",
            "Berekenen",
            "Resultaten & export",
          ].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{ mb: 4 }}
        >
          <Button onClick={() => setActiveStep(0)}>1. Basisgegevens</Button>
          <Button onClick={() => setActiveStep(1)}>
            2. Nationale Nederlanden
          </Button>
          <Button
            variant={activeStep === 2 ? "contained" : "text"}
            onClick={() => setActiveStep(2)}
          >
            3. Berekenen
          </Button>
          <Button onClick={() => setActiveStep(3)}>4. Resultaten</Button>
        </Stack>
        {activeStep < 3 && (
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            sx={{ mb: 3 }}
          >
            <Button
              onClick={downloadConfiguration}
              startIcon={<FileDownloadOutlined />}
            >
              Alle invoer bewaren
            </Button>
            <Button color="inherit" onClick={reset} startIcon={<RestartAlt />}>
              Invoer wissen
            </Button>
          </Stack>
        )}
        {importError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {importError}
          </Alert>
        )}
        <Grid container spacing={3}>
          <Grid
            size={{ xs: 12, lg: 12 }}
            sx={{ display: activeStep < 2 ? "block" : "none" }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "repeat(2, minmax(0, 1fr))",
                },
                gap: 3,
                alignItems: "start",
              }}
            >
              <Card sx={{ display: activeStep === 0 ? "block" : "none" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Persoonlijke gegevens
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <DatePicker
                        label="Geboortedatum"
                        value={parseISO(input.birthDate)}
                        format="dd-MM-yyyy"
                        onChange={(value) =>
                          value &&
                          update({
                            birthDate: format(
                              value,
                              "yyyy-MM-dd",
                            ) as CalculationInput["birthDate"],
                          })
                        }
                        slotProps={{
                          textField: { fullWidth: true, variant: "standard" },
                        }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <DatePicker
                        label="Indienstdatum"
                        value={parseISO(input.employmentDate)}
                        format="dd-MM-yyyy"
                        onChange={(value) =>
                          value &&
                          update({
                            employmentDate: format(
                              value,
                              "yyyy-MM-dd",
                            ) as CalculationInput["employmentDate"],
                          })
                        }
                        slotProps={{
                          textField: { fullWidth: true, variant: "standard" },
                        }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <DatePicker
                        label="Peildatum berekening"
                        value={parseISO(input.calculationDate)}
                        format="dd-MM-yyyy"
                        onChange={(value) =>
                          value &&
                          update({
                            calculationDate: format(
                              value,
                              "yyyy-MM-dd",
                            ) as CalculationInput["calculationDate"],
                          })
                        }
                        slotProps={{
                          textField: { fullWidth: true, variant: "standard" },
                        }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Pensioenleeftijd"
                        value={input.retirementAge}
                        onChange={(retirementAge) => update({ retirementAge })}
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        fullWidth
                        select
                        label="Leeftijdsbepaling"
                        value={input.ageMethod}
                        onChange={(e) =>
                          update({
                            ageMethod: e.target
                              .value as CalculationInput["ageMethod"],
                          })
                        }
                      >
                        <MenuItem value="firstDayOfMonth">
                          Eerste dag van maand
                        </MenuItem>
                        <MenuItem value="premiumDate">
                          Werkelijke premiedatum
                        </MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              <Card sx={{ display: activeStep === 0 ? "block" : "none" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Salaris
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <NumberField
                        label="Bruto maandsalaris"
                        value={input.salary.grossMonthlySalary}
                        onChange={(grossMonthlySalary) =>
                          update({
                            salary: { ...input.salary, grossMonthlySalary },
                          })
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Deeltijdpercentage"
                        value={input.salary.partTimePercentage}
                        suffix="%"
                        onChange={(partTimePercentage) =>
                          update({
                            salary: { ...input.salary, partTimePercentage },
                          })
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Pensioengevende betalingen p/j"
                        value={input.salary.paymentsPerYear}
                        onChange={(paymentsPerYear) =>
                          update({
                            salary: { ...input.salary, paymentsPerYear },
                          })
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Vakantiegeld"
                        value={input.salary.holidayAllowancePercentage}
                        suffix="%"
                        onChange={(holidayAllowancePercentage) =>
                          update({
                            salary: {
                              ...input.salary,
                              holidayAllowancePercentage,
                            },
                          })
                        }
                      />
                    </Grid>
                    <Grid size={12}>
                      <NumberField
                        label="Jaarlijkse salarisgroei percentage p/j"
                        value={input.annualSalaryGrowthPercentage}
                        suffix="% p/j (scenario-aanname)"
                        onChange={(annualSalaryGrowthPercentage) =>
                          update({ annualSalaryGrowthPercentage })
                        }
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              <Card sx={{ display: activeStep === 1 ? "block" : "none" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Franchise en pensioengrondslag
                  </Typography>
                  <Button
                    component="a"
                    href="https://mijn.nn.nl/"
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    Open Mijn NN om uw pensioengegevens te raadplegen
                  </Button>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={6}>
                      <NumberField
                        label="Franchise"
                        value={input.franchise.current}
                        onChange={(current) =>
                          update({ franchise: { ...input.franchise, current } })
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Franchisegroei percentage p/j"
                        value={input.franchise.annualGrowthPercentage}
                        suffix="% p/j"
                        onChange={(annualGrowthPercentage) =>
                          update({
                            franchise: {
                              ...input.franchise,
                              annualGrowthPercentage,
                            },
                          })
                        }
                      />
                    </Grid>
                    <Grid size={12}>
                      <NumberField
                        label="Maximum pensioengevend jaarsalaris"
                        value={input.maximumPensionableAnnualSalary}
                        onChange={(maximumPensionableAnnualSalary) =>
                          update({ maximumPensionableAnnualSalary })
                        }
                        suffix="Salaris boven dit bedrag telt niet mee voor deze pensioenregeling."
                      />
                    </Grid>
                  </Grid>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Pensioengevend salaris: <b>{currency(pensionableSalary)}</b>{" "}
                    · Pensioengrondslag: <b>{currency(pensionBase)}</b>
                  </Typography>
                </CardContent>
              </Card>
              <Card
                sx={{
                  display: activeStep === 1 ? "block" : "none",
                  gridColumn: { lg: 2 },
                  gridRow: { lg: "span 2" },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      mt: 3,
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: "action.hover",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="overline" color="primary">
                      Type regeling
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Progressieve leeftijdsstaffel
                    </Typography>
                    {input.currentScheme.type === "flat" && (
                      <NumberField
                        label="Vlak premiepercentage"
                        value={input.currentScheme.flatPremiumPercentage}
                        suffix="%"
                        onChange={(flatPremiumPercentage) =>
                          update({
                            currentScheme: {
                              ...input.currentScheme,
                              flatPremiumPercentage,
                            },
                          })
                        }
                      />
                    )}
                    {input.currentScheme.type === "manual" && (
                      <NumberField
                        label="Handmatige maandpremie"
                        value={input.currentScheme.manualMonthlyPremium}
                        onChange={(manualMonthlyPremium) =>
                          update({
                            currentScheme: {
                              ...input.currentScheme,
                              manualMonthlyPremium,
                            },
                          })
                        }
                      />
                    )}
                    {input.currentScheme.type === "progressive" && (
                      <>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="subtitle2">
                            Leeftijdsstaffel
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => {
                              update({
                                currentScheme: {
                                  ...input.currentScheme,
                                  progressiveTiers: exampleTiers,
                                },
                              });
                              setLoadedExample(true);
                            }}
                          >
                            Laad voorbeeldstaffel
                          </Button>
                        </Stack>
                        {loadedExample && (
                          <Alert severity="warning" sx={{ mb: 1 }}>
                            Voorbeeldstaffel — geen wettelijke of universele
                            standaard.
                          </Alert>
                        )}
                        {input.currentScheme.progressiveTiers.map((tier) => (
                          <Stack
                            key={tier.id}
                            direction="row"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <NumberField
                              label="Van"
                              value={tier.fromAge}
                              onChange={(fromAge) =>
                                update({
                                  currentScheme: {
                                    ...input.currentScheme,
                                    progressiveTiers:
                                      input.currentScheme.progressiveTiers.map(
                                        (item) =>
                                          item.id === tier.id
                                            ? { ...item, fromAge }
                                            : item,
                                      ),
                                  },
                                })
                              }
                            />
                            <NumberField
                              label="Tot"
                              value={tier.toAge}
                              onChange={(toAge) =>
                                update({
                                  currentScheme: {
                                    ...input.currentScheme,
                                    progressiveTiers:
                                      input.currentScheme.progressiveTiers.map(
                                        (item) =>
                                          item.id === tier.id
                                            ? { ...item, toAge }
                                            : item,
                                      ),
                                  },
                                })
                              }
                            />
                            <NumberField
                              label="Premie %"
                              value={tier.percentage}
                              onChange={(percentage) =>
                                update({
                                  currentScheme: {
                                    ...input.currentScheme,
                                    progressiveTiers:
                                      input.currentScheme.progressiveTiers.map(
                                        (item) =>
                                          item.id === tier.id
                                            ? { ...item, percentage }
                                            : item,
                                      ),
                                  },
                                })
                              }
                            />
                            <IconButton
                              onClick={() =>
                                update({
                                  currentScheme: {
                                    ...input.currentScheme,
                                    progressiveTiers:
                                      input.currentScheme.progressiveTiers.filter(
                                        (item) => item.id !== tier.id,
                                      ),
                                  },
                                })
                              }
                            >
                              <DeleteOutline />
                            </IconButton>
                          </Stack>
                        ))}
                        <Button
                          startIcon={<Add />}
                          onClick={() =>
                            update({
                              currentScheme: {
                                ...input.currentScheme,
                                progressiveTiers: [
                                  ...input.currentScheme.progressiveTiers,
                                  {
                                    id: crypto.randomUUID(),
                                    fromAge: 0,
                                    toAge: 0,
                                    percentage: 0,
                                  },
                                ],
                              },
                            })
                          }
                        >
                          Staffelregel toevoegen
                        </Button>
                        {tierIssues.map((issue) => (
                          <Alert key={issue} severity="error" sx={{ mt: 1 }}>
                            {issue}
                          </Alert>
                        ))}
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
              <Card
                sx={{
                  display: activeStep === 1 ? "block" : "none",
                  alignSelf: "start",
                  mt: { lg: "-11.5rem" },
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Huidige premie en bestaande inleg
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <DatePicker
                        label="Ingangsdatum pensioenverzekering"
                        value={parseISO(input.pensionInsuranceStartDate)}
                        format="dd-MM-yyyy"
                        onChange={(value) =>
                          value &&
                          update({
                            pensionInsuranceStartDate: format(
                              value,
                              "yyyy-MM-dd",
                            ) as CalculationInput["pensionInsuranceStartDate"],
                          })
                        }
                        slotProps={{
                          textField: { fullWidth: true, variant: "standard" },
                        }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Huidige pensioenwaarde"
                        value={input.existingCapital}
                        onChange={(existingCapital) =>
                          update({ existingCapital })
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Totaal eerder ingelegde premie"
                        value={input.totalPremiumContributedToDate}
                        onChange={(totalPremiumContributedToDate) =>
                          update({ totalPremiumContributedToDate })
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Werkelijke totale maandpremie"
                        value={input.actualMonthlyTotalPremium}
                        onChange={(actualMonthlyTotalPremium) =>
                          update({ actualMonthlyTotalPremium })
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <NumberField
                        label="Werkelijke werkgeverspremie p/m"
                        value={input.actualMonthlyEmployerContribution}
                        onChange={(actualMonthlyEmployerContribution) =>
                          update({ actualMonthlyEmployerContribution })
                        }
                      />
                    </Grid>
                  </Grid>
                  {results[0]?.result.monthly[0] && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Berekende maandpremie:{" "}
                      {currency(results[0].result.monthly[0].totalPremium)}.
                      Afwijking t.o.v. ingevoerde werkelijke premie:{" "}
                      {currency(
                        input.actualMonthlyTotalPremium -
                          results[0].result.monthly[0].totalPremium,
                      )}
                      .
                    </Alert>
                  )}
                  {indicativeHistoricReturn !== undefined && (
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Indicatief historisch rendement vanaf{" "}
                      {format(
                        parseISO(historicalReturnStartDate),
                        "dd-MM-yyyy",
                      )}
                      : <b>{percentage(indicativeHistoricReturn)}</b>. Dit
                      vergelijkt alleen de huidige waarde met de totaal
                      ingelegde premie; het houdt geen rekening met het precieze
                      moment van iedere storting.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
          <Grid
            size={{ xs: 12, lg: 12 }}
            sx={{ display: activeStep >= 2 ? "block" : "none" }}
          >
            <Stack
              spacing={activeStep >= 2 ? 0 : 3}
              sx={
                activeStep >= 2
                  ? {
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        lg: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 3,
                      alignItems: "start",
                    }
                  : undefined
              }
            >
              <Card sx={{ display: activeStep === 2 ? "block" : "none" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rendementsscenario’s
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Dit zijn rekenscenario’s en geen voorspellingen van
                    toekomstige beleggingsresultaten.
                  </Typography>
                  {indicativeHistoricReturn !== undefined && (
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        Indicatief historisch rendement:{" "}
                        {percentage(indicativeHistoricReturn)}
                      </Typography>
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 2 }}
                        label={`Dichtstbijzijnde scenario: ${returns.find((scenario) => scenario.id === closestHistoricalReturnId)?.name ?? "niet beschikbaar"}`}
                      />
                    </>
                  )}
                  <Stack spacing={1}>
                    {returns.map((scenario, index) => (
                      <Stack
                        key={scenario.id}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center" }}
                      >
                        <TextField
                          fullWidth
                          label="Naam"
                          value={scenario.name}
                          onChange={(e) =>
                            setReturns((items) =>
                              items.map((item) =>
                                item.id === scenario.id
                                  ? { ...item, name: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <NumberField
                          label="Rendement percentage"
                          value={scenario.annualPercentage}
                          suffix="%"
                          onChange={(annualPercentage) =>
                            setReturns((items) =>
                              items.map((item) =>
                                item.id === scenario.id
                                  ? { ...item, annualPercentage }
                                  : item,
                              ),
                            )
                          }
                        />
                        {returns.length > 1 && (
                          <IconButton
                            onClick={() =>
                              setReturns((items) =>
                                items.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                          >
                            <DeleteOutline />
                          </IconButton>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                  <Button
                    sx={{ mt: 1 }}
                    startIcon={<Add />}
                    onClick={() =>
                      setReturns((items) => [
                        ...items,
                        {
                          id: crypto.randomUUID(),
                          name: "Nieuw scenario",
                          annualPercentage: 0,
                        },
                      ])
                    }
                  >
                    Rendement toevoegen
                  </Button>
                </CardContent>
              </Card>
              <Card sx={{ display: activeStep === 3 ? "block" : "none" }}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="h6" gutterBottom>
                      Resultaten
                    </Typography>
                    <Button
                      onClick={() => downloadExcel(input, excelResults)}
                      startIcon={<FileDownloadOutlined />}
                    >
                      Excel exporteren
                    </Button>
                  </Stack>
                  {results.map(({ scenario, result }) => {
                    const equivalent = findEquivalentFlatPremium(
                      input,
                      result.endCapital,
                      scenario.annualPercentage,
                    );
                    return (
                      <Box
                        key={scenario.id}
                        sx={{
                          py: 1.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography variant="subtitle1">
                          {scenario.name} (
                          {percentage(scenario.annualPercentage / 100)})
                        </Typography>
                        {scenario.id === firstResult?.scenario.id &&
                          indicativeHistoricReturn !== undefined && (
                            <Chip
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ mb: 1 }}
                              label={`Dichtst bij indicatief historisch rendement (${percentage(indicativeHistoricReturn)})`}
                            />
                          )}
                        <Grid container spacing={1}>
                          <Grid size={6}>
                            <Typography variant="body2">
                              Totale premie
                            </Typography>
                            <Typography variant="h6">
                              {currency(result.totalPremium)}
                            </Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2">
                              Geschat eindkapitaal
                            </Typography>
                            <Typography variant="h6">
                              {currency(result.endCapital)}
                            </Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2">
                              Werkgeversbijdrage
                            </Typography>
                            <Typography>
                              {currency(result.totalEmployerContribution)}
                            </Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2">
                              Equivalent vlak percentage
                            </Typography>
                            <Typography>
                              {equivalent === undefined
                                ? "Geen oplossing binnen 0–100%"
                                : percentage(equivalent / 100)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
                  {firstResult && firstFlatComparison && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Bij {firstResult.scenario.name} rendement resulteert de
                      huidige regeling in{" "}
                      {currency(firstResult.result.endCapital)}. Het scenario{" "}
                      {calculatedFlatScenarios.find(
                        (scenario) =>
                          scenario.id === firstFlatComparison.scenarioId,
                      )?.name ?? "vlak scenario"}{" "}
                      resulteert in{" "}
                      {currency(firstFlatComparison.result.endCapital)}; het
                      verschil is{" "}
                      {currency(
                        firstFlatComparison.result.endCapital -
                          firstResult.result.endCapital,
                      )}
                      . Dit is een indicatieve vergelijking, geen waardeoordeel.
                    </Alert>
                  )}
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Deze calculator geeft indicatieve rekenresultaten op basis
                    van ingevoerde gegevens en aannames. Dit is geen financieel,
                    fiscaal, juridisch of pensioenadvies.
                  </Alert>
                </CardContent>
              </Card>
              <Box sx={{ display: activeStep === 2 ? "block" : "none" }}>
                <FlatComparison
                  scenarios={flatScenarios}
                  legacy={results}
                  flat={flatResults}
                  onChange={setFlatScenarios}
                  showResults={false}
                />
              </Box>
              <Card
                sx={{
                  display: activeStep === 2 ? "block" : "none",
                  gridColumn: { lg: "span 2" },
                }}
              >
                <CardContent>
                  <Typography variant="h6">Klaar om te berekenen?</Typography>
                  <Typography variant="body2" sx={{ my: 1 }}>
                    De berekening gebruikt de ingevulde rendementen en
                    vlakke-premiescenario’s.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setCalculatedInput(input);
                      setCalculatedReturns(returns);
                      setCalculatedFlatScenarios(flatScenarios);
                      setActiveStep(3);
                    }}
                  >
                    Bereken en bekijk resultaten
                  </Button>
                </CardContent>
              </Card>
              <Box sx={{ display: activeStep === 3 ? "block" : "none" }}>
                <FlatComparison
                  scenarios={calculatedFlatScenarios}
                  legacy={results}
                  flat={flatResults}
                  onChange={() => undefined}
                  showControls={false}
                />
              </Box>
              {firstResult && activeStep === 3 && (
                <Card sx={{ gridColumn: { lg: "span 2" } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Pensioenkapitaal door de tijd
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Getoond voor {firstResult.scenario.name}; dit scenario
                      ligt het dichtst bij het indicatieve historische
                      rendement.
                    </Typography>
                    <Box sx={{ width: "100%", overflowX: "auto" }}>
                      <LineChart
                        height={300}
                        xAxis={[
                          {
                            data: firstResult.result.monthly.map(
                              (item) => item.date,
                            ),
                            scaleType: "point",
                            tickLabelStyle: { fontSize: 10 },
                          },
                        ]}
                        series={[
                          {
                            data: firstResult.result.monthly.map(
                              (item) => item.closingCapital,
                            ),
                            label: `Huidige regeling — ${firstResult.scenario.name}`,
                            showMark: false,
                          },
                          ...firstReturnFlatResults.map((item) => ({
                            data: item.result.monthly.map(
                              (month) => month.closingCapital,
                            ),
                            label:
                              calculatedFlatScenarios.find(
                                (scenario) => scenario.id === item.scenarioId,
                              )?.name ?? "Vlak scenario",
                            showMark: false,
                          })),
                        ]}
                      />
                    </Box>
                    <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
                      Eindkapitaal per regeling
                    </Typography>
                    <BarChart
                      height={280}
                      xAxis={[
                        {
                          scaleType: "band",
                          data: [
                            "Huidige regeling",
                            ...firstReturnFlatResults.map(
                              (item) =>
                                calculatedFlatScenarios.find(
                                  (scenario) => scenario.id === item.scenarioId,
                                )?.name ?? "Vlak scenario",
                            ),
                          ],
                        },
                      ]}
                      series={[
                        {
                          data: [
                            firstResult.result.endCapital,
                            ...firstReturnFlatResults.map(
                              (item) => item.result.endCapital,
                            ),
                          ],
                          label: `Eindkapitaal — ${firstResult.scenario.name}`,
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
