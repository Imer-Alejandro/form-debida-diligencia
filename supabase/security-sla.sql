-- Apply after schema.sql. This migration is safe to re-run.

create table if not exists public.review_departments (
  id text primary key,
  name text not null,
  active boolean not null default true,
  recipient_email text,
  escalation_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.review_departments (id, name) values
  ('FINANCE', 'Finanzas'),
  ('LEGAL', 'Legal'),
  ('TECHNOLOGY', 'Tecnología'),
  ('TECHNICAL', 'Área técnica')
on conflict (id) do nothing;

create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in (
    'ADMIN', 'MANAGEMENT', 'PURCHASING', 'DEPARTMENT_REVIEWER', 'READ_ONLY'
  )),
  department text references public.review_departments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_user_roles_department_check check (
    (role = 'DEPARTMENT_REVIEWER' and department is not null)
    or (role <> 'DEPARTMENT_REVIEWER' and department is null)
  )
);

create table if not exists public.business_holidays (
  holiday_date date primary key,
  name text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.department_reviews (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.supplier_registrations(id) on delete cascade,
  department text not null references public.review_departments(id),
  request_reason text,
  required boolean not null default true,
  status text not null default 'REQUESTED' check (status in (
    'REQUESTED', 'IN_REVIEW', 'INFO_REQUESTED', 'COMPLETED', 'CANCELLED'
  )),
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  received_at timestamptz,
  due_at timestamptz,
  remaining_sla_seconds integer not null default 259200 check (remaining_sla_seconds >= 0),
  paused_at timestamptz,
  response_status text check (response_status in ('APPROVED', 'OBSERVATIONS', 'REJECTED')),
  response_notes text,
  scores jsonb,
  score_average numeric(3,2) check (score_average is null or (score_average >= 1 and score_average <= 5)),
  score_band text check (score_band is null or score_band in ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  last_escalated_at timestamptz,
  escalation_claimed_at timestamptz,
  escalation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, department)
);
alter table public.department_reviews
  add column if not exists request_reason text;
alter table public.department_reviews
  add column if not exists escalation_claimed_at timestamptz;
alter table public.department_reviews
  add column if not exists scores jsonb;
alter table public.department_reviews
  add column if not exists score_average numeric(3,2);
alter table public.department_reviews
  add column if not exists score_band text;
alter table public.department_reviews
  add column if not exists requested_by uuid references auth.users(id) on delete set null;
alter table public.department_reviews
  add column if not exists requested_at timestamptz not null default now();
alter table public.department_reviews
  add column if not exists sent_at timestamptz;
alter table public.department_reviews
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.department_reviews
  add column if not exists received_at timestamptz;
alter table public.department_reviews
  add column if not exists due_at timestamptz;
alter table public.department_reviews
  add column if not exists remaining_sla_seconds integer not null default 259200;
alter table public.department_reviews
  add column if not exists paused_at timestamptz;
alter table public.department_reviews
  add column if not exists response_status text;
alter table public.department_reviews
  add column if not exists response_notes text;
alter table public.department_reviews
  add column if not exists responded_by uuid references auth.users(id) on delete set null;
alter table public.department_reviews
  add column if not exists responded_at timestamptz;
alter table public.department_reviews
  add column if not exists last_escalated_at timestamptz;
alter table public.department_reviews
  add column if not exists escalation_count integer not null default 0;
alter table public.department_reviews
  add column if not exists created_at timestamptz not null default now();
alter table public.department_reviews
  add column if not exists updated_at timestamptz not null default now();

create index if not exists department_reviews_status_due_idx
  on public.department_reviews (status, due_at);
create index if not exists department_reviews_registration_idx
  on public.department_reviews (registration_id, department);

create table if not exists public.department_review_events (
  id bigint generated always as identity primary key,
  review_id uuid not null references public.department_reviews(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.department_review_events
  add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table public.department_review_events
  add column if not exists action text;
alter table public.department_review_events
  add column if not exists notes text;
alter table public.department_review_events
  add column if not exists created_at timestamptz not null default now();
create index if not exists department_review_events_review_idx
  on public.department_review_events (review_id, created_at);

create table if not exists public.approval_exceptions (
  id bigint generated always as identity primary key,
  registration_id uuid not null references public.supplier_registrations(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  actor_email text,
  reason text not null check (length(trim(reason)) >= 10),
  pending_reviews jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.approval_exceptions
  add column if not exists actor_email text;

create or replace function public.has_app_role(p_roles text[])
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_user_roles r
    where r.user_id = auth.uid() and r.role = any(p_roles)
  );
$$;
revoke all on function public.has_app_role(text[]) from public;
grant execute on function public.has_app_role(text[]) to authenticated, service_role;

create or replace function public.can_access_supplier_registration(p_registration_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'READ_ONLY'])
    or exists (
      select 1
      from public.department_reviews dr
      join public.app_user_roles ur
        on ur.user_id = auth.uid()
       and ur.role = 'DEPARTMENT_REVIEWER'
       and ur.department = dr.department
      where dr.registration_id = p_registration_id
        and dr.status <> 'CANCELLED'
        and (dr.assigned_to is null or dr.assigned_to = auth.uid())
    );
$$;
revoke all on function public.can_access_supplier_registration(uuid) from public;
grant execute on function public.can_access_supplier_registration(uuid) to authenticated, service_role;

create or replace function public.business_seconds_between(p_start timestamptz, p_end timestamptz)
returns integer
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_cursor timestamptz := p_start;
  v_end timestamptz := p_end;
  v_day_end timestamptz;
  v_local_date date;
  v_total integer := 0;
begin
  if p_start is null or p_end is null or p_end <= p_start then return 0; end if;
  while v_cursor < v_end loop
    v_local_date := (v_cursor at time zone 'America/Santo_Domingo')::date;
    v_day_end := ((v_local_date + 1)::timestamp at time zone 'America/Santo_Domingo');
    if extract(isodow from v_local_date) < 6
      and not exists (
        select 1 from public.business_holidays h
        where h.holiday_date = v_local_date and h.active
      )
    then
      v_total := v_total + greatest(
        0,
        floor(extract(epoch from (least(v_day_end, v_end) - v_cursor)))::integer
      );
    end if;
    v_cursor := least(v_day_end, v_end);
  end loop;
  return v_total;
end;
$$;

create or replace function public.add_business_seconds(p_start timestamptz, p_seconds integer)
returns timestamptz
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_local timestamp;
  v_local_date date;
  v_remaining integer := greatest(coalesce(p_seconds, 0), 0);
  v_available integer;
  v_day_end timestamptz;
begin
  if p_start is null then raise exception 'sla_start_required'; end if;
  v_local := p_start at time zone 'America/Santo_Domingo';
  loop
    v_local_date := v_local::date;
    if extract(isodow from v_local_date) < 6
      and not exists (
        select 1 from public.business_holidays h
        where h.holiday_date = v_local_date and h.active
      )
    then
      v_day_end := ((v_local_date + 1)::timestamp at time zone 'America/Santo_Domingo');
      v_available := greatest(
        0,
        floor(extract(epoch from (v_day_end - (v_local at time zone 'America/Santo_Domingo'))))::integer
      );
      if v_remaining <= v_available then
        return ((v_local + make_interval(secs => v_remaining)) at time zone 'America/Santo_Domingo');
      end if;
      v_remaining := v_remaining - v_available;
    end if;
    v_local := (v_local_date + 1)::timestamp;
  end loop;
end;
$$;

revoke all on function public.business_seconds_between(timestamptz, timestamptz) from public;
revoke all on function public.add_business_seconds(timestamptz, integer) from public;
grant execute on function public.business_seconds_between(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.add_business_seconds(timestamptz, integer) to authenticated, service_role;

create or replace function public.department_review_score_summary(
  p_scores jsonb
) returns table (score_average numeric, score_band text)
language plpgsql stable
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_avg numeric;
begin
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    return query select null::numeric, null::text;
    return;
  end if;

  select count(*), avg((value)::numeric)
    into v_count, v_avg
    from jsonb_each_text(p_scores) as entry(key, value)
   where value ~ '^[1-5]$';

  if v_count = 0 or v_avg is null then
    return query select null::numeric, null::text;
    return;
  end if;

  v_avg := round(v_avg, 2);
  return query select v_avg,
    case
      when v_avg >= 4 then 'POSITIVE'
      when v_avg >= 3 then 'NEUTRAL'
      else 'NEGATIVE'
    end;
end;
$$;
revoke all on function public.department_review_score_summary(jsonb) from public;
grant execute on function public.department_review_score_summary(jsonb) to authenticated, service_role;

create or replace function public.transition_department_review(
  p_review_id uuid,
  p_action text,
  p_notes text default null,
  p_response_status text default null,
  p_scores jsonb default null
) returns public.department_reviews
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_review public.department_reviews;
  v_role public.app_user_roles;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_avg numeric;
  v_band text;
begin
  select * into v_role from public.app_user_roles where user_id = auth.uid();
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_review from public.department_reviews where id = p_review_id for update;
  if not found then raise exception 'review_not_found' using errcode = 'P0002'; end if;

  if p_action = 'SEND' then
    if v_role.role not in ('ADMIN', 'PURCHASING') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif v_role.role <> 'ADMIN'
    and not (
      v_role.role = 'DEPARTMENT_REVIEWER'
      and v_role.department = v_review.department
      and (v_review.assigned_to is null or v_review.assigned_to = auth.uid())
    )
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_action = 'SEND' and v_role.role in ('ADMIN', 'PURCHASING') then
    if v_review.status <> 'REQUESTED' or v_review.sent_at is not null then
      raise exception 'invalid_transition';
    end if;
    update public.department_reviews set sent_at = now(), updated_at = now()
      where id = p_review_id returning * into v_review;
  elsif p_action = 'RECEIVE'
    and v_review.status = 'REQUESTED'
    and v_review.sent_at is not null
  then
    update public.department_reviews
       set status = 'IN_REVIEW', received_at = now(),
           due_at = public.add_business_seconds(now(), remaining_sla_seconds),
           updated_at = now()
     where id = p_review_id returning * into v_review;
  elsif p_action = 'REQUEST_INFO' and v_review.status = 'IN_REVIEW' then
    if v_notes is null then raise exception 'notes_required'; end if;
    update public.department_reviews
       set status = 'INFO_REQUESTED',
           remaining_sla_seconds = public.business_seconds_between(now(), due_at),
           paused_at = now(), response_notes = v_notes, updated_at = now()
     where id = p_review_id returning * into v_review;
  elsif p_action = 'RESUME' and v_review.status = 'INFO_REQUESTED' then
    update public.department_reviews
       set status = 'IN_REVIEW',
           due_at = public.add_business_seconds(now(), remaining_sla_seconds),
           paused_at = null, updated_at = now()
     where id = p_review_id returning * into v_review;
  elsif p_action = 'RESPOND' and v_review.status = 'IN_REVIEW' then
    if p_response_status is null
      or p_response_status not in ('APPROVED', 'OBSERVATIONS', 'REJECTED')
      or v_notes is null
    then raise exception 'response_required'; end if;

    if p_scores is not null and jsonb_typeof(p_scores) <> 'object' then
      raise exception 'invalid_scores';
    end if;
    if p_scores is not null and exists (
      select 1 from jsonb_each_text(p_scores) as entry(key, value)
       where value !~ '^[1-5]$'
    ) then
      raise exception 'invalid_scores';
    end if;

    select summary.score_average, summary.score_band
      into v_avg, v_band
      from public.department_review_score_summary(p_scores) as summary;

    update public.department_reviews
       set status = 'COMPLETED', response_status = p_response_status,
           response_notes = v_notes, responded_by = auth.uid(),
           scores = p_scores, score_average = v_avg, score_band = v_band,
           responded_at = now(), updated_at = now()
     where id = p_review_id returning * into v_review;
  else
    raise exception 'invalid_transition';
  end if;

  insert into public.department_review_events (review_id, actor_id, action, notes)
  values (p_review_id, auth.uid(), p_action, v_notes);
  return v_review;
end;
$$;
revoke all on function public.transition_department_review(uuid, text, text, text, jsonb) from public;
grant execute on function public.transition_department_review(uuid, text, text, text, jsonb) to authenticated, service_role;

create or replace function public.claim_department_sla_escalation(
  p_review_id uuid
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.department_reviews
     set escalation_claimed_at = now()
   where id = p_review_id
     and status = 'IN_REVIEW'
     and due_at <= now()
     and (last_escalated_at is null or last_escalated_at <= now() - interval '24 hours')
     and (
       escalation_claimed_at is null
       or escalation_claimed_at <= now() - interval '10 minutes'
     );
  return found;
end;
$$;

create or replace function public.record_department_sla_escalation(
  p_review_id uuid,
  p_recipients text
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.department_reviews
     set last_escalated_at = now(),
         escalation_count = escalation_count + 1,
         escalation_claimed_at = null,
         updated_at = now()
   where id = p_review_id
     and status = 'IN_REVIEW'
     and due_at <= now()
     and escalation_claimed_at > now() - interval '10 minutes'
     and (
       last_escalated_at is null
       or last_escalated_at <= now() - interval '24 hours'
     );
  if not found then return false; end if;

  insert into public.department_review_events (review_id, action, notes)
  values (p_review_id, 'SLA_ESCALATED', p_recipients);
  return true;
end;
$$;
create or replace function public.release_department_sla_escalation(
  p_review_id uuid
) returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.department_reviews
     set escalation_claimed_at = null
   where id = p_review_id
     and escalation_claimed_at > now() - interval '10 minutes';
end;
$$;
revoke all on function public.claim_department_sla_escalation(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_department_sla_escalation(uuid)
  to service_role;
revoke all on function public.record_department_sla_escalation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_department_sla_escalation(uuid, text)
  to service_role;
revoke all on function public.release_department_sla_escalation(uuid)
  from public, anon, authenticated;
grant execute on function public.release_department_sla_escalation(uuid)
  to service_role;

create or replace function public.get_invitation_for_token(p_token text)
returns table (
  token text, supplier_name text, supplier_email text,
  status text, expires_at timestamptz, language text
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select i.token, i.supplier_name, i.supplier_email, i.status, i.expires_at, i.language
  from public.invitations i
  where i.token = p_token
    and (i.expires_at is null or i.expires_at > now())
  limit 1;
$$;
revoke all on function public.get_invitation_for_token(text) from public;
grant execute on function public.get_invitation_for_token(text) to anon, authenticated, service_role;

do $$
begin
  if to_regprocedure('public.get_portal_status_unfiltered(text)') is null then
    alter function public.get_portal_status(text)
      rename to get_portal_status_unfiltered;
  end if;
end;
$$;
revoke all on function public.get_portal_status_unfiltered(text)
  from public, anon, authenticated;

create or replace function public.get_portal_status(p_query text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_clean text := upper(trim(coalesce(p_query, '')));
  v_token_match boolean := false;
begin
  if v_clean ~* '/i/' then
    v_clean := upper(substring(v_clean from '/i/([A-Za-z0-9]+)'));
  end if;
  v_result := public.get_portal_status_unfiltered(p_query);
  if coalesce((v_result->>'found')::boolean, false) then
    v_token_match := v_clean = upper(coalesce(v_result->>'invitation_token', ''));
    v_result := v_result - 'tax_id';
    if not v_token_match then
      v_result := (v_result - 'invitation_token' - 'note')
        || jsonb_build_object('can_edit', false);
    end if;
  end if;
  return v_result;
end;
$$;
revoke all on function public.get_portal_status(text) from public;
grant execute on function public.get_portal_status(text) to anon, authenticated, service_role;

create or replace function public.delete_registration_document(p_token text, p_document_id uuid)
returns table (id uuid, registration_id uuid, ref text, file_name text)
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.registration_documents d
    where d.id = p_document_id and d.invitation_token = p_token
  ) then return; end if;
  if not exists (
    select 1 from public.registration_documents d
    where d.id = p_document_id
      and public.supplier_can_edit_registration(p_token, d.registration_id)
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    delete from public.registration_documents d
    where d.id = p_document_id and d.invitation_token = p_token
    returning d.id, d.registration_id, d.ref, d.file_name;
end;
$$;
revoke all on function public.delete_registration_document(text, uuid) from public;
grant execute on function public.delete_registration_document(text, uuid) to anon, authenticated, service_role;

create or replace function public.save_supplier_evaluation(
  p_registration_id uuid,
  p_payload jsonb
) returns bigint
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
  v_risk text;
  v_ratings jsonb;
  v_triggers jsonb;
  v_red_flag boolean;
  v_amount_text text;
  v_amount numeric := 0;
  v_rating_count integer := 0;
  v_rating_sum numeric := 0;
  v_rating_max integer := 0;
  v_average numeric := 0;
  v_reference text;
  v_company text;
  v_outcome text;
  v_exception_reason text;
  v_pending jsonb;
begin
  if not public.has_app_role(array['ADMIN', 'PURCHASING', 'MANAGEMENT'])
    or (
      public.has_app_role(array['MANAGEMENT'])
      and nullif(trim(p_payload->'approval_exception'->>'reason'), '') is null
    )
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_evaluation_payload';
  end if;
  v_ratings := coalesce(p_payload->'ratings', '{}'::jsonb);
  if jsonb_typeof(v_ratings) <> 'object' or exists (
    select 1
    from jsonb_each_text(v_ratings) rating
    where rating.key in (
      'financial', 'legal', 'reputational', 'operational', 'quality',
      'commercial', 'safety', 'technology', 'supplyChain', 'environmental',
      'conflictOfInterest', 'sbcHistory'
    )
      and rating.value not in ('0', '1', '2', '3')
  ) then
    raise exception 'invalid_risk_ratings';
  end if;
  v_red_flag := coalesce((p_payload->>'red_flag')::boolean, false);
  select count(*)::integer, coalesce(sum(rating.value::integer), 0),
         coalesce(max(rating.value::integer), 0)
    into v_rating_count, v_rating_sum, v_rating_max
    from jsonb_each_text(v_ratings) rating
   where rating.key in (
     'financial', 'legal', 'reputational', 'operational', 'quality',
     'commercial', 'safety', 'technology', 'supplyChain', 'environmental',
     'conflictOfInterest', 'sbcHistory'
   )
     and rating.value <> '0';
  if v_rating_count > 0 then
    v_average := round(v_rating_sum / v_rating_count, 2);
  end if;
  v_risk := case
    when v_red_flag or v_rating_max >= 3 or v_average >= 2.5 then 'ALTO'
    when v_rating_max >= 2 or v_average >= 1.5 then 'MEDIO'
    when v_rating_count > 0 then 'BAJO'
    else 'PENDIENTE'
  end;
  v_amount_text := regexp_replace(
    coalesce(p_payload->>'estimated_amount', ''),
    '[^0-9.]',
    '',
    'g'
  );
  if v_amount_text <> '' then
    if v_amount_text !~ '^[0-9]+(\.[0-9]+)?$' then
      raise exception 'invalid_estimated_amount';
    end if;
    v_amount := v_amount_text::numeric;
  end if;
  v_triggers := jsonb_build_object(
    'finance',
      v_amount >= 1000000
      or coalesce((v_ratings->>'financial')::integer, 0) >= 3,
    'legal',
      v_red_flag
      or coalesce((v_ratings->>'legal')::integer, 0) >= 3
      or coalesce((v_ratings->>'conflictOfInterest')::integer, 0) >= 2,
    'technology',
      coalesce((v_ratings->>'technology')::integer, 0) >= 2
  );
  v_outcome := coalesce(nullif(p_payload->>'outcome', ''), 'EN_REVISION');
  if v_outcome not in (
    'NO_DECISION', 'PENDIENTE', 'EN_REVISION', 'APROBADO',
    'APROBADO_CONDICIONES', 'RECHAZADO'
  ) then
    raise exception 'invalid_evaluation_outcome';
  end if;

  select reference_no, company_name into v_reference, v_company
    from public.supplier_registrations where id = p_registration_id for update;
  if not found then raise exception 'registration_not_found'; end if;

  if jsonb_typeof(coalesce(p_payload->'required_departments', '[]'::jsonb)) <> 'array'
    or exists (
    select 1
    from jsonb_array_elements_text(
      coalesce(p_payload->'required_departments', '[]'::jsonb)
    ) selected(department)
    left join public.review_departments d
      on d.id = selected.department and d.active
    where d.id is null
      or (
        not coalesce((v_triggers->>lower(selected.department))::boolean, false)
        and length(trim(coalesce(p_payload->'department_reasons'->>selected.department, ''))) < 10
      )
  ) then
    raise exception 'invalid_or_unjustified_department';
  end if;

  insert into public.department_reviews (
    registration_id, department, request_reason, required, requested_by, requested_at
  )
  select
    p_registration_id,
    d.id,
    case
      when coalesce((v_triggers->>lower(d.id))::boolean, false)
        then 'Activado automáticamente por los criterios de riesgo'
      else nullif(trim(p_payload->'department_reasons'->>d.id), '')
    end,
    true,
    auth.uid(),
    now()
    from public.review_departments d
   where d.active and (
      coalesce((v_triggers->>lower(d.id))::boolean, false)
     or coalesce((p_payload->'required_departments') ? d.id, false)
   )
  on conflict (registration_id, department) do nothing;
  insert into public.department_review_events (review_id, actor_id, action, notes)
  select dr.id, auth.uid(), 'REQUESTED', dr.request_reason
  from public.department_reviews dr
  where dr.registration_id = p_registration_id
    and dr.requested_by = auth.uid()
    and dr.created_at >= transaction_timestamp();

  if v_outcome in ('APROBADO', 'APROBADO_CONDICIONES') then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', dr.id, 'department', dr.department, 'status', dr.status
    )), '[]'::jsonb)
      into v_pending
      from public.department_reviews dr
     where dr.registration_id = p_registration_id
       and dr.required and dr.status <> 'COMPLETED';
    if jsonb_array_length(v_pending) > 0 then
      v_exception_reason := nullif(trim(p_payload->'approval_exception'->>'reason'), '');
      if v_exception_reason is not null
        and length(v_exception_reason) >= 10
        and public.has_app_role(array['ADMIN', 'MANAGEMENT'])
      then
        insert into public.approval_exceptions (
          registration_id, actor_id, actor_email, reason, pending_reviews
        ) values (
          p_registration_id,
          auth.uid(),
          nullif(auth.jwt()->>'email', ''),
          v_exception_reason,
          v_pending
        );
      else
        v_outcome := 'EN_REVISION';
      end if;
    elsif public.has_app_role(array['MANAGEMENT']) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  insert into public.supplier_evaluations (
    registration_id, reference_no, company_name, outcome, risk_level,
    proposed_risk, review_type, estimated_amount, red_flag, red_flag_notes,
    average, ratings, triggers, specialized, evaluation, created_by, created_by_email
  ) values (
    p_registration_id, v_reference, v_company, v_outcome, v_risk,
    nullif(p_payload->>'proposed_risk', ''),
    nullif(p_payload->>'review_type', ''),
    nullif(p_payload->>'estimated_amount', ''),
    v_red_flag,
    nullif(p_payload->>'red_flag_notes', ''),
    case when v_rating_count > 0 then v_average else null end,
    v_ratings,
    v_triggers,
    coalesce(p_payload->'specialized', '{}'::jsonb),
    coalesce(p_payload->'evaluation', '{}'::jsonb),
    auth.uid(), nullif(p_payload->>'created_by_email', '')
  ) returning id into v_id;

  update public.supplier_registrations
     set risk_level = v_risk,
         evaluation = coalesce(p_payload->'evaluation', evaluation),
         status = case when v_outcome in (
           'PENDIENTE', 'EN_REVISION', 'APROBADO', 'APROBADO_CONDICIONES', 'RECHAZADO'
         ) then v_outcome else status end,
         updated_at = now()
   where id = p_registration_id;

  return v_id;
end;
$$;
revoke all on function public.save_supplier_evaluation(uuid, jsonb) from public;
grant execute on function public.save_supplier_evaluation(uuid, jsonb) to authenticated, service_role;

alter table public.app_user_roles enable row level security;
alter table public.review_departments enable row level security;
alter table public.business_holidays enable row level security;
alter table public.department_reviews enable row level security;
alter table public.department_review_events enable row level security;
alter table public.approval_exceptions enable row level security;

drop policy if exists app_user_roles_read on public.app_user_roles;
create policy app_user_roles_read on public.app_user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_app_role(array['ADMIN']));
drop policy if exists app_user_roles_admin on public.app_user_roles;
create policy app_user_roles_admin on public.app_user_roles for all to authenticated
  using (public.has_app_role(array['ADMIN']))
  with check (public.has_app_role(array['ADMIN']));

drop policy if exists review_departments_read on public.review_departments;
create policy review_departments_read on public.review_departments for select to authenticated
  using (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'DEPARTMENT_REVIEWER', 'READ_ONLY']));
drop policy if exists review_departments_admin on public.review_departments;
create policy review_departments_admin on public.review_departments for all to authenticated
  using (public.has_app_role(array['ADMIN']))
  with check (public.has_app_role(array['ADMIN']));

drop policy if exists business_holidays_read on public.business_holidays;
create policy business_holidays_read on public.business_holidays for select to authenticated
  using (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'DEPARTMENT_REVIEWER', 'READ_ONLY']));
drop policy if exists business_holidays_admin on public.business_holidays;
create policy business_holidays_admin on public.business_holidays for all to authenticated
  using (public.has_app_role(array['ADMIN']))
  with check (public.has_app_role(array['ADMIN']));

drop policy if exists department_reviews_access on public.department_reviews;
create policy department_reviews_access on public.department_reviews for select to authenticated
  using (
    public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'READ_ONLY'])
    or exists (
      select 1 from public.app_user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'DEPARTMENT_REVIEWER'
        and ur.department = department_reviews.department
        and (department_reviews.assigned_to is null or department_reviews.assigned_to = auth.uid())
    )
  );
