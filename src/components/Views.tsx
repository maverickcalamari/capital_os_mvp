import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bot,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  Plus,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data-context';
import type { BudgetCategory, Goal, Investment, Opportunity, Settings, Transaction } from '../lib/types';
import { analyzePrompt, financialHealthScore, forecast as forecastSeries, monthlyTrend, scoreOpportunity } from '../lib/finance';
import { money, pct, uid, tooltipStyle, quickActions, Workspace, Panel, Metric, Legend } from '../lib/ui';

type ViewProps = {
  navigateToView: (v: string) => void;
};

export function DashboardView({ navigateToView }: ViewProps) {
  const { repo, isGuest, guestMode } = useData();
  const { settings } = useAuth();

  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [b, t, g, i, o] = await Promise.all([
          repo.loadBudget(new Date().toISOString().slice(0, 7)),
          repo.loadTransactions(),
          repo.loadGoals(),
          repo.loadInvestments(),
          repo.loadOpportunities(),
        ]);
        if (active) {
          setBudget(b);
          setTransactions(t);
          setGoals(g);
          setInvestments(i);
          setOpportunities(o);
        }
      } catch {
        // ignore — empty state handles it
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [repo]);

  const income = settings?.monthly_income ?? 0;
  const expenses = settings?.monthly_expenses ?? 0;
  const goal = settings?.target_savings_rate ?? 0.20;
  const netWorth = settings?.net_worth ?? 0;

  const savings = income - expenses;
  const savingsRate = income ? savings / income : 0;
  const targetSavings = income * goal;
  const gap = Math.max(0, targetSavings - savings);

  const forecast = useMemo(
    () =>
      forecastSeries({
        income,
        expenses,
        netWorth,
        years: 7,
        incomeGrowth: settings?.income_growth_rate ?? 0.04,
        inflation: settings?.inflation_rate ?? 0.03,
        investmentReturn: settings?.investment_return_rate ?? 0.07,
      }),
    [income, expenses, netWorth, settings]
  );

  const donut = [
    { name: 'Expenses', value: expenses, color: '#f84f75' },
    { name: 'Savings', value: Math.max(0, savings), color: '#3ea8ff' },
  ];

  const healthScore = financialHealthScore({
    income, expenses, savings, savingsRate, targetRate: goal, targetSavings, gap, netWorth,
    budget, goals, investments, transactions,
  });

  const [question, setQuestion] = useState('How do I reach a 20% savings rate?');
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState(82);

  const runCopilot = (prompt = question) => {
    setQuestion(prompt);
    const result = analyzePrompt(prompt, {
      income, expenses, savings, savingsRate, targetRate: goal, targetSavings, gap, netWorth,
      budget, goals, investments, transactions,
    });
    setAnswer(result.text);
    setConfidence(result.confidence);
    navigateToView('copilot');
  };

  const isEmpty = !loading && income === 0 && expenses === 0 && budget.length === 0 && transactions.length === 0;

  if (loading) {
    return <div className="workspace"><p style={{ color: '#8d9cb0' }}>Loading dashboard…</p></div>;
  }

  if (isEmpty && !isGuest) {
    return (
      <Workspace eyebrow="WELCOME" title="Dashboard" desc="Let's set up your financial overview. Add your income and expenses to get started.">
        <EmptyState
          title="Your dashboard is ready for data"
          desc="Enter your monthly income and expenses in Settings to unlock your cash flow analysis, health score, and wealth forecast."
          actionLabel="Go to Settings"
          onAction={() => navigateToView('settings')}
        />
      </Workspace>
    );
  }

  const showSampleLabel = isGuest && guestMode === 'sample';

  return (
    <>
      {showSampleLabel && (
        <div className="sample-label">
          <Sparkles size={14} /> You're viewing sample data for exploration. Nothing here is real or saved.
        </div>
      )}
      <section className="summary-strip">
        <div className="summary-copy">
          <span><Sparkles size={17} /> AI CFO SUMMARY</span>
          <h2>{savings > 0 ? `You're on track to save ${money(savings)} this month.` : 'Add your income and expenses to see your savings.'}</h2>
          <p>
            {gap > 0
              ? <>Increase monthly savings by <b>{money(gap)}</b> to hit your {Math.round(goal * 100)}% target.</>
              : <>You've met your savings target for this month.</>}
          </p>
        </div>
        <Metric label="Savings Rate" value={pct(savingsRate)} meta={`${Math.round(goal * 100)}% goal`} positive />
        <Metric label="Monthly Savings" value={money(savings)} meta={`${money(targetSavings)} goal`} positive />
        <Metric label="Net Worth" value={money(netWorth)} meta={showSampleLabel ? 'Sample' : 'Current'} positive />
        <div className="goal-ring">
          <div className="ring">
            <span>{healthScore}</span>
          </div>
          <div>
            <small>Financial Health</small>
            <strong>{healthScore}/100</strong>
          </div>
        </div>
      </section>
      <section className="dashboard-grid top-grid">
        <Panel title="Cash Flow – This Month">
          <div className="cash-flow-wrap">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={54} outerRadius={76} paddingAngle={2}>
                    {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{money(savings)}</strong>
                <span>Net Cash Flow</span>
              </div>
            </div>
            <div className="legend-stack">
              <Legend color="#46d36f" label="Income" value={money(income)} />
              <Legend color="#f84f75" label="Expenses" value={money(expenses)} />
              <Legend color="#3ea8ff" label="Savings" value={money(savings)} />
            </div>
          </div>
          <div className="mini-footer">
            <span>Target Savings Rate <b>{Math.round(goal * 100)}%</b></span>
            <span>Gap to Target <b className="danger">{money(gap)}</b></span>
          </div>
        </Panel>
        <Panel title="Cash Flow Trend" action="6 Months" onAction={() => navigateToView('reports')}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend(transactions)}>
              <CartesianGrid stroke="#1c2d43" vertical={false} />
              <XAxis dataKey="month" stroke="#72839a" />
              <YAxis stroke="#72839a" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(Number(v))} />
              <Line type="monotone" dataKey="income" stroke="#4fda77" strokeWidth={3} />
              <Line type="monotone" dataKey="expenses" stroke="#fa577b" strokeWidth={3} />
              <Line type="monotone" dataKey="savings" stroke="#43a8ff" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Net Worth" action="6 Months" onAction={() => navigateToView('networth')}>
          <div className="panel-hero">
            <strong>{money(netWorth)}</strong>
            <span>{showSampleLabel ? 'Sample value' : 'Current'}</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={forecast}>
              <CartesianGrid stroke="#1c2d43" vertical={false} />
              <XAxis dataKey="year" stroke="#72839a" />
              <YAxis stroke="#72839a" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="balance" stroke="#9d62ff" fill="#9d62ff33" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </section>
      <section className="dashboard-grid mid-grid">
        <Panel title="Budget Pressure Points" subtitle="Top categories over budget">
          {budget.length === 0 ? (
            <p style={{ color: '#8d9cb0', fontSize: 12 }}>No budget categories yet. Add some in the Budget page.</p>
          ) : (
            <div className="pressure-list">
              {budget
                .slice()
                .sort((a, b) => b.actual / (b.budget || 1) - a.actual / (a.budget || 1))
                .slice(0, 5)
                .map((c) => (
                  <div className="pressure" key={c.id}>
                    <div className="pressure-icon">{c.icon}</div>
                    <div className="pressure-body">
                      <div>
                        <span>{c.name}</span>
                        <small>{money(c.actual)} / {money(c.budget)}</small>
                      </div>
                      <div className="track">
                        <span style={{ width: `${Math.min(100, (c.actual / (c.budget || 1)) * 70)}%` }} />
                      </div>
                    </div>
                    <b>{Math.round((c.actual / (c.budget || 1)) * 100)}%</b>
                  </div>
                ))}
            </div>
          )}
          <button className="text-link" onClick={() => navigateToView('budget')}>
            View full budget <ChevronRight size={15} />
          </button>
        </Panel>
        <Panel title="Six Year Wealth Forecast">
          <div className="forecast-wrap">
            <div className="forecast-stats">
              <small>2032 Projection</small>
              <strong className="purple">{money(forecast[forecast.length - 1]?.balance || 0)}</strong>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={forecast}>
                <CartesianGrid stroke="#1c2d43" vertical={false} />
                <XAxis dataKey="year" stroke="#72839a" />
                <YAxis stroke="#72839a" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="balance" stroke="#a96fff" strokeWidth={3} />
                <Line type="monotone" dataKey="investments" stroke="#43d574" strokeDasharray="6 6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Opportunity Scanner – Top Picks" action="See all" onAction={() => navigateToView('scanner')}>
          <div className="opportunity-mini">
            {opportunities.length === 0 ? (
              <p style={{ color: '#8d9cb0', fontSize: 12 }}>No opportunities yet. Add some in the Scanner.</p>
            ) : (
              opportunities.slice(0, 4).map((o, i) => (
                <button
                  className="opportunity-row"
                  key={o.id}
                  onClick={() => runCopilot(`Evaluate this opportunity: ${o.title}`)}
                >
                  <span className={`opp-icon tone-${i}`}>
                    {[<ChartNoAxesCombined key="0" />, <Building2 key="1" />, <Bot key="2" />, <WalletCards key="3" />][i]}
                  </span>
                  <div>
                    <strong>{o.title}</strong>
                    <small>{o.type}</small>
                  </div>
                  <b>{o.score}<small>Score</small></b>
                  <em>{money(o.capital)}<small>Capital Req.</small></em>
                </button>
              ))
            )}
          </div>
        </Panel>
      </section>
      <section className="bottom-grid">
        <Panel title="Finance Copilot – Quick Actions">
          <div className="quick-actions">
            {quickActions.map(({ title, desc, Icon }) => (
              <button key={title} onClick={() => runCopilot(title)}>
                <div>
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
                <Icon />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="This Week's Action Plan">
          <div className="tasks">
            {[
              'Review Dining & Delivery spending',
              savings > 0 ? `Move ${money(savings)} to savings` : 'Set up your income in Settings',
              'Evaluate 2 opportunities',
              'Increase emergency fund',
            ].map((t, i) => (
              <button className="task" key={t} onClick={() => navigateToView(i === 0 ? 'budget' : i === 1 ? 'settings' : 'scanner')}>
                <span />
                <p>{t}</p>
              </button>
            ))}
          </div>
          <button className="text-link" onClick={() => navigateToView('goals')}>
            View all actions <ChevronRight size={15} />
          </button>
        </Panel>
      </section>
    </>
  );
}

export function BudgetView() {
  const { repo, requireAuth } = useData();
  const monthKey = new Date().toISOString().slice(0, 7);
  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BudgetCategory[] | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await repo.loadBudget(monthKey);
      setBudget(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [repo, monthKey]);

  const rows = draft ?? budget;
  const totalB = rows.reduce((s, c) => s + c.budget, 0);
  const totalA = rows.reduce((s, c) => s + c.actual, 0);

  const update = (id: string, k: 'budget' | 'actual', v: number) =>
    setDraft(rows.map((c) => (c.id === id ? { ...c, [k]: v } : c)));

  const save = () => {
    requireAuth(async () => {
      if (!draft) return;
      setSaving(true);
      try {
        await Promise.all(draft.map((c) => repo.upsertBudget({ ...c, month_key: monthKey })));
        setDraft(null);
        await reload();
      } catch { /* ignore */ } finally { setSaving(false); }
    });
  };

  const add = () => {
    requireAuth(() => {
      setDraft([
        ...rows,
        { id: uid(), name: 'New Category', budget: 0, actual: 0, icon: '💰', month_key: monthKey },
      ]);
    });
  };

  const remove = (id: string) => {
    requireAuth(async () => {
      if (draft) {
        setDraft(draft.filter((c) => c.id !== id));
      } else {
        await repo.deleteBudget(id);
        reload();
      }
    });
  };

  const duplicateNextMonth = () => {
    requireAuth(async () => {
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      const nextKey = next.toISOString().slice(0, 7);
      try {
        await repo.duplicateBudgetMonth(monthKey, nextKey);
      } catch { /* ignore */ }
    });
  };

  return (
    <Workspace eyebrow="SPENDING CONTROL" title="Budget" desc="Edit monthly limits and actual spending. Changes save when you press Save.">
      <div className="module-kpis">
        <Metric label="Budgeted" value={money(totalB)} meta="Monthly plan" />
        <Metric label="Actual" value={money(totalA)} meta={totalA > totalB ? 'Over plan' : 'Under plan'} />
        <Metric label="Variance" value={money(totalB - totalA)} meta="Remaining" positive={totalB >= totalA} />
      </div>
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading budget…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No budget categories yet" desc="Add categories like Housing, Groceries, and Dining to track your monthly spending." actionLabel="Add category" onAction={add} />
      ) : (
        <>
          <div className="data-card budget-table">
            <div className="table-head">
              <span>Category</span><span>Budget</span><span>Actual</span><span>Status</span><span />
            </div>
            {rows.map((c) => (
              <div className="table-row" key={c.id}>
                <strong>{c.icon} {c.name}</strong>
                <input type="number" value={c.budget} onChange={(e) => update(c.id, 'budget', Number(e.target.value))} />
                <input type="number" value={c.actual} onChange={(e) => update(c.id, 'actual', Number(e.target.value))} />
                <span className={c.actual > c.budget ? 'status bad' : 'status good'}>
                  {c.actual > c.budget ? 'Over' : 'On track'}
                </span>
                <button onClick={() => remove(c.id)}><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="add-row" onClick={add}><Plus size={16} /> Add category</button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {draft && (
              <button className="primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
            <button onClick={duplicateNextMonth}>Duplicate to next month</button>
          </div>
        </>
      )}
    </Workspace>
  );
}

export function TransactionsView() {
  const { repo, requireAuth } = useData();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [draft, setDraft] = useState<Record<string, Transaction>>({});
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await repo.loadTransactions();
      setItems(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [repo]);

  const filtered = items.filter((t) => {
    if (filter === 'income' && t.direction !== 'income') return false;
    if (filter === 'expense' && t.direction !== 'expense') return false;
    if (filter === 'pending' && t.status !== 'pending') return false;
    if (search && !`${t.merchant} ${t.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const updateField = (id: string, patch: Partial<Transaction>) => {
    const item = items.find((t) => t.id === id);
    if (!item) return;
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id] ?? item, ...patch } }));
  };

  const saveRow = async (id: string) => {
    requireAuth(async () => {
      const updated = draft[id];
      if (!updated) return;
      setSaving(true);
      try {
        await repo.upsertTransaction(updated);
        setDraft((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        await reload();
      } catch { /* ignore */ } finally { setSaving(false); }
    });
  };

  const add = () => {
    requireAuth(async () => {
      try {
        await repo.upsertTransaction({
          id: undefined as any, date: new Date().toISOString().slice(0, 10),
          merchant: 'New transaction', category: 'Uncategorized', amount: 0,
          direction: 'expense', status: 'pending',
        });
        reload();
      } catch { /* ignore */ }
    });
  };

  const remove = (id: string) => {
    requireAuth(async () => {
      await repo.deleteTransaction(id);
      reload();
    });
  };

  return (
    <Workspace eyebrow="CASH LEDGER" title="Transactions" desc="Review, search, filter, and add activity. Edit a row then press Save.">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input placeholder="Search merchant or category…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} style={{ flex: 1, minWidth: 200, background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 10 }} />
        <select value={filter} onChange={(e) => { setFilter(e.target.value as any); setPage(0); }} style={{ background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 10 }}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading transactions…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No transactions yet" desc="Add your first transaction to start tracking your cash flow." actionLabel="Add transaction" onAction={add} />
      ) : (
        <>
          <div className="data-card">
            <div className="table-head tx">
              <span>Date</span><span>Merchant</span><span>Category</span><span>Amount</span><span>Status</span><span />
            </div>
            {pageItems.map((t) => {
              const row = draft[t.id] ?? t;
              const isDirty = !!draft[t.id];
              return (
                <div className="table-row tx" key={t.id}>
                  <input type="date" value={row.date} onChange={(e) => updateField(t.id, { date: e.target.value })} />
                  <input value={row.merchant} onChange={(e) => updateField(t.id, { merchant: e.target.value })} />
                  <input value={row.category} onChange={(e) => updateField(t.id, { category: e.target.value })} />
                  <input type="number" value={row.amount} onChange={(e) => updateField(t.id, { amount: Number(e.target.value) })} />
                  <span className="status good">{row.status}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {isDirty && (
                      <button onClick={() => saveRow(t.id)} disabled={saving} style={{ background: '#123c29', border: 0, color: '#54df78', borderRadius: 6, padding: '4px 8px', fontSize: 11 }}>
                        <Check size={14} />
                      </button>
                    )}
                    <button onClick={() => remove(t.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p style={{ color: '#8d9cb0', padding: 16 }}>No transactions match.</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button className="add-row" onClick={add}><Plus size={16} /> Add transaction</button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={page === 0} onClick={() => setPage(page - 1)} style={{ background: '#10243b', border: '1px solid #29415d', color: '#5ec7ff', borderRadius: 8, padding: '8px 12px' }}>Prev</button>
              <small style={{ color: '#8d9cb0' }}>Page {page + 1} of {pages}</small>
              <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} style={{ background: '#10243b', border: '1px solid #29415d', color: '#5ec7ff', borderRadius: 8, padding: '8px 12px' }}>Next</button>
            </div>
          </div>
        </>
      )}
    </Workspace>
  );
}

export function InvestmentsView() {
  const { repo, requireAuth } = useData();
  const [items, setItems] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, Investment>>({});
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setItems(await repo.loadInvestments()); } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [repo]);

  const total = items.reduce((s, x) => s + x.value, 0);
  const weightedReturn = items.length
    ? items.reduce((s, x) => s + x.value * x.returnPct, 0) / Math.max(1, total)
    : 0;

  const updateField = (id: string, patch: Partial<Investment>) => {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id] ?? item, ...patch } }));
  };

  const saveRow = async (id: string) => {
    requireAuth(async () => {
      const updated = draft[id];
      if (!updated) return;
      setSaving(true);
      try {
        await repo.upsertInvestment(updated);
        setDraft((prev) => { const n = { ...prev }; delete n[id]; return n; });
        reload();
      } catch { /* ignore */ } finally { setSaving(false); }
    });
  };

  const add = () => {
    requireAuth(async () => {
      await repo.upsertInvestment({ id: undefined as any, name: 'New Holding', type: 'Other', value: 0, returnPct: 0 });
      reload();
    });
  };

  const remove = (id: string) => {
    requireAuth(async () => { await repo.deleteInvestment(id); reload(); });
  };

  return (
    <Workspace eyebrow="PORTFOLIO" title="Investments" desc="Track asset values and expected returns. Edit a row then press Save.">
      <div className="module-kpis">
        <Metric label="Portfolio Value" value={money(total)} meta={`${items.length} holdings`} positive />
        <Metric label="Weighted Return" value={`${weightedReturn.toFixed(1)}%`} meta="Planning estimate" />
      </div>
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No holdings yet" desc="Add your first investment to track its value and expected return." actionLabel="Add holding" onAction={add} />
      ) : (
        <>
          <div className="cards-list">
            {items.map((i) => {
              const row = draft[i.id] ?? i;
              const isDirty = !!draft[i.id];
              return (
                <article className="data-card holding" key={i.id}>
                  <div>
                    <small>{row.type}</small>
                    <input value={row.name} onChange={(e) => updateField(i.id, { name: e.target.value })} />
                  </div>
                  <input type="number" value={row.value} onChange={(e) => updateField(i.id, { value: Number(e.target.value) })} />
                  <input type="number" value={row.returnPct} onChange={(e) => updateField(i.id, { returnPct: Number(e.target.value) })} />
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {isDirty && (
                      <button onClick={() => saveRow(i.id)} disabled={saving} style={{ background: '#123c29', border: 0, color: '#54df78', borderRadius: 6, padding: '4px 8px' }}>
                        <Check size={14} />
                      </button>
                    )}
                    <button onClick={() => remove(i.id)}><Trash2 /></button>
                  </div>
                </article>
              );
            })}
          </div>
          <button className="primary" onClick={add}><Plus /> Add holding</button>
        </>
      )}
    </Workspace>
  );
}

export function GoalsView() {
  const { repo, requireAuth } = useData();
  const [items, setItems] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, Goal>>({});
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setItems(await repo.loadGoals()); } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [repo]);

  const updateField = (id: string, patch: Partial<Goal>) => {
    const item = items.find((g) => g.id === id);
    if (!item) return;
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id] ?? item, ...patch } }));
  };

  const saveRow = async (id: string) => {
    requireAuth(async () => {
      const updated = draft[id];
      if (!updated) return;
      setSaving(true);
      try {
        await repo.upsertGoal(updated);
        setDraft((prev) => { const n = { ...prev }; delete n[id]; return n; });
        reload();
      } catch { /* ignore */ } finally { setSaving(false); }
    });
  };

  const add = () => {
    requireAuth(async () => {
      await repo.upsertGoal({ id: undefined as any, name: 'New Goal', target: 1000, current: 0, due: '2027-01-01' });
      reload();
    });
  };

  const remove = (id: string) => {
    requireAuth(async () => { await repo.deleteGoal(id); reload(); });
  };

  return (
    <Workspace eyebrow="OUTCOMES" title="Goals" desc="Turn financial priorities into measurable targets. Edit a card then press Save.">
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No goals yet" desc="Add a savings goal like an emergency fund or vacation to track your progress." actionLabel="Add goal" onAction={add} />
      ) : (
        <>
          <div className="cards-list">
            {items.map((g) => {
              const row = draft[g.id] ?? g;
              const isDirty = !!draft[g.id];
              return (
                <article className="data-card goal-card" key={g.id}>
                  <div>
                    <input value={row.name} onChange={(e) => updateField(g.id, { name: e.target.value })} />
                    <small>Due {row.due}</small>
                  </div>
                  <strong>{money(row.current)} / {money(row.target)}</strong>
                  <div className="allocation-progress">
                    <span style={{ width: `${Math.min(100, (row.current / (row.target || 1)) * 100)}%` }} />
                  </div>
                  <div className="goal-inputs">
                    <input type="number" value={row.current} onChange={(e) => updateField(g.id, { current: Number(e.target.value) })} />
                    <input type="number" value={row.target} onChange={(e) => updateField(g.id, { target: Number(e.target.value) })} />
                    <input type="date" value={row.due} onChange={(e) => updateField(g.id, { due: e.target.value })} />
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {isDirty && (
                        <button onClick={() => saveRow(g.id)} disabled={saving} style={{ background: '#123c29', border: 0, color: '#54df78', borderRadius: 6, padding: '4px 8px' }}>
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={() => remove(g.id)}><Trash2 /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <button className="primary" onClick={add}><Plus /> Add goal</button>
        </>
      )}
    </Workspace>
  );
}

export function ReportsView() {
  const { repo } = useData();
  const { settings } = useAuth();
  const navigate = useNavigate();

  const income = settings?.monthly_income ?? 0;
  const expenses = settings?.monthly_expenses ?? 0;
  const savings = income - expenses;
  const savingsRate = income ? savings / income : 0;

  const forecast = useMemo(
    () => forecastSeries({
      income, expenses, netWorth: settings?.net_worth ?? 0, years: 7,
      incomeGrowth: settings?.income_growth_rate ?? 0.04,
      inflation: settings?.inflation_rate ?? 0.03,
      investmentReturn: settings?.investment_return_rate ?? 0.07,
    }),
    [income, expenses, settings]
  );

  const exportData = async () => {
    const data = await repo.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'capital-os-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Workspace eyebrow="EXECUTIVE REPORTING" title="Reports" desc="A decision-ready monthly snapshot with portable data export.">
      <button className="primary workspace-action" onClick={exportData}>
        <Download size={17} /> Export data
      </button>
      <div className="module-kpis">
        <Metric label="Income" value={money(income)} meta="Monthly" positive />
        <Metric label="Expenses" value={money(expenses)} meta="Monthly" />
        <Metric label="Savings" value={money(savings)} meta={pct(savingsRate)} positive />
      </div>
      <div className="data-card report-brief">
        <h3>Capital OS Monthly Brief</h3>
        <p>
          Your current plan produces {money(savings)} in monthly savings. The six-year model projects net worth of{' '}
          {money(forecast[forecast.length - 1]?.balance || 0)} by {forecast[forecast.length - 1]?.year || 2032} under the
          current raise, inflation, and return assumptions.
        </p>
        <h4>Priority</h4>
        <p>Close the savings-rate gap before increasing lifestyle spending. All data is persisted to your account.</p>
        <small style={{ display: 'block', marginTop: 16, color: '#7d8ca1' }}>
          Educational decision support only — not personalized financial advice. See our <button className="auth-link" onClick={() => navigate('/disclaimer')}>Financial Disclaimer</button>.
        </small>
      </div>
    </Workspace>
  );
}

export function NetWorthView() {
  const { repo, requireAuth } = useData();
  const { settings } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState(settings?.net_worth ?? 0);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setInvestments(await repo.loadInvestments()); } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [repo]);
  useEffect(() => { setLocal(settings?.net_worth ?? 0); }, [settings?.net_worth]);

  const forecast = useMemo(
    () => forecastSeries({
      income: settings?.monthly_income ?? 0,
      expenses: settings?.monthly_expenses ?? 0,
      netWorth: settings?.net_worth ?? 0, years: 7,
      incomeGrowth: settings?.income_growth_rate ?? 0.04,
      inflation: settings?.inflation_rate ?? 0.03,
      investmentReturn: settings?.investment_return_rate ?? 0.07,
    }),
    [settings]
  );

  const save = () => {
    requireAuth(async () => {
      setSaving(true);
      try { await repo.upsertSettings({ user_id: settings?.user_id, net_worth: local }); } catch { /* ignore */ } finally { setSaving(false); }
    });
  };

  return (
    <Workspace eyebrow="BALANCE SHEET" title="Net Worth" desc="Track the current figure and forecast its path under your financial plan.">
      <div className="module-kpis">
        <label className="metric editable-metric">
          <small>Current Net Worth</small>
          <input type="number" value={local} onChange={(e) => setLocal(Number(e.target.value))} />
        </label>
        <Metric label="Investments" value={money(investments.reduce((s, x) => s + x.value, 0))} meta="Tracked assets" positive />
        <Metric label="2032 Projection" value={money(forecast[forecast.length - 1]?.balance || 0)} meta="Base case" positive />
      </div>
      <button className="primary" onClick={save} disabled={saving} style={{ marginBottom: 16 }}>
        {saving ? 'Saving…' : 'Save net worth'}
      </button>
      <div className="data-card chart-card">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={forecast}>
            <CartesianGrid stroke="#1c2d43" vertical={false} />
            <XAxis dataKey="year" stroke="#72839a" />
            <YAxis stroke="#72839a" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="balance" stroke="#9d62ff" fill="#9d62ff33" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Workspace>
  );
}

export function ScannerView({ navigateToView }: ViewProps) {
  const { repo, requireAuth, isGuest, guestMode } = useData();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try { setItems(await repo.loadOpportunities()); } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [repo]);

  const add = () => {
    requireAuth(async () => {
      const s = scoreOpportunity({ capital: 1000, risk: 3, effort: 3, note: '' });
      await repo.upsertOpportunity({
        id: undefined as any, title: 'New Opportunity', type: 'Custom',
        note: 'Describe this opportunity.', capital: 1000, risk: 3, effort: 3,
        score: s.score, status: 'open',
      });
      reload();
    });
  };

  const runCopilot = (title: string) => {
    navigateToView('copilot');
    // The copilot view reads from its own state, so we pass via URL or context
    // For now, we navigate and the user can type the prompt
  };

  return (
    <Workspace eyebrow="WEALTH ENGINE" title="Opportunity Scanner" desc="Ranked by capital efficiency, risk, effort, and strategic fit.">
      <button className="primary workspace-action" onClick={reload}>
        <Radar size={17} /> Refresh Scan
      </button>
      <button className="primary" onClick={add} style={{ marginBottom: 14 }}>
        <Plus /> Add opportunity
      </button>
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Scanning…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No opportunities yet" desc="Add an opportunity to evaluate its capital efficiency, risk, and effort." actionLabel="Add opportunity" onAction={add} />
      ) : (
        <div className="scanner-grid">
          {[...items].sort((a, b) => b.score - a.score).map((o) => (
            <article key={o.id}>
              <div className="score-badge">{o.score}</div>
              <div>
                <span>{o.type}</span>
                <h3>{o.title}</h3>
                <p>{o.note}</p>
                <div className="tags">
                  <small>Capital {money(o.capital)}</small>
                  <small>Risk {o.risk}/5</small>
                  <small>Effort {o.effort}/5</small>
                </div>
              </div>
              <button onClick={() => runCopilot(o.title)}>
                Review <ChevronRight size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </Workspace>
  );
}

export function CopilotView() {
  const { repo } = useData();
  const { settings } = useAuth();
  const [question, setQuestion] = useState('How do I reach a 20% savings rate?');
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState(82);

  const income = settings?.monthly_income ?? 0;
  const expenses = settings?.monthly_expenses ?? 0;
  const savings = income - expenses;
  const savingsRate = income ? savings / income : 0;
  const goal = settings?.target_savings_rate ?? 0.20;
  const targetSavings = income * goal;
  const gap = Math.max(0, targetSavings - savings);
  const netWorth = settings?.net_worth ?? 0;

  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [b, g, i, t] = await Promise.all([
          repo.loadBudget(new Date().toISOString().slice(0, 7)),
          repo.loadGoals(),
          repo.loadInvestments(),
          repo.loadTransactions(),
        ]);
        setBudget(b); setGoals(g); setInvestments(i); setTransactions(t);
      } catch { /* ignore */ }
    })();
  }, [repo]);

  const run = (prompt = question) => {
    setQuestion(prompt);
    const result = analyzePrompt(prompt, {
      income, expenses, savings, savingsRate, targetRate: goal, targetSavings, gap, netWorth,
      budget, goals, investments, transactions,
    });
    setAnswer(result.text);
    setConfidence(result.confidence);
  };

  return (
    <Workspace eyebrow="DECISION INTELLIGENCE" title="Finance Copilot" desc="Model financial decisions using your current cash flow and targets.">
      <div className="copilot-workspace">
        <div className="chat-card">
          <div className="ai-avatar"><Sparkles /></div>
          <h3>What decision are we making?</h3>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
          <div className="prompt-chips">
            <button onClick={() => setQuestion('Where should my next $1,000 go?')}>Allocate $1,000</button>
            <button onClick={() => setQuestion('Can I afford a $2,000 purchase?')}>Affordability</button>
            <button onClick={() => setQuestion('What happens if income rises 8%?')}>Income scenario</button>
            <button onClick={() => setQuestion('How do I pay off my debt fastest?')}>Debt payoff</button>
          </div>
          <button className="primary" onClick={() => run()}>Analyze Decision</button>
        </div>
        <div className="decision-card">
          <span className="eyebrow">DECISION BRIEF</span>
          <h3>Recommended Action</h3>
          <p>{answer || 'Ask a question to generate a recommendation using your current financial model.'}</p>
          <div className="confidence">
            <span>Model confidence</span>
            <div><i /><b>{confidence}%</b></div>
          </div>
          <small>Educational decision support only — not personalized financial advice.</small>
        </div>
      </div>
    </Workspace>
  );
}

export function AllocatorView() {
  const { repo, requireAuth } = useData();
  const { settings } = useAuth();
  const [localIncome, setLocalIncome] = useState(settings?.monthly_income ?? 0);
  const [localExpenses, setLocalExpenses] = useState(settings?.monthly_expenses ?? 0);
  const [localGoal, setLocalGoal] = useState(settings?.target_savings_rate ?? 0.20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalIncome(settings?.monthly_income ?? 0);
    setLocalExpenses(settings?.monthly_expenses ?? 0);
    setLocalGoal(settings?.target_savings_rate ?? 0.20);
  }, [settings]);

  const localSavings = localIncome - localExpenses;
  const localTarget = localIncome * localGoal;
  const localGap = Math.max(0, localTarget - localSavings);

  const apply = () => {
    requireAuth(async () => {
      setSaving(true);
      try {
        await repo.upsertSettings({
          user_id: settings?.user_id,
          monthly_income: localIncome,
          monthly_expenses: Math.max(0, localIncome - localTarget),
          target_savings_rate: localGoal,
        });
      } catch { /* ignore */ } finally { setSaving(false); }
    });
  };

  return (
    <Workspace eyebrow="CAPITAL ALLOCATION" title="AI CFO Allocator" desc="Adjust assumptions and immediately see the path to your target savings rate.">
      <div className="allocator-grid">
        <div className="panel form-panel">
          <label>Monthly take-home income
            <input type="number" value={localIncome} onChange={(e) => setLocalIncome(Number(e.target.value))} />
          </label>
          <label>Monthly expenses
            <input type="number" value={localExpenses} onChange={(e) => setLocalExpenses(Number(e.target.value))} />
          </label>
          <label>Target savings rate
            <div className="range-line">
              <input type="range" min="10" max="40" value={localGoal * 100} onChange={(e) => setLocalGoal(Number(e.target.value) / 100)} />
              <b>{Math.round(localGoal * 100)}%</b>
            </div>
          </label>
        </div>
        <div className="panel allocation-result">
          <span className="eyebrow">CURRENT PLAN</span>
          <strong>{money(localSavings)}</strong>
          <small>Monthly savings</small>
          <div className="allocation-progress">
            <span style={{ width: `${Math.min(100, localSavings / Math.max(1, localTarget) * 100)}%` }} />
          </div>
          <p>You need <b>{money(localGap)}</b> more per month to reach {money(localTarget)}.</p>
          <button onClick={apply} disabled={saving}>{saving ? 'Saving…' : 'Apply Recommended Plan'}</button>
        </div>
      </div>
    </Workspace>
  );
}

export function SettingsView() {
  const { repo, requireAuth } = useData();
  const { settings, profile, signOut, email } = useAuth();
  const [form, setForm] = useState<Settings | null>(settings);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const save = () => {
    requireAuth(async () => {
      if (!form) return;
      setSaving(true);
      setSaved(false);
      try {
        await repo.upsertSettings(form);
        if (name !== profile?.display_name) await repo.updateProfile({ display_name: name });
        setSaved(true);
      } catch { /* ignore */ } finally { setSaving(false); }
    });
  };

  if (!form) return <p style={{ color: '#8d9cb0' }}>Loading settings…</p>;

  const field = (key: keyof Settings, label: string, step = 0.01) => (
    <label style={{ display: 'grid', gap: 8, color: '#aebbd0', marginBottom: 14 }}>
      {label}
      <input type="number" step={step} value={form[key] as number}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        style={{ background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 12 }} />
    </label>
  );

  return (
    <Workspace eyebrow="PREFERENCES" title="Settings" desc="Manage your profile and financial assumptions.">
      {!requireAuth ? null : null}
      <div className="module-kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="data-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.25px', marginBottom: 14 }}>Profile</h3>
          <label style={{ display: 'grid', gap: 8, color: '#aebbd0', marginBottom: 14 }}>
            Display name
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 12 }} />
          </label>
          <small style={{ color: '#8493a9' }}>{email ?? ''}</small>
        </div>
        <div className="data-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.25px', marginBottom: 14 }}>Financial Assumptions</h3>
          {field('monthly_income', 'Monthly income', 100)}
          {field('monthly_expenses', 'Monthly expenses', 100)}
          {field('target_savings_rate', 'Target savings rate (0–1)')}
          {field('net_worth', 'Net worth', 100)}
          {field('income_growth_rate', 'Income growth rate')}
          {field('inflation_rate', 'Inflation rate')}
          {field('investment_return_rate', 'Investment return rate')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <small style={{ color: '#49df75' }}>Saved.</small>}
      </div>
    </Workspace>
  );
}

export function EmptyState({ title, desc, actionLabel, onAction }: {
  title: string;
  desc: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Sparkles size={28} /></div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {actionLabel && onAction && (
        <button className="primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
