create table if not exists public.insurance_demo_portfolios (
  company_name text primary key,
  total_market_value numeric not null default 0,
  weights_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_insurance_demo_portfolio_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_insurance_demo_portfolios_updated_at on public.insurance_demo_portfolios;
create trigger trg_insurance_demo_portfolios_updated_at
before update on public.insurance_demo_portfolios
for each row
execute function public.set_insurance_demo_portfolio_updated_at();

alter table public.insurance_demo_portfolios enable row level security;

drop policy if exists insurance_demo_portfolios_select on public.insurance_demo_portfolios;
create policy insurance_demo_portfolios_select
on public.insurance_demo_portfolios
for select
to anon, authenticated
using (company_name = 'Insurance Company A');

drop policy if exists insurance_demo_portfolios_upsert on public.insurance_demo_portfolios;
create policy insurance_demo_portfolios_upsert
on public.insurance_demo_portfolios
for all
to anon, authenticated
using (company_name = 'Insurance Company A')
with check (company_name = 'Insurance Company A');
