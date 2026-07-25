import type { BudgetCategory, Goal, Investment, Opportunity, Transaction } from './types';

export type ForecastPoint = {
  year: number;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  investments: number;
};

export type ForecastInput = {
  income: number;
  expenses: number;
  netWorth: number;
  years: number;
  incomeGrowth?: number;
  inflation?: number;
  investmentReturn?: number;
};

export function forecast(input: ForecastInput): ForecastPoint[] {
  const {
    income,
    expenses,
    netWorth,
    years,
    incomeGrowth = 0.045,
    inflation = 0.03,
    investmentReturn = 0.035,
  } = input;
  let annual = income * 12;
  let annualExp = expenses * 12;
  let bal = netWorth;
  const series: ForecastPoint[] = [];
  for (let i = 0; i < years; i++) {
    if (i > 0) {
      annual *= 1 + incomeGrowth;
      annualExp *= 1 + inflation;
    }
    const save = annual - annualExp;
    if (i > 0) bal = bal * (1 + investmentReturn) + save;
    series.push({
      year: new Date().getFullYear() + i,
      income: Math.round(annual),
      expenses: Math.round(annualExp),
      savings: Math.round(save),
      balance: Math.round(bal),
      investments: Math.round(netWorth + i * 4100),
    });
  }
  return series;
}

export type MonteCarloResult = {
  p10: number;
  p50: number;
  p90: number;
  samples: number;
};

export function monteCarlo(input: ForecastInput, runs = 500): MonteCarloResult {
  const finals: number[] = [];
  for (let r = 0; r < runs; r++) {
    let bal = input.netWorth;
    let annual = input.income * 12;
    let annualExp = input.expenses * 12;
    for (let i = 0; i < input.years; i++) {
      if (i > 0) {
        annual *= 1 + (input.incomeGrowth ?? 0.045) + gauss() * 0.02;
        annualExp *= 1 + (input.inflation ?? 0.03) + gauss() * 0.01;
      }
      const ret = (input.investmentReturn ?? 0.035) + gauss() * 0.09;
      bal = bal * (1 + ret) + (annual - annualExp);
    }
    finals.push(bal);
  }
  finals.sort((a, b) => a - b);
  const pick = (q: number) => finals[Math.max(0, Math.min(finals.length - 1, Math.floor(q * finals.length)))];
  return { p10: Math.round(pick(0.1)), p50: Math.round(pick(0.5)), p90: Math.round(pick(0.9)), samples: runs };
}

