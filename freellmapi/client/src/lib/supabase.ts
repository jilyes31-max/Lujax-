import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bpazcpjuwpajefkjgfab.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwYXpjcGp1d3BhamVma2pnZmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MDk3ODIsImV4cCI6MjEwOTQ4NTc4Mn0.DvfGVNXgvmYCG5IiQJmZwcSjpXyLYCD5wlflqGSzCl8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
