import writeXlsxFile, { type Cell, type Sheet } from 'write-excel-file/browser';
import type { CalculationInput, ProjectionResult, ReturnScenario } from '../calculation/types';

type ExportRow = Record<string, string | number>;

function sheet(name: string, rows: ExportRow[]): Sheet<File | Blob | ArrayBuffer> {
  const headers = Object.keys(rows[0] ?? {});
  const data: Cell[][] = [headers.map((value) => ({ value, fontWeight: 'bold' }))];
  for (const row of rows) data.push(headers.map((header) => ({ value: row[header] })));
  return { sheet: name, data, columns: headers.map((header) => ({ width: Math.max(14, header.length + 2) })), stickyRowsCount: 1 };
}

export async function downloadExcel(input: CalculationInput, results: { scenario: ReturnScenario; result: ProjectionResult; equivalent: number | undefined }[]): Promise<void> {
  const summary = results.map(({ scenario, result, equivalent }) => ({ Scenario: scenario.name, Rendement: scenario.annualPercentage / 100, 'Totale premie': result.totalPremium, Werkgeversbijdrage: result.totalEmployerContribution, Werknemersbijdrage: result.totalEmployeeContribution, 'Totaal rendement': result.totalInvestmentReturn, Eindkapitaal: result.endCapital, 'Equivalent vlak percentage': equivalent === undefined ? '' : equivalent / 100 }));
  const annual = results.flatMap(({ scenario, result }) => result.annual.map((year) => ({ Scenario: scenario.name, Jaar: year.year, 'Leeftijd begin': year.startAge, 'Leeftijd einde': year.endAge, 'Pensioengevend salaris': year.pensionableAnnualSalary, Franchise: year.franchise, Pensioengrondslag: year.pensionBase, 'Premiepercentages': year.premiumPercentages, 'Totale premie': year.totalPremium, Werkgeversbijdrage: year.employerContribution, Werknemersbijdrage: year.employeeContribution, Rendement: year.investmentReturn, Eindkapitaal: year.closingCapital })));
  const monthly = results.flatMap(({ scenario, result }) => result.monthly.map((month) => ({ Scenario: scenario.name, Datum: month.date, Leeftijd: month.age, 'Bruto maandsalaris': month.grossMonthlySalary, 'Pensioengevend salaris': month.pensionableAnnualSalary, Franchise: month.franchise, Pensioengrondslag: month.pensionBase, 'Premie %': month.premiumPercentage / 100, 'Totale premie': month.totalPremium, Werkgeversbijdrage: month.employerContribution, Werknemersbijdrage: month.employeeContribution, Rendement: month.investmentReturn, Eindkapitaal: month.closingCapital })));
  const sheets = [sheet('Samenvatting', summary), sheet('Invoer', [{ Geboortedatum: input.birthDate, Peildatum: input.calculationDate, Pensioenleeftijd: input.retirementAge, 'Bruto maandsalaris': input.salary.grossMonthlySalary, 'Deeltijd %': input.salary.partTimePercentage / 100, Franchise: input.franchise.current, 'Bestaand kapitaal': input.existingCapital }]), sheet('Staffel', input.currentScheme.progressiveTiers.map((tier) => ({ 'Leeftijd vanaf': tier.fromAge, 'Leeftijd tot': tier.toAge, 'Premie %': tier.percentage / 100 }))), sheet('Jaaroverzicht', annual), sheet('Maandberekening', monthly)];
  const file = await writeXlsxFile(sheets);
  await file.toFile('pensioen-berekening.xlsx');
}
