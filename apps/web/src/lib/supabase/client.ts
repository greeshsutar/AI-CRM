import { createBrowserClient } from '@supabase/ssr';

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

export function createClient() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = isValidValue(envUrl) ? envUrl : DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = isValidValue(envKey)
    ? envKey
    : DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
