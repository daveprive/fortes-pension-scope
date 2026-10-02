import Decimal from "decimal.js";
import {
  addMonths,
  differenceInCalendarMonths,
  format,
  getMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import type {
  AgeMethod,
  AnnualProjection,
  CalculationInput,
  EmployeeContribution,
  IsoDate,
  MonthlyProjection,
  PensionScheme,
  ProgressiveTier,
  ProjectionResult,
  SalaryConfiguration,
} from "./types";

Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });
const d = (value: Decimal.Value) => new Decimal(value);
const asNumber = (value: Decimal) => value.toNumber();
const asIso = (value: Date): IsoDate => format(value, "yyyy-MM-dd") as IsoDate;

export function calculatePensionableSalary(
  salary: SalaryConfiguration,
): number {
  const base = d(salary.grossMonthlySalary).times(salary.paymentsPerYear);
  const holiday = salary.holidayAllowancePensionable
    ? base.times(salary.holidayAllowancePercentage).div(100)
    : d(0);
  const thirteenth =
    salary.thirteenthMonth && salary.thirteenthMonthPensionable
      ? d(salary.grossMonthlySalary)
      : d(0);
  const extra = salary.annualExtraRewardPensionable
    ? d(salary.annualExtraReward)
    : d(0);
  return asNumber(
    base
      .plus(holiday)
      .plus(thirteenth)
      .plus(extra)
      .plus(salary.otherPensionableReward),
  );
}

export function calculatePensionBase(
  pensionableSalary: number,
  franchise: number,
  partTimePercentage: number,
  usesFullTimeSalary: boolean,
): number {
  const fullTimeBase = Decimal.max(0, d(pensionableSalary).minus(franchise));
  return asNumber(
    usesFullTimeSalary
      ? fullTimeBase.times(partTimePercentage).div(100)
      : fullTimeBase,
  );
}

export function ageOnDate(birthDate: IsoDate, date: IsoDate): number {
  const birth = parseISO(birthDate);
  const at = parseISO(date);
  let age = at.getFullYear() - birth.getFullYear();
  if (
    at.getMonth() < birth.getMonth() ||
    (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())
  )
    age -= 1;
  return age;
}

export function ageForPremium(
  birthDate: IsoDate,
  date: IsoDate,
  method: AgeMethod,
): number {
  return ageOnDate(
    birthDate,
    method === "firstDayOfMonth" ? asIso(startOfMonth(parseISO(date))) : date,
  );
}

export function getApplicableTier(
  tiers: ProgressiveTier[],
  age: number,
): ProgressiveTier | undefined {
  return tiers.find((tier) => age >= tier.fromAge && age < tier.toAge);
}

export function calculateEmployeeContribution(
  totalPremium: number,
  pensionBase: number,
  contribution: EmployeeContribution,
): number {
  switch (contribution.method) {
    case "none":
      return 0;
    case "pensionBasePercentage":
      return asNumber(
        d(pensionBase).times(contribution.value).div(100).div(12),
      );
    case "totalPremiumPercentage":
      return asNumber(d(totalPremium).times(contribution.value).div(100));
    case "fixedMonthly":
      return contribution.value;
  }
}

export function calculateMonthlyPremium(
  pensionBase: number,
  scheme: PensionScheme,
  age: number,
): { percentage: number; total: number } {
  if (scheme.type === "manual")
    return { percentage: 0, total: scheme.manualMonthlyPremium };
  const percentage =
    scheme.type === "flat"
      ? scheme.flatPremiumPercentage
      : (getApplicableTier(scheme.progressiveTiers, age)?.percentage ?? 0);
  return {
    percentage,
    total: asNumber(d(pensionBase).times(percentage).div(100).div(12)),
  };
}

export function effectiveMonthlyRate(annualPercentage: number): number {
  return asNumber(
    d(1).plus(d(annualPercentage).div(100)).pow(d(1).div(12)).minus(1),
  );
}

