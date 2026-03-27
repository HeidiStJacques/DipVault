import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sqygmgkyjmuxoqatwnli.supabase.co';
const supabaseAnonKey = 'sb_publishable_yikYxkTkF0vCQk2-_-xZBA_tORtdhl9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);