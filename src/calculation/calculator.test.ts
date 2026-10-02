import { describe, expect, it } from 'vitest';
import { calculateMonthlyPremium, calculatePensionBase, calculatePensionableSalary, effectiveMonthlyRate, findEquivalentFlatPremium, projectScenario } from './calculator';
import { defaultInput, exampleTiers } from './defaults';
import type { CalculationInput } from './types';

describe('pension calculation engine', () => {
  it('includes only selected salary components', () => {
    expect(calculatePensionableSalary({ ...defaultInput.salary, grossMonthlySalary: 3_000, paymentsPerYear: 12, holidayAllowancePensionable: true, thirteenthMonth: true, thirteenthMonthPensionable: true, annualExtraReward: 500, annualExtraRewardPensionable: true })).toBe(42_380);
  });
  it('never produces a negative pension base', () => expect(calculatePensionBase(20_000, 25_000, 100, true)).toBe(0));
  it('uses effective monthly compound returns', () => expect(effectiveMonthlyRate(12)).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 12));
  it('uses first-day-of-month age for tier transitions', () => {
    const scheme = { ...defaultInput.currentScheme, type: 'progressive' as const, progressiveTiers: exampleTiers };
    const input: CalculationInput = { ...defaultInput, birthDate: '1976-10-29', calculationDate: '2026-10-01', retirementAge: 51, salary: { ...defaultInput.salary, grossMonthlySalary: 3_000 }, franchise: { current: 0, annualGrowthPercentage: 0 } };
    const result = projectScenario(input, scheme, 0);
    expect(result.monthly[0].age).toBe(49); expect(result.monthly[1].age).toBe(50); expect(result.monthly[0].premiumPercentage).toBe(12.5); expect(result.monthly[1].premiumPercentage).toBe(15.4);
  });
  it('finds an equivalent flat percentage', () => {
    const input: CalculationInput = { ...defaultInput, birthDate: '1985-01-01', calculationDate: '2026-01-01', retirementAge: 68, salary: { ...defaultInput.salary, grossMonthlySalary: 4_000 }, franchise: { current: 15_000, annualGrowthPercentage: 0 }, currentScheme: { ...defaultInput.currentScheme, type: 'flat', flatPremiumPercentage: 20 } };
    const target = projectScenario(input, input.currentScheme, 4).endCapital;
    expect(findEquivalentFlatPremium(input, target, 4)).toBeCloseTo(20, 8);
  });
  it('calculates a flat monthly premium', () => expect(calculateMonthlyPremium(24_000, { ...defaultInput.currentScheme, type: 'flat', flatPremiumPercentage: 20 }, 40).total).toBe(400));
});
