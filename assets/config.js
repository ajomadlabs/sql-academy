/* Supabase connection.

   This key is PUBLIC and safe to commit — publishable/anon keys are
   designed to be shipped in a browser. It is safe ONLY because every
   table has Row Level Security enabled (see supabase/schema.sql), so
   the key by itself grants access to nothing.

   NEVER put the secret or service_role key here. Those bypass RLS
   entirely and would hand full database access to anyone who views
   source. If one is ever committed, rotate it immediately.

   Clear the values below to run the site in local-only mode:
   everything still works, progress just stays in that browser. */

window.SUPABASE_CONFIG = {
  url:     "https://bdmjcqqpcwroekajjeeu.supabase.co",
  anonKey: "sb_publishable_3KARG0HVO3RGrC2tO88vDQ_WcXppyOe",

  /* The remote practice database for the performance exercises.
     Leave false until supabase/lab/01..03 have been run on the project;
     until then the option is simply not offered. */
  lab: true
};
