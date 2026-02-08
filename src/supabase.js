import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xomftsiftgcjsrsyyeiu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbWZ0c2lmdGdjanNyc3l5ZWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTIzMDIsImV4cCI6MjA4NjEyODMwMn0.by8ATlxQYTpzaEnliW81CBFUZuZOKNeA1Gh8gAYMjE0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
