import { createClient } from "@supabase/supabase-js";

// Mesmo projeto Supabase do Portal de BI e do Hub — os usuários são os mesmos.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);
