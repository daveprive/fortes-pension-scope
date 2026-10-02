import { describe, expect, it } from "vitest";
import { defaultInput } from "./defaults";
import {
  annualSalaryValue,
  compareEmployerScenarios,
  findBreakEvenGrossMonthlySalary,
} from "./employerComparison";
import type { EmployerScenario } from "./types";

const current: EmployerScenario = {
  id: "current",
  name: "Huidige werkgever",
  input: { ...defaultInput, existingCapital: 0 },
  annualEmployerBenefits: 1_200,
};

describe("employer comparison", () => {
  it("includes all gross annual salary components in employment value", () => {
    const input = {
      ...defaultInput,
      salary: {
        ...defaultInput.salary,
        grossMonthlySalary: 3_000,
        paymentsPerYear: 12,
        holidayAllowancePercentage: 8,
        thirteenthMonth: true,
        annualExtraReward: 500,
        otherPensionableReward: 200,
      },
    };
    expect(annualSalaryValue(input)).toBe(42_580);
  });

  it("finds a break-even salary for identical offers", () => {
    const proposed = { ...current, id: "new" as const, name: "Nieuwe werkgever" };
    expect(findBreakEvenGrossMonthlySalary(current, proposed)).toBeCloseTo(
      current.input.salary.grossMonthlySalary,
      6,
    );
  });

  it("keeps employer and employee pension differences separate", () => {
    const proposed: EmployerScenario = {
      ...current,
      id: "new",
      name: "Nieuwe werkgever",
      input: {
        ...current.input,
        currentScheme: {
          ...current.input.currentScheme,
          type: "flat",
          flatPremiumPercentage: 20,
        },
      },
    };
    const result = compareEmployerScenarios(current, proposed, 4);
    expect(result.annualEmployerPensionDifference).toBeTypeOf("number");
    expect(result.annualEmployeePensionDifference).toBeTypeOf("number");
  });
});
