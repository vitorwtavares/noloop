-- v2 scanner: opt-in company subset for reconcile payload
alter table public.applications
  add column if not exists scanner_enabled boolean not null default false;

update public.applications
set scanner_enabled = true
where careers_url is not null
  and trim(careers_url) <> '';
