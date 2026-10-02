import { z } from "zod";
import type { CalculationInput, ReturnScenario } from "../calculation/types";

const numeric = z.number().finite();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const employeeContribution = z.object({
  method: z.enum([
    "none",
    "pensionBasePercentage",
    "totalPremiumPercentage",
    "fixedMonthly",
  ]),
  value: numeric.min(0),
});
const tier = z
  .object({
    id: z.string().min(1),
    fromAge: numeric.min(0).max(120),
    toAge: numeric.min(0).max(121),
    percentage: numeric.min(0).max(100),
  })
  .refine((value) => value.toAge > value.fromAge, "Staffelgrens is ongeldig.");

const inputSchema = z.object({
  birthDate: date,
  employmentDate: date,
  pensionInsuranceStartDate: date,
  calculationDate: date,
  retirementAge: numeric.min(50).max(80),
  explicitRetirementDate: date.optional(),
  pensionDateRule: z.enum(["birthday", "firstDayOfBirthdayMonth"]),
  ageMethod: z.enum(["firstDayOfMonth", "premiumDate"]),
  salary: z.object({
    grossMonthlySalary: numeric.min(0),
    paymentsPerYear: numeric.min(1).max(24),
    holidayAllowancePercentage: numeric.min(0).max(100),
    holidayAllowancePensionable: z.boolean(),
    annualExtraReward: numeric.min(0),
    annualExtraRewardPensionable: z.boolean(),
    thirteenthMonth: z.boolean(),
    thirteenthMonthPensionable: z.boolean(),
    otherPensionableReward: numeric.min(0),
    partTimePercentage: numeric.min(0).max(100),
    pensionBaseUsesFullTimeSalary: z.boolean(),
  }),
  franchise: z.object({
    current: numeric.min(0),
    annualGrowthPercentage: numeric.min(-99).max(100),
  }),
  annualSalaryGrowthPercentage: numeric.min(-99).max(100),
  maximumPensionableAnnualSalary: numeric.min(0),
  salaryGrowthMonth: numeric.min(1).max(12),
  currentScheme: z.object({
    type: z.enum(["progressive", "flat", "manual"]),
    progressiveTiers: z.array(tier),
    flatPremiumPercentage: numeric.min(0).max(100),
    manualMonthlyPremium: numeric.min(0),
    employeeContribution,
  }),
  totalPremiumContributedToDate: numeric.min(0),
  actualMonthlyTotalPremium: numeric.min(0),
  actualMonthlyEmployerContribution: numeric.min(0),
  existingCapital: numeric.min(0),
  annualInvestmentCostPercentage: numeric.min(0).max(100),
  annualFixedCost: numeric.min(0),
  includeCosts: z.boolean(),
  inflationPercentage: numeric.min(-99).max(100),
  showRealValue: z.boolean(),
});
const configurationSchema = z.object({
  version: z.literal(1),
  input: inputSchema,
  returns: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(100),
        annualPercentage: numeric.min(-99).max(100),
      }),
    )
    .min(1),
});

export type ImportedConfiguration = {
  input: CalculationInput;
  returns: ReturnScenario[];
};
export function parseConfiguration(value: unknown): ImportedConfiguration {
  return configurationSchema.parse(value) as ImportedConfiguration;
}
export function configurationJson(
  input: CalculationInput,
  returns: ReturnScenario[],
): string {
  return JSON.stringify({ version: 1, input, returns }, null, 2);
}