drop policy if exists department_reviews_manage on public.department_reviews;
revoke insert, update, delete on public.department_reviews
  from public, anon, authenticated;

drop policy if exists department_review_events_access on public.department_review_events;
create policy department_review_events_access on public.department_review_events for select to authenticated
  using (exists (
    select 1 from public.department_reviews dr
    where dr.id = department_review_events.review_id
      and public.can_access_supplier_registration(dr.registration_id)
  ));
drop policy if exists approval_exceptions_access on public.approval_exceptions;
create policy approval_exceptions_access on public.approval_exceptions for select to authenticated
  using (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'READ_ONLY']));
revoke insert, update, delete on public.department_review_events,
  public.approval_exceptions from public, anon, authenticated;

drop policy if exists "invitations are readable by token" on public.invitations;
drop policy if exists "invitations are admin managed" on public.invitations;
drop policy if exists invitations_read_staff on public.invitations;
create policy invitations_read_staff on public.invitations for select to authenticated
  using (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'READ_ONLY']));
drop policy if exists invitations_manage_staff on public.invitations;
create policy invitations_manage_staff on public.invitations for all to authenticated
  using (public.has_app_role(array['ADMIN', 'PURCHASING']))
  with check (public.has_app_role(array['ADMIN', 'PURCHASING']));

