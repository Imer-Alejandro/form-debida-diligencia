/**
 * One-time setup for the Supabase database + admin user.
 *
 * Usage:
 *   npm run setup:db
 *
 * Required in .env.local:
 *   DATABASE_URL            Postgres connection string (Dashboard -> Settings -> Database -> Connection string)
 *   ADMIN_EMAIL             Admin e-mail for /admin/login
 *   ADMIN_PASSWORD          Admin password (>= 8 chars)
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY   Recommended. Creates the admin via the Admin API
 *                               (works on every Supabase version). Without it, a
 *                               manual auth.users insert is used (may fail on
 *                               newer Supabase versions due to GoTrue schema drift).
 *
 * What it does:
 *   1. Executes supabase/schema.sql against the database.
 *   2. Creates the admin user and verifies login works.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@sanchezbusinesscorp.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL. Obtenla en Supabase Dashboard -> Settings -> Database -> Connection string.");
  process.exit(1);
}
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error("Falta ADMIN_PASSWORD (>= 8 caracteres).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function verifyLogin() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const { data, error } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  return error ? { ok: false, message: error.message } : { ok: true, user: data.user.email };
}

async function main() {
  await client.connect();

  const sql = readFileSync(resolve(here, "../supabase/schema.sql"), "utf8");
  await client.query(sql);
  console.log("✓ supabase/schema.sql ejecutado");

  if (SERVICE_ROLE) {
    // ------------------------------------------------------------------
    // Preferred path: Admin API. Recreates the user cleanly if it exists.
    // ------------------------------------------------------------------
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const found = await sb.auth.admin.getUserByEmail(ADMIN_EMAIL);
    let existingId =
      found.data && found.data.user ? found.data.user.id : null;
    if (existingId) {
      await client.query("delete from auth.identities where user_id = $1", [existingId]);
      await client.query("delete from auth.users where id = $1", [existingId]);
      console.log("✓ Usuario previo eliminado para recrearlo correctamente");
    }

    const { error } = await sb.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Admin API: ${error.message}`);
    console.log(`✓ Usuario admin creado vía Admin API: ${ADMIN_EMAIL}`);
  } else {
    // ------------------------------------------------------------------
    // Fallback: manual insert (may not work on newer Supabase versions)
    // ------------------------------------------------------------------
    console.warn(
      "⚠  Sin SUPABASE_SERVICE_ROLE_KEY: intentando insert manual en auth.users (puede fallar según la versión de Supabase)."
    );
    const passwordHash = `crypt(${client.escapeLiteral(ADMIN_PASSWORD)}, gen_salt('bf'))`;
    const existing = await client.query("select id from auth.users where email = $1 limit 1", [ADMIN_EMAIL]);
    let userId = existing.rowCount > 0 ? existing.rows[0].id : null;

    if (userId) {
      await client.query("delete from auth.identities where user_id = $1", [userId]);
      await client.query("delete from auth.users where id = $1", [userId]);
      console.log("✓ Usuario previo eliminado para recrearlo correctamente");
    }

    const userIns = await client.query(
      `insert into auth.users
         (instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token, recovery_token)
       values
         ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
          ${passwordHash},
          now(), '{"provider":"email","providers":["email"]}', '{}',
          now(), now(), '', '')
       returning id`,
      [ADMIN_EMAIL]
    );
    userId = userIns.rows[0].id;
    await client.query(
      `insert into auth.identities
         (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       select gen_random_uuid(), u.id, u.id::text,
              jsonb_build_object('sub', u.id::text, 'email', u.email), 'email',
              now(), now(), now()
       from auth.users u
       where u.id = $1`,
      [userId]
    );
    console.log(`✓ Usuario admin creado (manual): ${ADMIN_EMAIL}`);
  }

  const check = await verifyLogin();
  console.log(
    check.ok
      ? `✓ Login verificado OK para ${check.user}`
      : `✗ Login NO funciona: ${check.message}. Recomiendo añadir SUPABASE_SERVICE_ROLE_KEY y volver a ejecutar npm run setup:db.`
  );

  console.log("");
  console.log("Listo. Entra a /admin/login con esas credenciales.");
  await client.end();
}

main().catch(async (e) => {
  console.error("✗ Error:", e.message);
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});