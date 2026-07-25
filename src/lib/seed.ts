import { supabase } from './supabase';
import { repository } from './repository';

const DEFAULT_BUDGET = [
  { name: 'Housing', budget: 3537.69, actual: 3537.69, icon: '🏠' },
  { name: 'Debt', budget: 350, actual: 634.15, icon: '🏦' },
  { name: 'Dining', budget: 250, actual: 743.32, icon: '🍽️' },
  { name: 'Groceries', budget: 250, actual: 250, icon: '🛒' },
  { name: 'Transport', budget: 100, actual: 251.59, icon: '🚙' },
  { name: 'Utilities', budget: 225, actual: 225, icon: '💡' },
  { name: 'Shopping', budget: 100, actual: 341.51, icon: '🛍️' },
  { name: 'Transfers', budget: 75, actual: 980.49, icon: '💸' },
];

const DEFAULT_OPPORTUNITIES = [
  { title: '13-week Treasury ladder', type: 'Cash yield', note: 'Preserves liquidity while improving idle-cash yield.', capital: 1000, risk: 1, effort: 1, score: 88, status: 'open' as const },
  { title: 'Municipal bond screening', type: 'Tax-aware income', note: 'Evaluate after-tax yield versus Treasury alternatives.', capital: 2500, risk: 2, effort: 2, score: 76, status: 'open' as const },
  { title: 'Micro-SaaS acquisition watch', type: 'Business equity', note: 'Target boring, profitable tools with low owner workload.', capital: 5000, risk: 4, effort: 4, score: 72, status: 'open' as const },
  { title: 'Invoice recovery audit service', type: 'Performance revenue', note: 'Earn a percentage of verified billing recoveries.', capital: 300, risk: 2, effort: 3, score: 85, status: 'open' as const },
];

const DEFAULT_NOTIFICATIONS = [
  { title: 'Dining is above budget', body: 'Dining spending exceeds your monthly limit.', kind: 'alert' as const, link_view: 'budget', read: false },
  { title: 'Savings goal needs attention', body: 'Your 22% savings rate goal is behind target.', kind: 'warning' as const, link_view: 'goals', read: false },
  { title: 'New opportunity scan ready', body: '4 opportunities match your profile.', kind: 'info' as const, link_view: 'scanner', read: false },
];

export async function seedUserData(userId: string): Promise<void> {
  const monthKey = new Date().toISOString().slice(0, 7);

  const { data: existingBudget } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!existingBudget) {
    await supabase.from('budget_categories').insert(
      DEFAULT_BUDGET.map((c) => ({ ...c, month_key: monthKey }))
    );
  }

  const { data: existingOpp } = await supabase
    .from('opportunities')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!existingOpp) {
    await supabase.from('opportunities').insert(DEFAULT_OPPORTUNITIES);
  }

  const { data: existingNotif } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!existingNotif) {
    await supabase.from('notifications').insert(DEFAULT_NOTIFICATIONS);
  }
}
