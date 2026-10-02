import Decimal from "decimal.js";
import {
  calculatePensionableSalary,
  effectiveMonthlyRate,
  projectScenario,
} from "./calculator";
import type {
  CalculationInput,
  EmployerComparisonResult,
  EmployerScenario,
  EmploymentValue,
} from "./types";

const d = (value: Decimal.Value) => new Decimal(value);
const n = (value: Decimal) => value.toNumber();

/**
 * Gross annual salary components. This intentionally includes components even
 * when they are not pensionable: it is an employment-value comparison.
 */
export function annualSalaryValue(input: CalculationInput): number {
  const salary = input.salary;
  const base = d(salary.grossMonthlySalary).times(salary.paymentsPerYear);
  const holiday = base.times(salary.holidayAllowancePercentage).div(100);
  const thirteenth = salary.thirteenthMonth ? salary.grossMonthlySalary : 0;
  return n(
    base
      .plus(holiday)
      .plus(thirteenth)
      .plus(salary.annualExtraReward)
      .plus(salary.otherPensionableReward),
  );
}

export function calculateEmploymentValue(
  scenario: EmployerScenario,
): EmploymentValue {
  const firstMonth = projectScenario(
    scenario.input,
    scenario.input.currentScheme,
    0,
  ).monthly[0];
  const annualEmployerPension = (firstMonth?.employerContribution ?? 0) * 12;
  const annualEmployeePension = (firstMonth?.employeeContribution ?? 0) * 12;
  const annualSalary = annualSalaryValue(scenario.input);
  const annualEmploymentValue =
    annualSalary + annualEmployerPension + scenario.annualEmployerBenefits;
  return {
    annualSalary,
    annualEmployerPension,
    annualEmployeePension,
    annualEmployerBenefits: scenario.annualEmployerBenefits,
    annualEmploymentValue,
    indicativeAmountAfterEmployeePension:
      annualEmploymentValue - annualEmployeePension,
  };
}

function capitalAtRetirement(scenario: EmployerScenario, returnPercentage: number) {
  return projectScenario(
    scenario.input,
    scenario.input.currentScheme,
    returnPercentage,
  );
}