export function retirementDate(
  input: Pick<
    CalculationInput,
    "birthDate" | "retirementAge" | "explicitRetirementDate" | "pensionDateRule"
  >,
): IsoDate {
  if (input.explicitRetirementDate) return input.explicitRetirementDate;
  const birth = parseISO(input.birthDate);
  const retirement = new Date(
    birth.getFullYear() + input.retirementAge,
    birth.getMonth(),
    birth.getDate(),
  );
  return asIso(
    input.pensionDateRule === "firstDayOfBirthdayMonth"
      ? startOfMonth(retirement)
      : retirement,
  );
}

export function validateTiers(tiers: ProgressiveTier[]): string[] {
  const issues: string[] = [];
  const ordered = [...tiers].sort((a, b) => a.fromAge - b.fromAge);
  ordered.forEach((tier, index) => {
    if (tier.fromAge < 0 || tier.toAge <= tier.fromAge || tier.percentage < 0)
      issues.push(`Ongeldige staffelband ${index + 1}.`);
    if (index > 0 && tier.fromAge !== ordered[index - 1].toAge)
      issues.push("De staffel bevat een overlap of een gat.");
  });
  return [...new Set(issues)];
}

function annuallyGrown(
  value: number,
  annualPercentage: number,
  start: Date,
  current: Date,
  growthMonth: number,
): number {
  const firstGrowth = new Date(start.getFullYear(), growthMonth - 1, 1);
  const years = Math.max(
    0,
    current.getFullYear() -
      firstGrowth.getFullYear() +
      (getMonth(current) >= getMonth(firstGrowth) ? 1 : 0),
  );
  return asNumber(
    d(value).times(d(1).plus(d(annualPercentage).div(100)).pow(years)),
  );
}

export function projectScenario(
  input: CalculationInput,
  scheme: PensionScheme,
  annualReturnPercentage: number,
): ProjectionResult {
  const start = startOfMonth(parseISO(input.calculationDate));
  const end = startOfMonth(parseISO(retirementDate(input)));
  const months = Math.max(0, differenceInCalendarMonths(end, start));
  const monthlyRate = effectiveMonthlyRate(
    annualReturnPercentage -
      (input.includeCosts ? input.annualInvestmentCostPercentage : 0),
  );
  const monthlyFixedCost = input.includeCosts ? input.annualFixedCost / 12 : 0;
  let capital = d(input.existingCapital);
  let cumulativePremium = d(0);
  let cumulativeEmployer = d(0);
  let cumulativeEmployee = d(0);
  const monthly: MonthlyProjection[] = [];
  for (let offset = 0; offset < months; offset += 1) {
    const current = addMonths(start, offset);
    const date = asIso(current);
    const age = ageForPremium(input.birthDate, date, input.ageMethod);
    const grossMonthlySalary = annuallyGrown(
      input.salary.grossMonthlySalary,
      input.annualSalaryGrowthPercentage,
      start,
      current,
      input.salaryGrowthMonth,
    );
    const salary = { ...input.salary, grossMonthlySalary };
    const pensionableAnnualSalary = Math.min(
      calculatePensionableSalary(salary),
      input.maximumPensionableAnnualSalary,
    );
    const franchise = annuallyGrown(
      input.franchise.current,
      input.franchise.annualGrowthPercentage,
      start,
      current,
      input.salaryGrowthMonth,
    );
    const pensionBase = calculatePensionBase(
      pensionableAnnualSalary,
      franchise,
      salary.partTimePercentage,
      salary.pensionBaseUsesFullTimeSalary,
    );
    const premium = calculateMonthlyPremium(pensionBase, scheme, age);
    const employeeContribution = Math.min(
      premium.total,
      Math.max(
        0,
        calculateEmployeeContribution(
          premium.total,
          pensionBase,
          scheme.employeeContribution,
        ),
      ),
    );
    const employerContribution = premium.total - employeeContribution;
    const openingCapital = capital;
    const investmentReturn = capital.times(monthlyRate);
    capital = capital
      .plus(investmentReturn)
      .minus(monthlyFixedCost)
      .plus(premium.total);
    cumulativePremium = cumulativePremium.plus(premium.total);
    cumulativeEmployer = cumulativeEmployer.plus(employerContribution);
    cumulativeEmployee = cumulativeEmployee.plus(employeeContribution);
    monthly.push({
      date,
      year: current.getFullYear(),
      age,
      grossMonthlySalary,
      pensionableAnnualSalary,
      franchise,
      pensionBase,
      premiumPercentage: premium.percentage,
      totalPremium: premium.total,
      employerContribution,
      employeeContribution,
      openingCapital: asNumber(openingCapital),
      investmentReturn: asNumber(investmentReturn.minus(monthlyFixedCost)),
      closingCapital: asNumber(capital),
      cumulativePremium: asNumber(cumulativePremium),
      cumulativeEmployerContribution: asNumber(cumulativeEmployer),
      cumulativeEmployeeContribution: asNumber(cumulativeEmployee),
    });
  }
  const annual = aggregateAnnual(monthly);
  const totalInvestmentReturn = asNumber(
    capital.minus(input.existingCapital).minus(cumulativePremium),
  );
  const years = months / 12;
  return {
    monthly,
    annual,
    totalPremium: asNumber(cumulativePremium),
    totalEmployerContribution: asNumber(cumulativeEmployer),
    totalEmployeeContribution: asNumber(cumulativeEmployee),
    totalInvestmentReturn,
    endCapital: asNumber(capital),
    realEndCapital: input.showRealValue
      ? asNumber(
          capital.div(
            d(1).plus(d(input.inflationPercentage).div(100)).pow(years),
          ),
        )
      : undefined,
  };
}