drop policy if exists "registrations are admin readable and editable" on public.supplier_registrations;
drop policy if exists "registrations are admin editable" on public.supplier_registrations;
drop policy if exists "registrations are admin deletable" on public.supplier_registrations;
drop policy if exists registrations_read_roles on public.supplier_registrations;
create policy registrations_read_roles on public.supplier_registrations for select to authenticated
  using (public.can_access_supplier_registration(id));
drop policy if exists registrations_update_roles on public.supplier_registrations;
create policy registrations_update_roles on public.supplier_registrations for update to authenticated
  using (public.has_app_role(array['ADMIN', 'PURCHASING']))
  with check (
    public.has_app_role(array['ADMIN', 'PURCHASING'])
    and (
      status not in ('APROBADO', 'APROBADO_CONDICIONES')
      or not exists (
        select 1 from public.department_reviews dr
        where dr.registration_id = supplier_registrations.id
          and dr.required and dr.status <> 'COMPLETED'
      )
    )
  );
drop policy if exists registrations_delete_admin on public.supplier_registrations;
create policy registrations_delete_admin on public.supplier_registrations for delete to authenticated
  using (public.has_app_role(array['ADMIN']));

drop policy if exists "suppliers can attach documents with a valid token" on public.registration_documents;
drop policy if exists "documents are admin readable and editable" on public.registration_documents;
drop policy if exists "supplier can remove documents from their draft" on public.registration_documents;
drop policy if exists documents_read_roles on public.registration_documents;
create policy documents_read_roles on public.registration_documents for select to authenticated
  using (public.can_access_supplier_registration(registration_id));
