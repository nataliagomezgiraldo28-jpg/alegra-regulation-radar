-- Esquema de Supabase para el Radar Regulatorio.
-- Ejecuta este archivo en el SQL Editor de tu proyecto Supabase.

create table if not exists snapshots (
  source_id     text primary key,
  hash          text not null,
  texto         text,
  capturado_en  timestamptz not null default now()
);

create table if not exists changes (
  id             text primary key,
  source_id      text not null,
  severidad      text not null,
  titulo         text not null,
  vigencia       text,
  que_paso       text,
  que_significa  text,
  que_hacer      jsonb,
  productos      jsonb,
  diff           text,
  detectado_en   timestamptz not null default now(),
  analisis       jsonb,
  atendido       boolean not null default false
);

create table if not exists notifications (
  id         text primary key,
  source_id  text not null,
  tone       text not null,
  titulo     text not null,
  detalle    text,
  cuando     text,
  leido      boolean not null default false,
  creado_en  timestamptz not null default now()
);

create index if not exists changes_source_idx on changes (source_id);
create index if not exists changes_detectado_idx on changes (detectado_en desc);
