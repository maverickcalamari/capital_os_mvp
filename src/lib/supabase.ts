import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const client = url && key ? createClient(url, key) : undefined;

export const accountsConfigured = Boolean(client);
export const accountUnavailable = 'Cloud accounts are unavailable. You can explore with sample data.';

export const supabase = new Proxy({} as NonNullable<typeof client>, {
  get(_, property) {
    if (!client) throw new Error(accountUnavailable);
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});