function gauss(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type CopilotContext = {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  targetRate: number;
  targetSavings: number;
  gap: number;
  netWorth: number;
  budget: BudgetCategory[];
  goals: Goal[];
  investments: Investment[];
  transactions: Transaction[];
};

export type CopilotAnswer = {
  text: string;
  confidence: number;
  actions: string[];
};

export function analyzePrompt(prompt: string, ctx: CopilotContext): CopilotAnswer {
  const q = prompt.toLowerCase();
  const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const weekly = Math.ceil(ctx.gap / 4.33);
  const incomeLift = Math.ceil(ctx.gap / 0.75);

  // Affordability check
  const affordMatch = q.match(/\$?\s?([\d,]+)\s?(vehicle|car|purchase|house|down payment|trip|vacation|gift|phone|laptop|computer|tv)/);
  if (affordMatch) {
    const amount = Number(affordMatch[1].replace(/,/g, ''));
    const monthsToSave = amount > 0 ? Math.ceil(amount / Math.max(1, ctx.savings)) : 0;
    const impactOnNetWorth = amount;
    const newNetWorth = ctx.netWorth - amount;
    const affordable = ctx.savings > 0 && monthsToSave <= 24;
    return {
      text: `A ${money(amount)} purchase would take about ${monthsToSave} months of current savings to cover. It would reduce your net worth from ${money(ctx.netWorth)} to ${money(newNetWorth)}. ${
        affordable
          ? 'This is achievable within 24 months without touching your emergency fund, but it will slow your other goals.'
          : 'At your current savings rate this would take longer than 24 months. Consider increasing income, reducing controllable spending, or financing part of the cost.'
      }`,
      confidence: 78,
      actions: [
        affordable ? `Set aside ${money(ctx.savings)}/mo for ${monthsToSave} months` : 'Increase monthly savings first',
        'Review impact on your top goal',
        'Compare against your emergency fund floor',
      ],
    };
  }

  // Income scenario
  if (q.includes('raise') || q.includes('income') || (q.includes('8%') && q.includes('rise'))) {
    const lift = ctx.income * 0.08;
    const newSavings = ctx.savings + lift * 0.75;
    return {
      text: `An 8% income lift adds ${money(lift)}/mo. If you save 75% of the raise, monthly savings rise from ${money(ctx.savings)} to ${money(newSavings)}, lifting your savings rate from ${pct(ctx.savingsRate)} to ${pct(newSavings / (ctx.income + lift))}.`,
      confidence: 84,
      actions: ['Automate 75% of the raise to savings', 'Avoid lifestyle inflation', 'Re-run the forecast with new income'],
    };
  }

  // Savings rate
  if (q.includes('savings rate') || q.includes('22%') || q.includes('reach')) {
    return {
      text: `To reach ${pct(ctx.targetRate)}, monthly savings must rise from ${money(ctx.savings)} to ${money(ctx.targetSavings)}. Generate about ${money(incomeLift)} in additional monthly income and save 75% of it, or reduce controllable spending by roughly ${money(weekly)} per week. Automate ${money(ctx.targetSavings / 2)} from each paycheck and review the gap every Friday.`,
      confidence: 82,
      actions: [
        `Cut ${money(weekly)}/week in controllable spending`,
        `Add ${money(incomeLift)}/mo income and save 75%`,
        `Automate ${money(ctx.targetSavings / 2)}/paycheck`,
      ],
    };
  }

  // Allocation
  if (q.includes('allocate') || q.includes('next $') || q.includes('where should')) {
    const emergency = ctx.goals.find((g) => g.name.toLowerCase().includes('emergency'));
    const topGoal = [...ctx.goals].sort((a, b) => b.current / b.target - a.current / a.target)[0];
    return {
      text: `Your next $1,000 should go to ${emergency && emergency.current < emergency.target ? 'your Emergency Fund first' : topGoal ? `"${topGoal.name}" (closest to completion)` : 'your highest-yield investment'}. This keeps liquidity strong while accelerating a near-complete goal for a psychological win.`,
      confidence: 80,
      actions: ['Fund emergency reserve to 3 months', 'Top up nearest goal', 'Invest the remainder in your broad-market ETF'],
    };
  }

  // Debt
  if (q.includes('debt') || q.includes('payoff') || q.includes('pay off')) {
    const debtCat = ctx.budget.find((b) => b.name.toLowerCase().includes('debt'));
    return {
      text: debtCat
        ? `You're spending ${money(debtCat.actual)}/mo on debt. Apply the avalanche method: pay minimums on all debts, then put every spare dollar toward the highest-interest balance. Redirect ${money(weekly)}/week of controllable spending to accelerate this and you'll cut months off the timeline.`
        : `Track your debt balances and interest rates in the Budget module, then apply the avalanche method: minimums on everything, surplus to the highest rate first.`,
      confidence: 79,
      actions: ['List debts by interest rate', 'Pay minimums on all', 'Direct surplus to highest rate'],
    };
  }

  // Default
  return {
    text: `Based on your current cash flow, you save ${money(ctx.savings)}/mo (${pct(ctx.savingsRate)} rate) with a gap of ${money(ctx.gap)} to your ${pct(ctx.targetRate)} target. Close it by generating ${money(incomeLift)}/mo more income (save 75%) or cutting ${money(weekly)}/week in spending. Your net worth of ${money(ctx.netWorth)} projects to grow under the current plan.`,
    confidence: 75,
    actions: [
      `Cut ${money(weekly)}/week spending`,
      `Add ${money(incomeLift)}/mo income`,
      'Automate savings on payday',
    ],
  };
}

export type OpportunityScore = {
  score: number;
  factors: { label: string; value: number }[];
};

export function scoreOpportunity(o: {
  capital: number;
  risk: number;
  effort: number;
  note?: string;
}): OpportunityScore {
  const capitalFactor = Math.max(0, 100 - o.capital / 100);
  const riskFactor = (6 - o.risk) * 16;
  const effortFactor = (6 - o.effort) * 14;
  const liquidityFactor = o.note?.toLowerCase().includes('liquid') ? 20 : 8;
  const score = Math.max(0, Math.min(100, Math.round((capitalFactor + riskFactor + effortFactor + liquidityFactor) / 3)));
  return {
    score,
    factors: [
      { label: 'Capital efficiency', value: Math.round(capitalFactor) },
      { label: 'Risk-adjusted', value: Math.round(riskFactor) },
      { label: 'Effort-adjusted', value: Math.round(effortFactor) },
      { label: 'Liquidity', value: liquidityFactor },
    ],
  };
}

export function monthlyTrend(transactions: Transaction[]): { month: string; income: number; expenses: number; savings: number }[] {
  const map = new Map<string, { income: number; expenses: number }>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = map.get(month) ?? { income: 0, expenses: 0 };
    if (t.direction === 'income') entry.income += t.amount;
    else entry.expenses += t.amount;
    map.set(month, entry);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income: Math.round(v.income),
      expenses: Math.round(v.expenses),
      savings: Math.round(v.income - v.expenses),
    }));
}

export function financialHealthScore(ctx: CopilotContext): number {
  let score = 50;
  if (ctx.savingsRate > 0.2) score += 20;
  else if (ctx.savingsRate > 0.1) score += 10;
  else if (ctx.savingsRate < 0) score -= 15;
  const overBudget = ctx.budget.filter((b) => b.actual > b.budget).length;
  score -= overBudget * 4;
  const goalsOnTrack = ctx.goals.filter((g) => g.current / g.target > 0.5).length;
  score += goalsOnTrack * 5;
  if (ctx.netWorth > 0) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}