export function aggregateAnnual(
  months: MonthlyProjection[],
): AnnualProjection[] {
  return [
    ...new Map(
      months.map((month) => [
        month.year,
        months.filter((candidate) => candidate.year === month.year),
      ]),
    ).entries(),
  ].map(([year, items]) => ({
    year,
    startAge: items[0].age,
    endAge: items.at(-1)?.age ?? items[0].age,
    pensionableAnnualSalary: items.at(-1)?.pensionableAnnualSalary ?? 0,
    franchise: items.at(-1)?.franchise ?? 0,
    pensionBase: items.at(-1)?.pensionBase ?? 0,
    premiumPercentages: [
      ...new Set(items.map((item) => item.premiumPercentage.toFixed(4))),
    ]
      .map((value) => `${value}%`)
      .join(" / "),
    totalPremium: items.reduce((sum, item) => sum + item.totalPremium, 0),
    employerContribution: items.reduce(
      (sum, item) => sum + item.employerContribution,
      0,
    ),
    employeeContribution: items.reduce(
      (sum, item) => sum + item.employeeContribution,
      0,
    ),
    investmentReturn: items.reduce(
      (sum, item) => sum + item.investmentReturn,
      0,
    ),
    closingCapital: items.at(-1)?.closingCapital ?? 0,
  }));
}

export function findEquivalentFlatPremium(
  input: CalculationInput,
  targetEndCapital: number,
  annualReturnPercentage: number,
  upperBound = 100,
): number | undefined {
  const test = (percentage: number) =>
    projectScenario(
      input,
      {
        ...input.currentScheme,
        type: "flat",
        flatPremiumPercentage: percentage,
      },
      annualReturnPercentage,
    ).endCapital;
  if (targetEndCapital < test(0) || targetEndCapital > test(upperBound))
    return undefined;
  let low = 0;
  let high = upperBound;
  for (let i = 0; i < 60; i += 1) {
    const middle = (low + high) / 2;
    if (test(middle) < targetEndCapital) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
