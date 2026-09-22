-- =====================================================================
-- Sanchez Business Corp — Proveedores (Supplier Due Diligence)
-- Run this in: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. app_config: server-side secrets kept encrypted in the database
-- ---------------------------------------------------------------------
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Anyone can read the *encrypted* value; it is useless without ONEDRIVE_CONFIG_SECRET.
drop policy if exists "app_config is publicly readable" on public.app_config;
create policy "app_config is publicly readable"
  on public.app_config for select
  using (true);

-- Only signed-in users can write configuration.
drop policy if exists "app_config is admin writable" on public.app_config;
create policy "app_config is admin writable"
  on public.app_config for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Safe rotation helper: only callers that already know the current encrypted
-- value (i.e. possess ONEDRIVE_CONFIG_SECRET) can replace it. Used because
-- Microsoft rotates refresh tokens.
create or replace function public.rotate_config(p_key text, p_old_value text, p_new_value text)
returns boolean language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  select value into cur from public.app_config where key = p_key for update;
  if cur is distinct from p_old_value then
    return false;
  end if;
  insert into public.app_config(key, value, updated_at)
    values (p_key, p_new_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return true;
end; $$;
revoke all on function public.rotate_config from public;
grant execute on function public.rotate_config to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. invitations: QR / link sent to each supplier
-- ---------------------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  supplier_email text,
  supplier_name text,
  note text,
  status text not null default 'sent',           -- sent | in_progress | completed
  language text not null default 'es',           -- es | en
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_opened_at timestamptz
);

alter table public.invitations enable row level security;

-- Tokens are random (32+ chars) and treated as registration credentials.
drop policy if exists "invitations are readable by token" on public.invitations;
create policy "invitations are readable by token"
  on public.invitations for select
  using (true);

drop policy if exists "invitations are admin managed" on public.invitations;
create policy "invitations are admin managed"
  on public.invitations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- 3. supplier_registrations: the full payload (sections 1-14)
