import Decimal from "decimal.js";
import { projectScenario } from "./calculator";
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

export function compareEmployerScenarios(
  current: EmployerScenario,
  proposed: EmployerScenario,
  returnPercentage: number,
): EmployerComparisonResult {
  const currentValue = calculateEmploymentValue(current);
  const proposedValue = calculateEmploymentValue(proposed);
  const currentProjection = capitalAtRetirement(current, returnPercentage);
  const proposedProjection = capitalAtRetirement(proposed, returnPercentage);
  return {
    current: currentValue,
    proposed: proposedValue,
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
  };
}
