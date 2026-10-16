-- =====================================================================
-- Sánchez Business & Corp. — Proveedores (Supplier Due Diligence)
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

-- Whether the compliance answers force a hard, automatic rejection:
-- questions 1, 2, 3, 4 and 6 answered "si" (fraud/corruption, sanctions,
-- termination for breach, litigation/insolvency, improper benefits).
create or replace function public.should_auto_reject(p_data jsonb)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(bool_or(
    (p_data #>> array['section8','compliance',(q - 1)::text,'answer']) = 'si'
  ), false)
  from unnest(array[1,2,3,4,6]) as q;
$$;
revoke all on function public.should_auto_reject from public;
grant execute on function public.should_auto_reject to anon, authenticated;

-- Submits the registration: BORRADOR / SOLICITUD_CAMBIOS -> PENDIENTE.
-- Registers flagged by should_auto_reject() are rejected on the spot.
create or replace function public.submit_registration(p_token text, p_data jsonb, p_language text)
returns public.supplier_registrations
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invitations;
  v_row public.supplier_registrations;
  v_auto_reject boolean;
  v_reasons jsonb := '[]'::jsonb;
  v_q int;
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

  -- Automatic rejection: any of the hard-stop compliance questions = "si".
  v_auto_reject := public.should_auto_reject(p_data);
  if v_auto_reject then
    foreach v_q in array array[1,2,3,4,6] loop
      if (p_data #>> array['section8','compliance',(v_q - 1)::text,'answer']) = 'si' then
        v_reasons := v_reasons || to_jsonb(v_q);
      end if;
    end loop;
  end if;

  -- populate denormalized analytics / filter columns
  v_row.data := p_data;
  update public.supplier_registrations
    set data = p_data,
        language = p_language,
        status = case when v_auto_reject then 'RECHAZADO' else 'PENDIENTE' end,
        risk_level = case when v_auto_reject then 'ALTO' else risk_level end,
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
    values (
      p_token,
      case when v_auto_reject then 'auto_rejected' else 'submitted' end,
      'registration',
      v_row.id::text,
      jsonb_build_object('reference', v_row.reference_no)
        || case when v_auto_reject then jsonb_build_object('reasons', v_reasons) else '{}'::jsonb end
    );

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
    public.supplier_can_edit_registration(
      registration_documents.invitation_token,
      registration_documents.registration_id
    )
  );

create or replace function public.attach_registration_document(
  p_token text,
  p_registration_id uuid,
  p_ref text,
  p_file_name text,
  p_file_size bigint,
  p_mime_type text,
  p_url text
)
returns public.registration_documents
language plpgsql security definer set search_path = public as $$
declare
  v_doc public.registration_documents;
begin
  if not public.supplier_can_edit_registration(p_token, p_registration_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Replace semantics: one row per (registration, ref). Re-attaching a document
  -- (resubmission after a change request) must not leave the old row behind.
  delete from public.registration_documents
    where registration_id = p_registration_id and ref = p_ref;

  insert into public.registration_documents (
    registration_id,
    invitation_token,
    ref,
    file_name,
    file_size,
    mime_type,
    url
  ) values (
    p_registration_id,
    p_token,
    p_ref,
    p_file_name,
    p_file_size,
    p_mime_type,
    p_url
  ) returning * into v_doc;

  return v_doc;
end;
$$;
revoke all on function public.attach_registration_document(text, uuid, text, text, bigint, text, text) from public;
grant execute on function public.attach_registration_document(text, uuid, text, text, bigint, text, text) to anon, authenticated;

drop policy if exists "documents are admin readable and editable" on public.registration_documents;
create policy "documents are admin readable and editable"
  on public.registration_documents for select
  using (auth.role() = 'authenticated');

drop policy if exists "supplier can remove documents from their draft" on public.registration_documents;
create policy "supplier can remove documents from their draft"
  on public.registration_documents for delete
  using (
    auth.role() = 'authenticated'
    or exists (
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

-- ---------------------------------------------------------------------
-- 7. supplier_alerts: outbound notification queue + log (email-first)
--    Rows are created by the alert engine (cron / admin "run now") and
--    sent through the corporate mailbox. `dedupe_key` makes the engine
--    idempotent: re-running it never re-sends the same reminder.
-- ---------------------------------------------------------------------
create table if not exists public.supplier_alerts (
  id bigint generated always as identity primary key,
  kind text not null,                            -- REGISTRY_EXPIRING | EXPORTER_CODE_EXPIRING | FORM_INCOMPLETE
  channel text not null default 'EMAIL',         -- EMAIL | WHATSAPP (future)
  audience text not null default 'SUPPLIER',     -- SUPPLIER | PURCHASING
  registration_id uuid references public.supplier_registrations(id) on delete cascade,
  invitation_id uuid references public.invitations(id) on delete cascade,
  recipient text,                                -- resolved e-mail at send time
  language text not null default 'es',
  subject text,
  body text,
  context jsonb not null default '{}'::jsonb,    -- {company, reference, date, days, link...}
  due_at date,
  status text not null default 'PENDING',        -- PENDING | SENT | FAILED | SKIPPED
  attempts int not null default 0,
  dedupe_key text not null unique,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_alerts_status_idx
  on public.supplier_alerts (status, created_at);
create index if not exists supplier_alerts_registration_idx
  on public.supplier_alerts (registration_id);

alter table public.supplier_alerts enable row level security;

-- Admins can inspect the log; only the service-role (cron) writes.
drop policy if exists "supplier alerts are admin readable" on public.supplier_alerts;
create policy "supplier alerts are admin readable"
  on public.supplier_alerts for select
  using (auth.role() = 'authenticated');

drop trigger if exists trg_supplier_alerts_updated on public.supplier_alerts;
create trigger trg_supplier_alerts_updated
  before update on public.supplier_alerts
  for each row execute function public.set_updated_at();

-- Pure (read-only) discovery of everything that deserves a reminder today.
-- Returns one jsonb per (record, kind, threshold); the engine turns each
-- entry into a deduplicated email. Approved suppliers get registry /
-- exporter-code reminders at each threshold in p_expiry_days, both to the
-- supplier and to the purchasing team; unfinished invitations get a weekly
-- nudge until they are completed or expire.
create or replace function public.get_alert_candidates(
  p_expiry_days int[] default array[30,15,5],
  p_form_min_age_days int default 3
) returns setof jsonb
language sql security definer set search_path = public stable as $$
  with approved as (
    select s.id,
           s.reference_no,
           s.company_name,
           s.language,
           s.invitation_id,
           i.supplier_email,
           nullif(s.data #>> '{section1,registryExpiry}', '')::date as registry_exp,
           nullif(s.data #>> '{section1,exporterCodeExpiry}', '')::date as exporter_exp
    from public.supplier_registrations s
    left join public.invitations i on i.id = s.invitation_id
    where s.status in ('APROBADO', 'APROBADO_CONDICIONES')
  ),
  windows as (select v as days from unnest(p_expiry_days) as v)
  select jsonb_build_object(
    'kind', 'REGISTRY_EXPIRING', 'audience', 'SUPPLIER',
    'registration_id', a.id, 'invitation_id', a.invitation_id,
    'recipient', a.supplier_email, 'language', a.language,
    'company', a.company_name, 'reference', a.reference_no,
    'date', a.registry_exp, 'days', w.days, 'due_at', a.registry_exp,
    'dedupe_key', 'REGISTRY_EXPIRING:SUPPLIER:' || a.id || ':' || a.registry_exp || ':' || w.days
  )
  from approved a cross join windows w
  where a.registry_exp is not null and a.registry_exp = current_date + w.days
  union all
  select jsonb_build_object(
    'kind', 'REGISTRY_EXPIRING', 'audience', 'PURCHASING',
    'registration_id', a.id, 'invitation_id', a.invitation_id,
    'recipient', null, 'language', a.language,
    'company', a.company_name, 'reference', a.reference_no,
    'date', a.registry_exp, 'days', w.days, 'due_at', a.registry_exp,
    'dedupe_key', 'REGISTRY_EXPIRING:PURCHASING:' || a.id || ':' || a.registry_exp || ':' || w.days
  )
  from approved a cross join windows w
  where a.registry_exp is not null and a.registry_exp = current_date + w.days
  union all
  select jsonb_build_object(
    'kind', 'EXPORTER_CODE_EXPIRING', 'audience', 'SUPPLIER',
    'registration_id', a.id, 'invitation_id', a.invitation_id,
    'recipient', a.supplier_email, 'language', a.language,
    'company', a.company_name, 'reference', a.reference_no,
    'date', a.exporter_exp, 'days', w.days, 'due_at', a.exporter_exp,
    'dedupe_key', 'EXPORTER_CODE_EXPIRING:SUPPLIER:' || a.id || ':' || a.exporter_exp || ':' || w.days
  )
  from approved a cross join windows w
  where a.exporter_exp is not null and a.exporter_exp = current_date + w.days
  union all
  select jsonb_build_object(
    'kind', 'EXPORTER_CODE_EXPIRING', 'audience', 'PURCHASING',
    'registration_id', a.id, 'invitation_id', a.invitation_id,
    'recipient', null, 'language', a.language,
    'company', a.company_name, 'reference', a.reference_no,
    'date', a.exporter_exp, 'days', w.days, 'due_at', a.exporter_exp,
    'dedupe_key', 'EXPORTER_CODE_EXPIRING:PURCHASING:' || a.id || ':' || a.exporter_exp || ':' || w.days
  )
  from approved a cross join windows w
  where a.exporter_exp is not null and a.exporter_exp = current_date + w.days
  union all
  select jsonb_build_object(
    'kind', 'FORM_INCOMPLETE', 'audience', 'SUPPLIER',
    'registration_id', r.id, 'invitation_id', i.id,
    'recipient', i.supplier_email, 'language', i.language, 'token', i.token,
    'company', coalesce(nullif(i.supplier_name, ''), r.company_name),
    'reference', r.reference_no, 'date', null,
    'days', greatest(floor(extract(epoch from (now() - least(i.created_at, coalesce(r.updated_at, i.created_at)))) / 86400)::int, 0),
    'due_at', null,
    'dedupe_key', 'FORM_INCOMPLETE:' || i.id || ':' || to_char(now(), 'IYYY-IW')
  )
  from public.invitations i
  left join public.supplier_registrations r on r.invitation_token = i.token
  where i.status in ('sent', 'in_progress')
    and coalesce(i.supplier_email, '') <> ''
    and (i.expires_at is null or i.expires_at > now())
    and least(i.created_at, coalesce(r.updated_at, i.created_at))
        < now() - make_interval(days => p_form_min_age_days);
$$;
revoke all on function public.get_alert_candidates(int[], int) from public;
grant execute on function public.get_alert_candidates(int[], int) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 8. supplier_evaluations: append-only risk-assessment history.
--    One row per "save" of the evaluation form, holding the 12-category
--    ratings, the red-flag marker, the computed level and the decision
--    snapshot. The registration's denormalized `risk_level` is kept in
--    sync via save_supplier_evaluation().
-- ---------------------------------------------------------------------
create table if not exists public.supplier_evaluations (
  id bigint generated always as identity primary key,
  registration_id uuid not null references public.supplier_registrations(id) on delete cascade,
  reference_no text,
  company_name text,
  outcome text not null default 'EN_REVISION',    -- status/decision at save time
  risk_level text not null default 'PENDIENTE',   -- computed risk level
  proposed_risk text,                             -- level proposed by purchasing
  review_type text,
  estimated_amount text,
  red_flag boolean not null default false,
  red_flag_notes text,
  average numeric(4,2),
  ratings jsonb not null default '{}'::jsonb,     -- {category: 1|2|3}
  triggers jsonb not null default '{}'::jsonb,    -- {finance,legal,technology}
  specialized jsonb not null default '{}'::jsonb, -- {finance,legal,technology} validations
  evaluation jsonb not null,                      -- full {section12, section13} snapshot
  created_by uuid,
  created_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists supplier_evaluations_registration_idx
  on public.supplier_evaluations (registration_id, created_at desc);

alter table public.supplier_evaluations enable row level security;

drop policy if exists "supplier evaluations are admin readable" on public.supplier_evaluations;
create policy "supplier evaluations are admin readable"
  on public.supplier_evaluations for select
  using (auth.role() = 'authenticated');

drop policy if exists "supplier evaluations are admin insertable" on public.supplier_evaluations;
create policy "supplier evaluations are admin insertable"
  on public.supplier_evaluations for insert
  with check (auth.role() = 'authenticated');

-- Records one evaluation snapshot and syncs the registration's risk_level.
-- SECURITY DEFINER so the admin API can call it in a single round-trip.
create or replace function public.save_supplier_evaluation(
  p_registration_id uuid,
  p_payload jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_risk text;
  v_reference text;
  v_company text;
begin
  v_risk := coalesce(nullif(p_payload->>'risk_level', ''), 'PENDIENTE');
  if v_risk not in ('BAJO', 'MEDIO', 'ALTO', 'CRITICO', 'PENDIENTE') then
    v_risk := 'PENDIENTE';
  end if;

  select reference_no, company_name
    into v_reference, v_company
    from public.supplier_registrations
   where id = p_registration_id;

  if not found then
    raise exception 'registration % not found', p_registration_id;
  end if;

  insert into public.supplier_evaluations (
    registration_id, reference_no, company_name, outcome, risk_level,
    proposed_risk, review_type, estimated_amount, red_flag, red_flag_notes,
    average, ratings, triggers, specialized, evaluation, created_by, created_by_email
  ) values (
    p_registration_id, v_reference, v_company,
    coalesce(nullif(p_payload->>'outcome', ''), 'EN_REVISION'),
    v_risk,
    nullif(p_payload->>'proposed_risk', ''),
    nullif(p_payload->>'review_type', ''),
    nullif(p_payload->>'estimated_amount', ''),
    coalesce((p_payload->>'red_flag')::boolean, false),
    nullif(p_payload->>'red_flag_notes', ''),
    nullif(p_payload->>'average', '')::numeric,
    coalesce(p_payload->'ratings', '{}'::jsonb),
    coalesce(p_payload->'triggers', '{}'::jsonb),
    coalesce(p_payload->'specialized', '{}'::jsonb),
    coalesce(p_payload->'evaluation', '{}'::jsonb),
    nullif(p_payload->>'created_by', '')::uuid,
    nullif(p_payload->>'created_by_email', '')
  )
  returning id into v_id;

  update public.supplier_registrations
     set risk_level = v_risk,
         evaluation = coalesce(p_payload->'evaluation', evaluation),
         updated_at = now()
   where id = p_registration_id;

  return v_id;
end;
$$;
revoke all on function public.save_supplier_evaluation(uuid, jsonb) from public;
grant execute on function public.save_supplier_evaluation(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 9. Requesting-area reports (no login): internal access links + the two
--    forms the area fills after being invited by Purchasing:
--      FIRST_PURCHASE -> service_evaluations (first purchase / service)
--      INCIDENT       -> supplier_incidents (incident report + follow-up)
-- ---------------------------------------------------------------------
create table if not exists public.internal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.supplier_registrations(id) on delete cascade,
  kind text not null,                              -- FIRST_PURCHASE | INCIDENT
  area text,
  recipient text,
  language text not null default 'es',
  token text not null unique,
  status text not null default 'PENDIENTE',        -- PENDIENTE | USADO | EXPIRADO
  expires_at timestamptz,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists internal_access_tokens_registration_idx
  on public.internal_access_tokens (registration_id, created_at desc);
create index if not exists internal_access_tokens_token_idx
  on public.internal_access_tokens (token);

alter table public.internal_access_tokens enable row level security;

drop policy if exists "internal tokens are admin readable" on public.internal_access_tokens;
create policy "internal tokens are admin readable"
  on public.internal_access_tokens for select
  using (auth.role() = 'authenticated');

drop policy if exists "internal tokens are admin insertable" on public.internal_access_tokens;
create policy "internal tokens are admin insertable"
  on public.internal_access_tokens for insert
  with check (auth.role() = 'authenticated');

create table if not exists public.service_evaluations (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.supplier_registrations(id) on delete cascade,
  token_id uuid references public.internal_access_tokens(id) on delete set null,
  area text,
  purchase_date date,
  category text,
  quality int,
  delivery int,
  price int,
  compliance int,
  service int,
  comments text,
  recommendation text,                             -- SEGUIR | MEJORAR | CAMBIAR
  created_at timestamptz not null default now()
);

create index if not exists service_evaluations_registration_idx
  on public.service_evaluations (registration_id, created_at desc);

alter table public.service_evaluations enable row level security;

drop policy if exists "service evaluations are admin readable" on public.service_evaluations;
create policy "service evaluations are admin readable"
  on public.service_evaluations for select
  using (auth.role() = 'authenticated');

create table if not exists public.supplier_incidents (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.supplier_registrations(id) on delete cascade,
  token_id uuid references public.internal_access_tokens(id) on delete set null,
  area text,
  incident_date date,
  kind text,
  description text,
  impact text,
  severity text not null default 'MEDIA',          -- BAJA | MEDIA | ALTA
  status text not null default 'ABIERTA',          -- ABIERTA | EN_SEGUIMIENTO | CORRECCION_SOLICITADA | RESUELTA | CERRADA
  recommended_action text not null default 'NINGUNO', -- NINGUNO | CORREGIR | SUSPENDER | DESHOMOLOGAR
  resolution_notes text,
  resolved_at timestamptz,
  reported_by text,
  contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_incidents_registration_idx
  on public.supplier_incidents (registration_id, created_at desc);

alter table public.supplier_incidents enable row level security;

drop policy if exists "supplier incidents are admin readable" on public.supplier_incidents;
create policy "supplier incidents are admin readable"
  on public.supplier_incidents for select
  using (auth.role() = 'authenticated');

drop policy if exists "supplier incidents are admin editable" on public.supplier_incidents;
create policy "supplier incidents are admin editable"
  on public.supplier_incidents for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists trg_supplier_incidents_updated on public.supplier_incidents;
create trigger trg_supplier_incidents_updated
  before update on public.supplier_incidents
  for each row execute function public.set_updated_at();

-- Resolve a link token into everything the public form needs (no auth).
create or replace function public.get_internal_access_for_token(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'kind', t.kind,
    'area', t.area,
    'language', t.language,
    'status', case
      when t.used_at is not null then 'USADO'
      when t.expires_at is not null and t.expires_at <= now() then 'EXPIRADO'
      else 'PENDIENTE' end,
    'registration_id', t.registration_id,
    'company', r.company_name,
    'reference', r.reference_no
  )
  from public.internal_access_tokens t
  join public.supplier_registrations r on r.id = t.registration_id
  where t.token = p_token
  limit 1;
$$;

-- Store a filled form and burn the token. SECURITY DEFINER so the anonymous
-- requesting area can write without any table privileges.
create or replace function public.submit_internal_response(p_token text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t public.internal_access_tokens;
  v_id uuid;
begin
  select * into v_t from public.internal_access_tokens where token = p_token for update;
  if not found then raise exception 'invalid_token'; end if;
  if v_t.used_at is not null then raise exception 'already_used'; end if;
  if v_t.expires_at is not null and v_t.expires_at <= now() then raise exception 'expired_token'; end if;

  if v_t.kind = 'FIRST_PURCHASE' then
    insert into public.service_evaluations (
      registration_id, token_id, area, purchase_date, category,
      quality, delivery, price, compliance, service, comments, recommendation
    ) values (
      v_t.registration_id, v_t.id,
      coalesce(nullif(p_data->>'area', ''), v_t.area),
      nullif(p_data->>'purchase_date', '')::date,
      nullif(p_data->>'category', ''),
      nullif(p_data->>'quality', '')::int,
      nullif(p_data->>'delivery', '')::int,
      nullif(p_data->>'price', '')::int,
      nullif(p_data->>'compliance', '')::int,
      nullif(p_data->>'service', '')::int,
      nullif(p_data->>'comments', ''),
      nullif(p_data->>'recommendation', '')
    ) returning id into v_id;
  elsif v_t.kind = 'INCIDENT' then
    insert into public.supplier_incidents (
      registration_id, token_id, area, incident_date, kind, description,
      impact, severity, reported_by, contact
    ) values (
      v_t.registration_id, v_t.id,
      coalesce(nullif(p_data->>'area', ''), v_t.area),
      nullif(p_data->>'incident_date', '')::date,
      nullif(p_data->>'kind', ''),
      nullif(p_data->>'description', ''),
      nullif(p_data->>'impact', ''),
      coalesce(nullif(p_data->>'severity', ''), 'MEDIA'),
      nullif(p_data->>'reported_by', ''),
      nullif(p_data->>'contact', '')
    ) returning id into v_id;
  else
    raise exception 'invalid_kind';
  end if;

  update public.internal_access_tokens
     set used_at = now(), status = 'USADO'
   where id = v_t.id;

  insert into public.activity_log (actor, action, subject_type, subject_id, detail)
  values (
    coalesce(nullif(p_data->>'reported_by', ''), nullif(p_data->>'area', ''), v_t.area, 'area'),
    case when v_t.kind = 'FIRST_PURCHASE'
         then 'SERVICE_EVALUATION_SUBMITTED' else 'INCIDENT_REPORTED' end,
    'registration', v_t.registration_id::text,
    jsonb_build_object('kind', v_t.kind, 'record_id', v_id)
  );

  return jsonb_build_object('id', v_id, 'kind', v_t.kind);
end;
$$;

revoke all on function public.get_internal_access_for_token(text) from public;
grant execute on function public.get_internal_access_for_token(text) to anon, authenticated, service_role;
revoke all on function public.submit_internal_response(text, jsonb) from public;
grant execute on function public.submit_internal_response(text, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 11. get_portal_status: public supplier status check
-- ---------------------------------------------------------------------
create or replace function public.get_portal_status(p_query text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_clean text;
  v_row record;
  v_inv record;
  v_docs_count int := 0;
begin
  v_clean := trim(coalesce(p_query, ''));
  if v_clean ~* '/i/' then
    v_clean := substring(v_clean from '/i/([A-Za-z0-9]+)');
  end if;
  v_clean := upper(trim(v_clean));

  if length(v_clean) = 0 then
    return jsonb_build_object('found', false, 'error', 'empty_query');
  end if;

  -- 1. Try matching by invitation_token, reference_no, or tax_id (exact)
  select r.* into v_row
  from public.supplier_registrations r
  where upper(r.invitation_token) = v_clean
     or upper(r.reference_no) = v_clean
     or replace(replace(upper(coalesce(r.tax_id, '')), '-', ''), ' ', '') = replace(replace(v_clean, '-', ''), ' ', '')
  order by r.created_at desc limit 1;

  -- 2. If not found, try matching by provider NAME (exact, case-insensitive)
  if v_row is null then
    select r.* into v_row
    from public.supplier_registrations r
    where upper(trim(coalesce(r.company_name, ''))) = v_clean
       or upper(trim(coalesce(r.commercial_name, ''))) = v_clean
       or upper(trim(coalesce(r.data->'section1'->>'legalName', ''))) = v_clean
       or upper(trim(coalesce(r.data->'section1'->>'commercialName', ''))) = v_clean
    order by r.created_at desc limit 1;
  end if;

  -- 3. If still not found, try a partial NAME match (min. 3 characters)
  if v_row is null and length(v_clean) >= 3 then
    select r.* into v_row
    from public.supplier_registrations r
    where coalesce(r.company_name, '') ilike '%' || v_clean || '%'
       or coalesce(r.commercial_name, '') ilike '%' || v_clean || '%'
       or (r.data->'section1'->>'legalName') ilike '%' || v_clean || '%'
       or (r.data->'section1'->>'commercialName') ilike '%' || v_clean || '%'
    order by r.created_at desc limit 1;
  end if;

  -- If not in registrations, check invitations (brand new invited supplier who hasn't drafted yet)
  if v_row is null then
    select * into v_inv from public.invitations i
    where upper(i.token) = v_clean
       or upper(trim(coalesce(i.supplier_name, ''))) = v_clean
       or (length(v_clean) >= 3 and i.supplier_name ilike '%' || v_clean || '%')
    order by i.created_at desc limit 1;
    if v_inv is not null then
      return jsonb_build_object(
        'found', true,
        'reference_no', null,
        'company_name', v_inv.supplier_name,
        'tax_id', null,
        'provider_type', null,
        'status', 'SIN_INICIAR',
        'submitted_at', null,
        'created_at', v_inv.created_at,
        'updated_at', v_inv.created_at,
        'can_edit', true,
        'invitation_token', v_inv.token,
        'note', v_inv.note,
        'documents_count', 0
      );
    end if;
    return jsonb_build_object('found', false);
  end if;

  -- Count uploaded documents
  select count(*) into v_docs_count from public.registration_documents d where d.registration_id = v_row.id;

  -- Get invitation note if any
  select * into v_inv from public.invitations i where i.id = v_row.invitation_id or i.token = v_row.invitation_token limit 1;

  return jsonb_build_object(
    'found', true,
    'reference_no', v_row.reference_no,
    'company_name', coalesce(nullif(v_row.commercial_name, ''), nullif(v_row.company_name, ''), v_inv.supplier_name, 'Proveedor'),
    'commercial_name', v_row.commercial_name,
    'tax_id', v_row.tax_id,
    'provider_type', v_row.provider_type,
    'country', v_row.country,
    'status', v_row.status,
    'submitted_at', v_row.submitted_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'can_edit', (v_row.status in ('BORRADOR', 'SOLICITUD_CAMBIOS')),
    'invitation_token', v_row.invitation_token,
    'note', v_inv.note,
    'documents_count', v_docs_count
  );
end; $$;

revoke all on function public.get_portal_status from public;
grant execute on function public.get_portal_status to anon, authenticated, service_role;


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