-- ---------------------------------------------------------------------
create table if not exists public.supplier_registrations (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references public.invitations(id) on delete set null,
  invitation_token text,
  reference_no text unique,
  status text not null default 'BORRADOR',        -- BORRADOR | PENDIENTE | EN_REVISION |
                                                  -- APROBADO | APROBADO_CONDICIONES | RECHAZADO | SOLICITUD_CAMBIOS
  risk_level text default 'PENDIENTE',            -- BAJO | MEDIO | ALTO | CRITICO | PENDIENTE
  language text not null default 'es',
  data jsonb not null default '{}'::jsonb,
  evaluation jsonb,
  tags text[] not null default '{}',

  -- denormalized search / filter / analytics columns
  company_name text,
  commercial_name text,
  provider_type text,
  tax_id text,
  country text default 'República Dominicana',
  province text,
  primary_activity text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_registrations enable row level security;

-- Suppliers never touch this table directly: they go through the
-- save_registration_draft / submit_registration functions below, and read
-- only their own row through get_registration_for_token.

drop policy if exists "registrations are admin readable and editable" on public.supplier_registrations;
create policy "registrations are admin readable and editable"
  on public.supplier_registrations for select
  using (auth.role() = 'authenticated');

drop policy if exists "registrations are admin editable" on public.supplier_registrations;
create policy "registrations are admin editable"
  on public.supplier_registrations for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "registrations are admin deletable" on public.supplier_registrations;
create policy "registrations are admin deletable"
  on public.supplier_registrations for delete
  using (auth.role() = 'authenticated');

-- Sequential references: SB-YYYY-0001
create sequence if not exists public.sb_ref_seq;

-- Returns the supplier's own registration (if any) for a given invitation
-- token. SECURITY DEFINER: only the holder of the token can read its row.
create or replace function public.get_registration_for_token(p_token text)
returns setof public.supplier_registrations
language sql security definer set search_path = public as $$
  select r.* from public.supplier_registrations r
  where r.invitation_token = p_token
  order by r.created_at desc limit 1;
$$;
revoke all on function public.get_registration_for_token from public;
grant execute on function public.get_registration_for_token to anon, authenticated;

-- Whether the token holder may edit their registration (draft or open resubmission).
create or replace function public.supplier_can_edit_registration(p_token text, p_registration_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.supplier_registrations r
    where r.id = p_registration_id
      and r.invitation_token = p_token
      and r.status in ('BORRADOR', 'SOLICITUD_CAMBIOS')
  );
$$;
revoke all on function public.supplier_can_edit_registration from public;
grant execute on function public.supplier_can_edit_registration to anon, authenticated;

-- Creates or updates the supplier draft and returns the stored row.
create or replace function public.save_registration_draft(p_token text, p_data jsonb, p_language text)
returns public.supplier_registrations
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invitations;
  v_row public.supplier_registrations;
begin
  select * into v_inv from public.invitations i where i.token = p_token;
  if not found then
    raise exception 'invalid_token' using errcode = '22000';
  end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    raise exception 'expired_token' using errcode = '22000';
  end if;

  select * into v_row from public.supplier_registrations r
    where r.invitation_token = p_token order by r.created_at desc limit 1;

  if not found then
    insert into public.supplier_registrations
      (invitation_id, invitation_token, reference_no, status, language, data)
    values
      (v_inv.id, p_token,
       'SB-' || to_char(now(), 'YYYY') || '-' || lpad((nextval('public.sb_ref_seq') % 100000)::text, 4, '0'),
       'BORRADOR', p_language, p_data)
    returning * into v_row;
    update public.invitations set status = 'in_progress', last_opened_at = now()
      where id = v_inv.id;
  else
    if v_row.status in ('BORRADOR', 'SOLICITUD_CAMBIOS') then
      update public.supplier_registrations
        set data = p_data, language = p_language, status = 'BORRADOR'
        where id = v_row.id
      returning * into v_row;
    end if;
  end if;

  insert into public.activity_log (actor, action, subject_type, subject_id, detail)
    values (p_token, 'saved_draft', 'registration', v_row.id::text, jsonb_build_object('status', v_row.status));

  return v_row;
end; $$;
revoke all on function public.save_registration_draft from public;
grant execute on function public.save_registration_draft to anon, authenticated;

-- Submits the registration: BORRADOR / SOLICITUD_CAMBIOS -> PENDIENTE.
create or replace function public.submit_registration(p_token text, p_data jsonb, p_language text)
returns public.supplier_registrations
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invitations;
  v_row public.supplier_registrations;
begin
  select * into v_inv from public.invitations i where i.token = p_token;
  if not found then
    raise exception 'invalid_token' using errcode = '22000';
  end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    raise exception 'expired_token' using errcode = '22000';
  end if;

  select * into v_row from public.supplier_registrations r
    where r.invitation_token = p_token order by r.created_at desc limit 1;
  if not found then
    raise exception 'no_draft' using errcode = '22000';
  end if;
  if v_row.status not in ('BORRADOR', 'SOLICITUD_CAMBIOS') then
    raise exception 'already_submitted' using errcode = '22000';
  end if;

  -- populate denormalized analytics / filter columns
  v_row.data := p_data;
  update public.supplier_registrations
    set data = p_data,
        language = p_language,
        status = 'PENDIENTE',
        submitted_at = now(),
        company_name = coalesce(nullif(p_data #>> '{section1,legalName}', ''), v_row.company_name),
        commercial_name = coalesce(nullif(p_data #>> '{section1,commercialName}', ''), v_row.commercial_name),
        provider_type = coalesce(nullif(p_data #>> '{section1,providerType}', ''), v_row.provider_type),
        tax_id = coalesce(nullif(p_data #>> '{section1,taxId}', ''), v_row.tax_id),
        province = coalesce(nullif(p_data #>> '{section1,provinceCountry}', ''), v_row.province),
        primary_activity = coalesce(nullif(p_data #>> '{section1,mainEconomicActivity}', ''), v_row.primary_activity)
    where id = v_row.id
  returning * into v_row;

  update public.invitations set status = 'completed', last_opened_at = now()
    where id = v_inv.id;

  insert into public.activity_log (actor, action, subject_type, subject_id, detail)
    values (p_token, 'submitted', 'registration', v_row.id::text, jsonb_build_object('reference', v_row.reference_no));

  return v_row;
end; $$;
revoke all on function public.submit_registration from public;
grant execute on function public.submit_registration to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. registration_documents: metadata + OneDrive links (files never
--    touch our servers, they live in the company OneDrive)
-- ---------------------------------------------------------------------
create table if not exists public.registration_documents (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.supplier_registrations(id) on delete cascade,
  invitation_token text,
  ref text not null,                              -- 'A'..'P' (document key from section 9)
  file_name text,
  file_size bigint,
  mime_type text,
  url text,                                       -- OneDrive shared link
  created_at timestamptz not null default now()
);

alter table public.registration_documents enable row level security;

drop policy if exists "suppliers can attach documents with a valid token" on public.registration_documents;
create policy "suppliers can attach documents with a valid token"
  on public.registration_documents for insert
  with check (
    exists (
      select 1 from public.supplier_registrations r
      where r.id = registration_documents.registration_id
        and r.invitation_token = registration_documents.invitation_token
        and r.status in ('BORRADOR', 'SOLICITUD_CAMBIOS')
    )
  );

drop policy if exists "documents are admin readable and editable" on public.registration_documents;
create policy "documents are admin readable and editable"
  on public.registration_documents for select
  using (auth.role() = 'authenticated');

drop policy if exists "supplier can remove documents from their draft" on public.registration_documents;
create policy "supplier can remove documents from their draft"
  on public.registration_documents for delete
  using (
    exists (
      select 1 from public.supplier_registrations r
      where r.id = registration_documents.registration_id
        and r.invitation_token = registration_documents.invitation_token
    )
  );

-- Suppliers read their own attached documents through this function.
create or replace function public.get_documents_for_token(p_token text)
returns setof public.registration_documents
language sql security definer set search_path = public as $$
  select d.* from public.registration_documents d
  join public.supplier_registrations r on r.id = d.registration_id
  where r.invitation_token = p_token
  order by d.created_at;
$$;
revoke all on function public.get_documents_for_token from public;
grant execute on function public.get_documents_for_token to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. activity_log: audit trail
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  actor text not null,                            -- supplier token | admin email
  action text not null,                           -- created | submitted | evaluated | document_uploaded ...
  subject_type text not null,
  subject_id text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

drop policy if exists "activity log is admin only" on public.activity_log;
create policy "activity log is admin only"
  on public.activity_log for select
  using (auth.role() = 'authenticated');

drop policy if exists "activity log is appendable" on public.activity_log;
create policy "activity log is appendable"
  on public.activity_log for insert
  with check (true);

-- ---------------------------------------------------------------------
-- 6. updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_supplier_registrations_updated on public.supplier_registrations;
create trigger trg_supplier_registrations_updated
  before update on public.supplier_registrations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_app_config_updated on public.app_config;
create trigger trg_app_config_updated
  before update on public.app_config
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Optional (recommended): create your first administrator.
-- Replace the e-mail and set a strong password, then run:
-- =====================================================================
-- insert into auth.users (email, password_hash, email_confirmed_at)
-- values (
--   'admin@sanchezbusinesscorp.com',
--   crypt('ChangeMe123!', gen_salt('bf')),
--   now()
-- );
-- NOTE: easier alternative -> Dashboard > Authentication > Users > Add user.