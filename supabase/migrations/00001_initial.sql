-- Crear tabla de mediciones
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  systolic int not null check (systolic >= 50 and systolic <= 300),
  diastolic int not null check (diastolic >= 30 and diastolic <= 200),
  pulse int check (pulse >= 30 and pulse <= 250),
  arm text not null default 'left' check (arm in ('left', 'right')),
  position text not null default 'sitting' check (position in ('sitting', 'lying', 'standing')),
  notes text check (char_length(notes) <= 500),
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Crear tabla de configuracion de recordatorios
create table if not exists public.reminder_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  times jsonb not null default '["08:00", "20:00"]'::jsonb,
  email_enabled boolean not null default true,
  browser_enabled boolean not null default true,
  timezone text not null default 'America/Chihuahua',
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_measurements_user_id on public.measurements(user_id);
create index if not exists idx_measurements_measured_at on public.measurements(measured_at);
create index if not exists idx_measurements_user_date on public.measurements(user_id, measured_at desc);

-- Activar Row Level Security
alter table public.measurements enable row level security;
alter table public.reminder_settings enable row level security;

-- Políticas RLS para measurements
create policy "Users can view their own measurements"
  on public.measurements for select
  using (auth.uid() = user_id);

create policy "Users can insert their own measurements"
  on public.measurements for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own measurements"
  on public.measurements for update
  using (auth.uid() = user_id);

create policy "Users can delete their own measurements"
  on public.measurements for delete
  using (auth.uid() = user_id);

-- Políticas RLS para reminder_settings
create policy "Users can view their own reminder settings"
  on public.reminder_settings for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own reminder settings"
  on public.reminder_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reminder settings"
  on public.reminder_settings for update
  using (auth.uid() = user_id);
