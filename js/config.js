/*
  STEP 1: Replace these two placeholders with your Supabase project values.
  Supabase Dashboard -> Project Settings -> API -> Project URL and anon/public key.
  The anon/publishable key is intended for browser use ONLY when RLS policies are enabled.
  Never put the service_role/secret key here.
*/
window.APP_CONFIG = {
  SUPABASE_URL: "https://fbhbgptynskcyoipvsne.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ZJCgfoz1cTHG7G99MjtRCQ_K2ANjRa3",
  STORAGE_BUCKET: "reminder-icons",
  MAX_ICON_BYTES: 1024 * 1024,
  // Add the PUBLIC VAPID key only after generating it for Phase 4B. Never put the private key here.
  VAPID_PUBLIC_KEY: "BJf9qRi_z5bpVTb81Srz2-cJ16QXZF2EhEmph7IUlWkh517RrjuQAlU02AeEyr9cyvbZvpNSBay3e5iZ0fcfFes"
};
