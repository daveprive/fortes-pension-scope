export type IsoDate = `${number}-${number}-${number}`;
export type AgeMethod = "firstDayOfMonth" | "premiumDate";
export type PensionDateRule = "birthday" | "firstDayOfBirthdayMonth";
export type SchemeType = "progressive" | "flat" | "manual";
export type EmployeeContributionMethod =
  "none" | "pensionBasePercentage" | "totalPremiumPercentage" | "fixedMonthly";

export interface SalaryConfiguration {
  grossMonthlySalary: number;
  paymentsPerYear: number;
  holidayAllowancePercentage: number;
  holidayAllowancePensionable: boolean;
  annualExtraReward: number;
  annualExtraRewardPensionable: boolean;
  thirteenthMonth: boolean;
  thirteenthMonthPensionable: boolean;
  otherPensionableReward: number;
  partTimePercentage: number;
  pensionBaseUsesFullTimeSalary: boolean;
}

export interface FranchiseConfiguration {
  current: number;
  annualGrowthPercentage: number;
}

export interface ProgressiveTier {
  id: string;
  fromAge: number;
  toAge: number;
  percentage: number;
}

export interface EmployeeContribution {
  method: EmployeeContributionMethod;
  value: number;
}

export interface PensionScheme {
  type: SchemeType;
  progressiveTiers: ProgressiveTier[];
  flatPremiumPercentage: number;
  manualMonthlyPremium: number;
  employeeContribution: EmployeeContribution;
}

export interface FlatPremiumScenario {
  id: string;
  name: string;
  totalPremiumPercentage: number;
  employeeContribution: EmployeeContribution;
  visible: boolean;
}

export interface ReturnScenario {
  id: string;
  name: string;
  annualPercentage: number;
}

export interface CalculationInput {
  birthDate: IsoDate;
  employmentDate: IsoDate;
  pensionInsuranceStartDate: IsoDate;
  calculationDate: IsoDate;
  retirementAge: number;
  explicitRetirementDate?: IsoDate;
  pensionDateRule: PensionDateRule;
  ageMethod: AgeMethod;
  salary: SalaryConfiguration;
  franchise: FranchiseConfiguration;
  annualSalaryGrowthPercentage: number;
  maximumPensionableAnnualSalary: number;
  salaryGrowthMonth: number;
  currentScheme: PensionScheme;
  totalPremiumContributedToDate: number;
  actualMonthlyTotalPremium: number;
  actualMonthlyEmployerContribution: number;
  existingCapital: number;
  annualInvestmentCostPercentage: number;
  annualFixedCost: number;
  includeCosts: boolean;
  inflationPercentage: number;
  showRealValue: boolean;
}

export interface MonthlyProjection {
  date: IsoDate;
  year: number;
  age: number;
  grossMonthlySalary: number;
  pensionableAnnualSalary: number;
  franchise: number;
  pensionBase: number;
  premiumPercentage: number;
  totalPremium: number;
  employerContribution: number;
  employeeContribution: number;
  openingCapital: number;
  investmentReturn: number;
  closingCapital: number;
  cumulativePremium: number;
  cumulativeEmployerContribution: number;
  cumulativeEmployeeContribution: number;
}

export interface AnnualProjection {
  year: number;
  startAge: number;
  endAge: number;
  pensionableAnnualSalary: number;
  franchise: number;
  pensionBase: number;
  premiumPercentages: string;
  totalPremium: number;
  employerContribution: number;
  employeeContribution: number;
  investmentReturn: number;
  closingCapital: number;
}

export interface ProjectionResult {
  monthly: MonthlyProjection[];
  annual: AnnualProjection[];
  totalPremium: number;
  totalEmployerContribution: number;
  totalEmployeeContribution: number;
  totalInvestmentReturn: number;
  endCapital: number;
  realEndCapital?: number;
}
