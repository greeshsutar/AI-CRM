import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://nbtcahwwwvttrgrmeiac.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_tPbqryJ6_OCLrLTLL7sm0w_8uzwGVgN';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
