export type BudgetCategory = { id:string; name:string; budget:number; actual:number; icon:string };
export type Transaction = { id:string; date:string; merchant:string; category:string; amount:number; direction:'income'|'expense'; status:'cleared'|'pending' };
export type Goal = { id:string; name:string; target:number; current:number; due:string };
export type Investment = { id:string; name:string; type:string; value:number; returnPct:number };

const KEYS = {
  budget:'capital-os:budget', transactions:'capital-os:transactions', goals:'capital-os:goals', investments:'capital-os:investments', tasks:'capital-os:tasks'
};

function read<T>(key:string, fallback:T):T {
  try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function write<T>(key:string, value:T){ localStorage.setItem(key,JSON.stringify(value)); }

export const repository = {
  loadBudget:(fallback:BudgetCategory[])=>read(KEYS.budget,fallback), saveBudget:(v:BudgetCategory[])=>write(KEYS.budget,v),
  loadTransactions:(fallback:Transaction[])=>read(KEYS.transactions,fallback), saveTransactions:(v:Transaction[])=>write(KEYS.transactions,v),
  loadGoals:(fallback:Goal[])=>read(KEYS.goals,fallback), saveGoals:(v:Goal[])=>write(KEYS.goals,v),
  loadInvestments:(fallback:Investment[])=>read(KEYS.investments,fallback), saveInvestments:(v:Investment[])=>write(KEYS.investments,v),
  loadTasks:(fallback:boolean[])=>read(KEYS.tasks,fallback), saveTasks:(v:boolean[])=>write(KEYS.tasks,v),
  exportAll(){ return { budget:read(KEYS.budget,[]), transactions:read(KEYS.transactions,[]), goals:read(KEYS.goals,[]), investments:read(KEYS.investments,[]) }; },
  reset(){ Object.values(KEYS).forEach(k=>localStorage.removeItem(k)); }
};
