import { useCallback, useEffect, useState } from 'react';
import { repository } from './repository';
import type { BudgetCategory, Goal, Investment, NotificationItem, Opportunity, Settings, Transaction } from './types';

type State<T> = { data: T; loading: boolean; error: string | null; reload: () => Promise<void> };

function useAsync<T>(loader: () => Promise<T>, fallback: T, deps: any[] = []): State<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await loader();
      setData(d);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await loader();
        if (active) setData(d);
      } catch (e: any) {
        if (active) setError(e.message ?? 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload };
}

export function useBudget(monthKey: string) {
  return useAsync<BudgetCategory[]>(() => repository.loadBudget(monthKey), [], [monthKey]);
}

export function useTransactions() {
  return useAsync<Transaction[]>(() => repository.loadTransactions(), [], []);
}

export function useGoals() {
  return useAsync<Goal[]>(() => repository.loadGoals(), [], []);
}

export function useInvestments() {
  return useAsync<Investment[]>(() => repository.loadInvestments(), [], []);
}

export function useOpportunities() {
  return useAsync<Opportunity[]>(() => repository.loadOpportunities(), [], []);
}

export function useNotifications() {
  return useAsync<NotificationItem[]>(() => repository.loadNotifications(), [], []);
}

export function useSettings() {
  return useAsync<Settings | null>(() => repository.loadSettings(), null, []);
}
