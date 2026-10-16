import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../.env.local") });

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL.");
}
if (!adminEmail) {
  throw new Error("Falta ADMIN_EMAIL para asignar el rol inicial de administrador.");
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query("begin");
  await client.query(
    readFileSync(resolve(here, "../supabase/security-sla.sql"), "utf8")
  );

  const { rows } = await client.query(
    "select id from auth.users where lower(email) = $1 limit 1",
    [adminEmail]
  );
  if (!rows[0]) {
    throw new Error(`No existe el usuario administrador ${adminEmail}.`);
  }

  await client.query(
    `insert into public.app_user_roles (user_id, role, department)
     values ($1, 'ADMIN', null)
     on conflict (user_id) do update
       set role = 'ADMIN', department = null, updated_at = now()`,
    [rows[0].id]
  );
  await client.query("commit");
  console.log("Migración de seguridad/SLA aplicada y administrador inicial asignado.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("No se pudo aplicar la migración de seguridad/SLA:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
