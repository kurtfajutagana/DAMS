import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uunugyeqpktwuoahnycu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bnVneWVxcGt0d3VvYWhueWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjMwOTQsImV4cCI6MjA5NzI5OTA5NH0.J9DxnWroiNDnneI5Ad35S7rtbG9X0wwmQggd39JpC4Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