/** Finds the proposed gross monthly salary at which the annual employment value equals current. */
export function findBreakEvenGrossMonthlySalary(
  current: EmployerScenario,
  proposed: EmployerScenario,
): number | undefined {
  const target = calculateEmploymentValue(current).annualEmploymentValue;
  const valueAt = (grossMonthlySalary: number) =>
    calculateEmploymentValue({
      ...proposed,
      input: {
        ...proposed.input,
        salary: { ...proposed.input.salary, grossMonthlySalary },
      },
    }).annualEmploymentValue;
  if (valueAt(0) > target || valueAt(100_000) < target) return undefined;
  let low = 0;
  let high = 100_000;
  for (let index = 0; index < 60; index += 1) {
    const middle = (low + high) / 2;
    if (valueAt(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 * Finds the proposed gross monthly salary that produces the same projected
 * pension capital on the retirement date. The salary cap is deliberately part
 * of the projection; a solution may therefore not exist above the cap.
 */
export function findBreakEvenGrossMonthlySalaryForRetirementCapital(
  current: EmployerScenario,
  proposed: EmployerScenario,
  returnPercentage: number,
): number | undefined {
  const targetCapital = capitalAtRetirement(current, returnPercentage).endCapital;
  const capitalAt = (grossMonthlySalary: number) =>
    capitalAtRetirement(
      {
        ...proposed,
        input: {
          ...proposed.input,
          salary: { ...proposed.input.salary, grossMonthlySalary },
        },
      },
      returnPercentage,
    ).endCapital;
  if (capitalAt(0) > targetCapital || capitalAt(100_000) < targetCapital)
    return undefined;
  let low = 0;
  let high = 100_000;
  for (let index = 0; index < 60; index += 1) {
    const middle = (low + high) / 2;
    if (capitalAt(middle) < targetCapital) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/** Gross monthly salary at which the pensionable annual salary reaches its cap. */
export function findGrossMonthlySalaryAtPensionableCap(
  input: CalculationInput,
): number | undefined {
  const cap = input.maximumPensionableAnnualSalary;
  const pensionableAt = (grossMonthlySalary: number) =>
    calculatePensionableSalary({ ...input.salary, grossMonthlySalary });
  if (pensionableAt(100_000) < cap) return undefined;
  let low = 0;
  let high = 100_000;
  for (let index = 0; index < 60; index += 1) {
    const middle = (low + high) / 2;
    if (pensionableAt(middle) < cap) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 * The end capital effect of a fixed additional premium paid at the end of
 * every projection month. It follows the same net monthly return as the main
 * projection and does not alter fixed costs.
 */
export function requiredExtraMonthlyPensionContribution(
  targetEndCapital: number,
  baseProjectionEndCapital: number,
  months: number,
  netAnnualReturnPercentage: number,
): number {
  const remainingGap = Math.max(0, targetEndCapital - baseProjectionEndCapital);
  if (remainingGap === 0 || months === 0) return 0;
  const rate = effectiveMonthlyRate(netAnnualReturnPercentage);
  let futureValueFactor = d(0);
  for (let month = 0; month < months; month += 1) {
    futureValueFactor = futureValueFactor.plus(d(1).plus(rate).pow(month));
  }
  return n(d(remainingGap).div(futureValueFactor));
}

export function compareEmployerScenarios(
  current: EmployerScenario,
  proposed: EmployerScenario,
  returnPercentage: number,
): EmployerComparisonResult {
  const currentValue = calculateEmploymentValue(current);
  const proposedValue = calculateEmploymentValue(proposed);
  const currentProjection = capitalAtRetirement(current, returnPercentage);
  const proposedProjection = capitalAtRetirement(proposed, returnPercentage);
  const salaryAtCap = findGrossMonthlySalaryAtPensionableCap(proposed.input);
  const proposedAtCap =
    salaryAtCap === undefined
      ? undefined
      : capitalAtRetirement(
          {
            ...proposed,
            input: {
              ...proposed.input,
              salary: {
                ...proposed.input.salary,
                grossMonthlySalary: Math.max(
                  proposed.input.salary.grossMonthlySalary,
                  salaryAtCap,
                ),
              },
            },
          },
          returnPercentage,
        );
  const gapAtCap = proposedAtCap
    ? Math.max(0, currentProjection.endCapital - proposedAtCap.endCapital)
    : undefined;
  return {
    current: currentValue,
    proposed: proposedValue,
    currentRetirementCapital: currentProjection.endCapital,
    proposedRetirementCapital: proposedProjection.endCapital,
    annualEmploymentValueDifference:
      proposedValue.annualEmploymentValue - currentValue.annualEmploymentValue,
    annualEmployerPensionDifference:
      proposedValue.annualEmployerPension - currentValue.annualEmployerPension,
    annualEmployeePensionDifference:
      proposedValue.annualEmployeePension - currentValue.annualEmployeePension,
    careerEmployerPensionDifference:
      proposedProjection.totalEmployerContribution -
      currentProjection.totalEmployerContribution,
    careerEmployeePensionDifference:
      proposedProjection.totalEmployeeContribution -
      currentProjection.totalEmployeeContribution,
    retirementCapitalDifference:
      proposedProjection.endCapital - currentProjection.endCapital,
    breakEvenGrossMonthlySalary: findBreakEvenGrossMonthlySalary(
      current,
      proposed,
    ),
    breakEvenGrossMonthlySalaryForRetirementCapital:
      findBreakEvenGrossMonthlySalaryForRetirementCapital(
        current,
        proposed,
        returnPercentage,
      ),
    grossMonthlySalaryAtPensionableCap: salaryAtCap,
    retirementCapitalGapAtSalaryCap: gapAtCap,
    requiredExtraMonthlyPensionContribution:
      proposedAtCap && gapAtCap !== undefined
        ? requiredExtraMonthlyPensionContribution(
            currentProjection.endCapital,
            proposedAtCap.endCapital,
            proposedAtCap.monthly.length,
            returnPercentage -
              (proposed.input.includeCosts
                ? proposed.input.annualInvestmentCostPercentage
                : 0),
          )
        : undefined,
  };
}
