/**
 * One-time setup for the Supabase database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:...@...:5432/postgres node scripts/setup-db.mjs
 *
 * Or set DATABASE_URL (and optionally ADMIN_EMAIL / ADMIN_PASSWORD) in .env.local and run:
 *   npm run setup:db
 *
 * What it does:
 *   1. Executes supabase/schema.sql against the database.
 *   2. Creates (or flags) the admin user for /admin/login in Supabase Auth.
 *
 * Get the connection string in Supabase Dashboard -> Settings -> Database
 * (Connection string -> "Direct connection"), appending the pooler port if needed.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@sanchezbusinesscorp.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL. Obtén la cadena de conexión en Supabase Dashboard -> Settings -> Database -> Connection string y pásala por variable de entorno."
  );
  process.exit(1);
}

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error(
    "Falta ADMIN_PASSWORD (>= 8 caracteres). Ej.: ADMIN_PASSWORD='tu-clave'"
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();

  const sql = readFileSync(resolve(here, "../supabase/schema.sql"), "utf8");
  await client.query(sql);
  console.log("✓ supabase/schema.sql ejecutado");

  const passwordHash = `crypt(${client.escapeLiteral(ADMIN_PASSWORD)}, gen_salt('bf'))`;

  const existing = await client.query(
    "select id from auth.users where email = $1 limit 1",
    [ADMIN_EMAIL]
  );

  if (existing.rowCount > 0) {
    console.log(`✓ El usuario ${ADMIN_EMAIL} ya existe en auth.users (no se modifica)`);
  } else {
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
    const userId = userIns.rows[0].id;

    await client.query(
      `insert into auth.identities
         (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email)
       values
         (gen_random_uuid(), $1, $1::text,
          jsonb_build_object('sub', $1::text, 'email', $2), 'email',
          now(), now(), now(), $2)`,
      [userId, ADMIN_EMAIL]
    );
    console.log(`✓ Usuario admin creado: ${ADMIN_EMAIL}`);
  }

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