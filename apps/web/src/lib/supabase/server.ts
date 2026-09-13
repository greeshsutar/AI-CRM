import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEFAULT_SUPABASE_URL = 'https://nbtcahwwwvttrgrmeiac.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_tPbqryJ6_OCLrLTLL7sm0w_8uzwGVgN';

function isValidValue(val: string | undefined): val is string {
  return (
    typeof val === 'string' &&
    val.trim() !== '' &&
    val !== 'undefined' &&
    val !== 'null'
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = isValidValue(envUrl) ? envUrl : DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = isValidValue(envKey)
    ? envKey
    : DEFAULT_SUPABASE_ANON_KEY;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The `set` method was called from a Server Component.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // The `remove` method was called from a Server Component.
        }
      },
    },
  });
}