drop policy if exists documents_delete_staff on public.registration_documents;
create policy documents_delete_staff on public.registration_documents for delete to authenticated
  using (public.has_app_role(array['ADMIN', 'PURCHASING']));

drop policy if exists "activity log is admin only" on public.activity_log;
drop policy if exists "activity log is appendable" on public.activity_log;
drop policy if exists activity_log_read_roles on public.activity_log;
create policy activity_log_read_roles on public.activity_log for select to authenticated
  using (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'READ_ONLY']));
drop policy if exists activity_log_insert_staff on public.activity_log;
create policy activity_log_insert_staff on public.activity_log for insert to authenticated
  with check (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'DEPARTMENT_REVIEWER']));

drop policy if exists "supplier alerts are admin readable" on public.supplier_alerts;
drop policy if exists supplier_alerts_read_roles on public.supplier_alerts;
create policy supplier_alerts_read_roles on public.supplier_alerts for select to authenticated
  using (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'READ_ONLY']));

drop policy if exists "supplier evaluations are admin readable" on public.supplier_evaluations;
drop policy if exists "supplier evaluations are admin insertable" on public.supplier_evaluations;
drop policy if exists supplier_evaluations_read_roles on public.supplier_evaluations;
create policy supplier_evaluations_read_roles on public.supplier_evaluations for select to authenticated
  using (public.can_access_supplier_registration(registration_id));
