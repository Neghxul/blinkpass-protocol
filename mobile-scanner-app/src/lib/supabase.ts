import { createClient } from '@supabase/supabase-js';

// 🚨 REEMPLAZA ESTO con tus llaves de Supabase (Settings > API)
const supabaseUrl = 'https://iposajuwncqvelwigmvl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwb3NhanV3bmNxdmVsd2lnbXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNTQxNDIsImV4cCI6MjA4OTczMDE0Mn0.o0WYNnSj7GVdwRjZxCT73SceO1NFOYCyuvUFi5iftP8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);