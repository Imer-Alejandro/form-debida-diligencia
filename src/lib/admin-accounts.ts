import "server-only";
import { randomBytes } from "node:crypto";
import { getAdminApi, isAdminApiConfigured } from "@/lib/supabase/admin";

export interface AdminAccountRow {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignIn: string | null;
  confirmed: boolean;
}

interface PgQueryResult<T> {
  rows: T[];
  rowCount: number;
}

interface PgClientLike {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<PgQueryResult<T>>;
}

let pgPool: PgClientLike | null = null;

async function getPg(): Promise<PgClientLike> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("database_url_not_configured");
  if (!pgPool) {
    const mod = (await import("pg")) as {
      Pool: new (options: {
        connectionString: string;
        max: number;
        idleTimeoutMillis: number;
      }) => PgClientLike;
    };
    pgPool = new mod.Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 30_000,
    });
  }
  return pgPool;
}

/** Gestión de cuentas del panel /admin: Admin API si hay service-role key,
 *  y si no, SQL directo contra auth.users usando DATABASE_URL. */
export function isUserAdminConfigured(): boolean {
  return isAdminApiConfigured() || Boolean(process.env.DATABASE_URL);
}

export function generateAdminPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function listAdminAccounts(): Promise<AdminAccountRow[]> {
  if (isAdminApiConfigured()) {
    const admin = getAdminApi();
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);
    return (data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at ?? null,
      lastSignIn: u.last_sign_in_at ?? null,
      confirmed: Boolean(u.email_confirmed_at),
    }));
  }

  const pg = await getPg();
  const { rows } = await pg.query<{
    id: string;
    email: string;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
  }>(
    `select id, email, created_at, last_sign_in_at, email_confirmed_at
       from auth.users
      where deleted_at is null
      order by created_at desc`
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    lastSignIn: row.last_sign_in_at,
    confirmed: Boolean(row.email_confirmed_at),
  }));
}

export async function findAdminAccountIdByEmail(
  email: string
): Promise<string | null> {
  if (isAdminApiConfigured()) {
    const target = email.trim().toLowerCase();
    for (let page = 1; page <= 10; page += 1) {
      const admin = getAdminApi();
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) return null;
      const users = data?.users ?? [];
      const match = users.find((u) => (u.email ?? "").toLowerCase() === target);
      if (match) return match.id;
      if (users.length < 1000) return null;
    }
    return null;
  }
  const pg = await getPg();
  const { rows } = await pg.query<{ id: string }>(
    `select id from auth.users where lower(email) = lower($1) and deleted_at is null limit 1`,
    [email]
  );
  return rows[0]?.id ?? null;
}

export async function createAdminAccount(input: {
  email: string;
  password: string;
}): Promise<AdminAccountRow> {
  if (isAdminApiConfigured()) {
    const admin = getAdminApi();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("admin_api_no_user");
    return {
      id: data.user.id,
      email: data.user.email ?? input.email,
      createdAt: data.user.created_at ?? null,
      lastSignIn: null,
      confirmed: true,
    };
  }

  const pg = await getPg();
  const { rows } = await pg.query<{
    id: string;
    email: string;
    created_at: string;
  }>(
    `insert into auth.users
       (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_current,
        email_change_token_new, phone_change, phone_change_token, reauthentication_token)
     values
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
        'authenticated', $1, crypt($2, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now(),
        '', '', '', '', '', '', '', '')
     returning id, email, created_at`,
    [input.email, input.password]
  );
  const created = rows[0];
  if (!created) throw new Error("insert_user_failed");
  await pg.query(
    `insert into auth.identities
       (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email)
     select gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email), 'email',
            now(), now(), now(), u.email
       from auth.users u
      where u.id = $1`,
    [created.id]
  );
  return {
    id: created.id,
    email: created.email,
    createdAt: created.created_at,
    lastSignIn: null,
    confirmed: true,
  };
}

export async function updateAdminAccountPassword(
  id: string,
  password: string
): Promise<void> {
  if (isAdminApiConfigured()) {
    const admin = getAdminApi();
    const { error } = await admin.auth.admin.updateUserById(id, {
      password,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const pg = await getPg();
  const result = await pg.query(
    `update auth.users
        set encrypted_password = crypt($2, gen_salt('bf')), updated_at = now()
      where id = $1`,
    [id, password]
  );
  if (result.rowCount === 0) throw new Error("user_not_found");
}

export async function deleteAdminAccount(id: string): Promise<void> {
  if (isAdminApiConfigured()) {
    const admin = getAdminApi();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
    return;
  }
  const pg = await getPg();
  const result = await pg.query(`delete from auth.users where id = $1`, [id]);
  if (result.rowCount === 0) throw new Error("user_not_found");
}
