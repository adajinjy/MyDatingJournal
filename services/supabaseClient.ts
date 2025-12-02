
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Keys are stored in localStorage to persist across reloads
const STORE_KEY_URL = 'mydatingjournal_sb_url';
const STORE_KEY_ANON = 'mydatingjournal_sb_anon';

// Hardcoded defaults from user request to ensure immediate connection
const PROVIDED_URL = 'https://rkvvxsdmbkjzinpnvlku.supabase.co';
const PROVIDED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdnZ4c2RtYmtqemlucG52bGt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDc2NjUsImV4cCI6MjA4MDE4MzY2NX0.OozikORmXc41BYeZZbcfhBhTx6LZRuZtT3kDtZ-mqFk';

export const getSupabaseConfig = () => {
  let storedUrl = localStorage.getItem(STORE_KEY_URL);
  let storedKey = localStorage.getItem(STORE_KEY_ANON);

  // Validate stored URL to prevent garbage data from blocking defaults
  if (storedUrl && !storedUrl.startsWith('http')) {
      storedUrl = null;
  }

  return {
    // Prefer stored config if user changed it and it's valid, otherwise use the hardcoded provided values
    url: (storedUrl || PROVIDED_URL).trim(),
    key: (storedKey || PROVIDED_KEY).trim()
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem(STORE_KEY_URL, url.trim());
  localStorage.setItem(STORE_KEY_ANON, key.trim());
  // Force reload to re-init client
  window.location.reload();
};

let supabase: SupabaseClient | null = null;

const { url, key } = getSupabaseConfig();

if (url && key && url.startsWith('http')) {
  try {
    supabase = createClient(url, key);
  } catch (e) {
    console.error("Failed to init supabase", e);
  }
} else if (url || key) {
    console.warn("Supabase configuration found but invalid URL/Key format.");
}

export { supabase };