drop policy if exists supplier_evaluations_insert_purchasing on public.supplier_evaluations;
revoke insert on public.supplier_evaluations from public, anon, authenticated;

drop policy if exists "internal tokens are admin readable" on public.internal_access_tokens;
drop policy if exists "internal tokens are admin insertable" on public.internal_access_tokens;
drop policy if exists internal_tokens_read_roles on public.internal_access_tokens;
create policy internal_tokens_read_roles on public.internal_access_tokens for select to authenticated
  using (public.has_app_role(array['ADMIN', 'MANAGEMENT', 'PURCHASING', 'READ_ONLY']));
drop policy if exists internal_tokens_insert_purchasing on public.internal_access_tokens;
create policy internal_tokens_insert_purchasing on public.internal_access_tokens for insert to authenticated
  with check (public.has_app_role(array['ADMIN', 'PURCHASING']));

drop policy if exists "service evaluations are admin readable" on public.service_evaluations;
drop policy if exists service_evaluations_read_roles on public.service_evaluations;
create policy service_evaluations_read_roles on public.service_evaluations for select to authenticated
  using (public.can_access_supplier_registration(registration_id));
drop policy if exists "supplier incidents are admin readable" on public.supplier_incidents;
drop policy if exists "supplier incidents are admin editable" on public.supplier_incidents;
drop policy if exists supplier_incidents_read_roles on public.supplier_incidents;
create policy supplier_incidents_read_roles on public.supplier_incidents for select to authenticated
  using (public.can_access_supplier_registration(registration_id));
drop policy if exists supplier_incidents_update_purchasing on public.supplier_incidents;
create policy supplier_incidents_update_purchasing on public.supplier_incidents for update to authenticated
  using (public.has_app_role(array['ADMIN', 'PURCHASING']))
  with check (public.has_app_role(array['ADMIN', 'PURCHASING']));

drop policy if exists "app_config is admin writable" on public.app_config;
drop policy if exists app_config_admin_write on public.app_config;
create policy app_config_admin_write on public.app_config for all to authenticated
  using (public.has_app_role(array['ADMIN']))
  with check (public.has_app_role(array['ADMIN']));

grant select on public.app_user_roles, public.review_departments, public.business_holidays,
  public.department_reviews, public.department_review_events, public.approval_exceptions
  to authenticated;
grant insert, update, delete on public.app_user_roles, public.review_departments,
  public.business_holidays to authenticated;
grant select on public.approval_exceptions to authenticated;
