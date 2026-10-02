-- =============================================================================
-- Paiva Nutri: banco de dados no Supabase (substitui a Planilha Google)
--
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar de novo sem quebrar nada (tudo usa "if not exists" / "or replace").
--
-- Tabelas (todas com RLS):
--   profiles          1 por usuário (paciente ou responsável). O paciente lê e edita.
--   acompanhamentos   1 por paciente. Status do acompanhamento e do check-in.
--                     O paciente só lê; quem edita é a nutri (painel) e a automação.
--   pre_formularios   envios do pré-formulário (criado junto com a conta).
--   anamneses         envios da anamnese.
--   checkins          envios do check-in quinzenal.
--
-- A nutri vê e edita tudo pelo painel do Supabase (Table Editor), que ignora o RLS.
-- A automação (Google Apps Script) usa a chave service_role, guardada só no Apps Script.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,                        -- e-mail da conta (login). Para menores, é o do responsável.
  nome text not null default '',
  whatsapp text,                     -- 55 + DDD + número, só dígitos
  nascimento date,
  sexo text check (sexo in ('feminino', 'masculino')),
  email_paciente text,               -- e-mail do próprio paciente, quando a conta é do responsável
  canal text not null default 'whatsapp' check (canal in ('whatsapp', 'email')),
  aceita_checkin boolean not null default false,
  menor boolean not null default false,
  responsavel_nome text,
  responsavel_parentesco text,
  responsavel_whatsapp text,
  responsavel_email text,
  consentimento_em timestamptz,
  versao_consentimento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Dados de cadastro do paciente (antiga aba "pacientes").';

-- -----------------------------------------------------------------------------
-- acompanhamentos
-- -----------------------------------------------------------------------------
create table if not exists public.acompanhamentos (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  ativo boolean not null default false,          -- vira true quando você preenche inicio_acompanhamento
  pausado boolean not null default false,        -- paciente pediu PAUSAR
  inicio_acompanhamento date,
  proximo_checkin date,
  ultimo_envio date,
  ultima_resposta timestamptz,
  lembretes_enviados smallint not null default 0 check (lembretes_enviados between 0 and 2),
  observacoes text,                              -- anotações suas; o paciente não vê
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.acompanhamentos is 'Status do acompanhamento e do check-in quinzenal. Edite inicio_acompanhamento para ativar o paciente.';

-- -----------------------------------------------------------------------------
-- pre_formularios
-- -----------------------------------------------------------------------------
create table if not exists public.pre_formularios (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  enviado_em timestamptz,
  objetivo text,
  peso_kg numeric(5,1),
  altura_cm smallint,
  treino_freq text,
  modalidade text,
  tentativas text,
  origem text,
  saude jsonb not null default '{}'::jsonb,       -- {diabetes: {resposta, qual, usa_insulina}, ...}
  scoff_sim smallint check (scoff_sim between 0 and 5),
  alertas text[] not null default '{}',
  revisar boolean not null default false,
  responsavel jsonb,                               -- {nome, parentesco, whatsapp, email, presente_na_consulta, consentimento}
  consentimento boolean not null default false,
  consentimento_em timestamptz,
  versao_consentimento text,
  avisado_em timestamptz,                          -- quando a automação te mandou o e-mail de aviso
  importado_de text unique,                        -- preenchido só pelo script de importação da planilha
  created_at timestamptz not null default now()
);
create index if not exists pre_formularios_profile_idx on public.pre_formularios(profile_id);

-- -----------------------------------------------------------------------------
-- anamneses
-- -----------------------------------------------------------------------------
create table if not exists public.anamneses (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  enviado_em timestamptz,
  bristol smallint check (bristol between 1 and 7),
  agua text,
  respostas jsonb not null default '{}'::jsonb,    -- todas as respostas da anamnese (nome do campo: valor)
  consentimento boolean not null default false,
  consentimento_em timestamptz,
  versao_consentimento text,
  avisado_em timestamptz,
  importado_de text unique,
  created_at timestamptz not null default now()
);
create index if not exists anamneses_profile_idx on public.anamneses(profile_id);

-- -----------------------------------------------------------------------------
-- checkins
-- -----------------------------------------------------------------------------
create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  enviado_em timestamptz,
  adesao smallint not null check (adesao between 0 and 10),
  refeicoes_dificeis text[] not null default '{}',
  fome text,
  deslizes text,
  deslize_motivo text[] not null default '{}',
  agua text,
  freq_evacuacao text,
  bristol smallint check (bristol between 1 and 7),
  sintomas_gi text[] not null default '{}',
  alerta text[] not null default '{}',
  energia text,
  peso_kg numeric(5,1),
  recado text,
  quer_contato boolean not null default false,
  avisos_para_nutri text,                          -- gerado pela automação; o paciente não vê
  avisado_em timestamptz,
  importado_de text unique,
  created_at timestamptz not null default now()    -- antiga coluna recebido_em
);
create index if not exists checkins_profile_idx on public.checkins(profile_id, created_at desc);

-- =============================================================================
-- Funções e triggers
-- =============================================================================

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists acompanhamentos_updated_at on public.acompanhamentos;
create trigger acompanhamentos_updated_at before update on public.acompanhamentos
  for each row execute function public.set_updated_at();

-- Conversões tolerantes: um valor estranho vira null em vez de impedir o cadastro.
create or replace function public.try_date(v text) returns date
language plpgsql immutable as $$
begin return nullif(v, '')::date; exception when others then return null; end $$;

create or replace function public.try_numeric(v text) returns numeric
language plpgsql immutable as $$
begin return nullif(v, '')::numeric; exception when others then return null; end $$;

create or replace function public.try_bool(v text) returns boolean
language sql immutable as $$
  select coalesce(lower(v) in ('true', 'sim', 's', '1'), false)
$$;

create or replace function public.try_timestamptz(v text) returns timestamptz
language plpgsql immutable as $$
begin return nullif(v, '')::timestamptz; exception when others then return null; end $$;

create or replace function public.json_text_array(j jsonb) returns text[]
language sql immutable as $$
  select case when jsonb_typeof(j) = 'array'
              then array(select jsonb_array_elements_text(j))
              else '{}'::text[] end
$$;

-- Cria profile, acompanhamento e (se veio) o pré-formulário quando alguém se cadastra.
-- Os dados chegam em auth.signUp({ options: { data } }) e ficam em raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  pf jsonb := m -> 'pre_formulario';
begin
  insert into public.profiles (
    id, email, nome, whatsapp, nascimento, sexo, email_paciente, aceita_checkin, menor,
    responsavel_nome, responsavel_parentesco, responsavel_whatsapp, responsavel_email,
    consentimento_em, versao_consentimento
  ) values (
    new.id,
    new.email,
    coalesce(left(m ->> 'nome', 200), ''),
    left(regexp_replace(coalesce(m ->> 'whatsapp', ''), '\D', '', 'g'), 15),
    public.try_date(m ->> 'nascimento'),
    case when m ->> 'sexo' in ('feminino', 'masculino') then m ->> 'sexo' end,
    left(nullif(m ->> 'email_paciente', ''), 200),
    public.try_bool(m ->> 'aceita_checkin'),
    public.try_bool(m ->> 'menor'),
    left(nullif(m ->> 'responsavel_nome', ''), 200),
    left(nullif(m ->> 'responsavel_parentesco', ''), 60),
    nullif(left(regexp_replace(coalesce(m ->> 'responsavel_whatsapp', ''), '\D', '', 'g'), 15), ''),
    left(nullif(m ->> 'responsavel_email', ''), 200),
    public.try_timestamptz(m ->> 'consentimento_em'),
    left(nullif(m ->> 'versao_consentimento', ''), 40)
  )
  on conflict (id) do nothing;

  insert into public.acompanhamentos (profile_id) values (new.id)
  on conflict (profile_id) do nothing;

  if jsonb_typeof(pf) = 'object' then
    insert into public.pre_formularios (
      profile_id, enviado_em, objetivo, peso_kg, altura_cm, treino_freq, modalidade, tentativas, origem,
      saude, scoff_sim, alertas, revisar, responsavel, consentimento, consentimento_em, versao_consentimento
    ) values (
      new.id,
      public.try_timestamptz(pf ->> 'enviado_em'),
      left(pf ->> 'objetivo', 60),
      public.try_numeric(pf ->> 'peso_kg'),
      public.try_numeric(pf ->> 'altura_cm')::smallint,
      left(pf ->> 'treino_freq', 20),
      left(pf ->> 'modalidade', 300),
      left(pf ->> 'tentativas', 3000),
      left(pf ->> 'origem', 60),
      case when jsonb_typeof(pf -> 'saude') = 'object' then pf -> 'saude' else '{}'::jsonb end,
      least(greatest(public.try_numeric(pf ->> 'scoff_sim'), 0), 5)::smallint,
      public.json_text_array(pf -> 'alertas'),
      public.try_bool(pf ->> 'revisar'),
      case when jsonb_typeof(pf -> 'responsavel') = 'object' then pf -> 'responsavel' end,
      public.try_bool(pf ->> 'consentimento'),
      public.try_timestamptz(pf ->> 'consentimento_em'),
      left(pf ->> 'versao_consentimento', 40)
    );
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém profiles.email igual ao e-mail da conta quando ele muda.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Ao preencher inicio_acompanhamento, ativa o paciente e marca o 1º check-in para 15 dias depois.
create or replace function public.acompanhamento_inicio()
returns trigger language plpgsql as $$
begin
  if new.inicio_acompanhamento is not null
     and (tg_op = 'INSERT' or old.inicio_acompanhamento is distinct from new.inicio_acompanhamento) then
    new.ativo := true;
    if new.proximo_checkin is null or tg_op = 'UPDATE' then
      new.proximo_checkin := new.inicio_acompanhamento + 15;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists acompanhamentos_inicio on public.acompanhamentos;
create trigger acompanhamentos_inicio before insert or update on public.acompanhamentos
  for each row execute function public.acompanhamento_inicio();

-- Check-in respondido: registra a resposta e marca o próximo para daqui a 15 dias.
-- (Check-ins antigos trazidos pelo script de importação não mexem nas datas.)
create or replace function public.checkin_recebido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.importado_de is not null then
    return new;
  end if;
  update public.acompanhamentos
     set ultima_resposta = new.created_at,
         proximo_checkin = (now() at time zone 'America/Sao_Paulo')::date + 15
   where profile_id = new.profile_id;
  return new;
end $$;

drop trigger if exists checkins_recebido on public.checkins;
create trigger checkins_recebido after insert on public.checkins
  for each row execute function public.checkin_recebido();

-- =============================================================================
-- Segurança: RLS em todas as tabelas + permissões por coluna
-- =============================================================================
alter table public.profiles        enable row level security;
alter table public.acompanhamentos enable row level security;
alter table public.pre_formularios enable row level security;
alter table public.anamneses       enable row level security;
alter table public.checkins        enable row level security;

-- Visitante sem login (anon) não acessa nada.
revoke all on public.profiles, public.acompanhamentos, public.pre_formularios, public.anamneses, public.checkins from anon;
-- Usuário logado: só o que está liberado abaixo (linha por RLS, coluna por grant).
revoke all on public.profiles, public.acompanhamentos, public.pre_formularios, public.anamneses, public.checkins from authenticated;

-- profiles: lê e edita o próprio. Não cria (o trigger cria) nem apaga.
grant select on public.profiles to authenticated;
grant update (nome, whatsapp, nascimento, sexo, email_paciente, canal, aceita_checkin,
              responsavel_nome, responsavel_parentesco, responsavel_whatsapp, responsavel_email)
  on public.profiles to authenticated;

drop policy if exists "profiles: ler o próprio" on public.profiles;
create policy "profiles: ler o próprio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles: editar o próprio" on public.profiles;
create policy "profiles: editar o próprio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- acompanhamentos: o paciente só lê o próprio (sem as suas anotações).
grant select (profile_id, ativo, pausado, inicio_acompanhamento, proximo_checkin, ultima_resposta)
  on public.acompanhamentos to authenticated;

drop policy if exists "acompanhamentos: ler o próprio" on public.acompanhamentos;
create policy "acompanhamentos: ler o próprio" on public.acompanhamentos
  for select to authenticated using ((select auth.uid()) = profile_id);

-- pre_formularios: envia e lê os próprios. Não edita nem apaga.
grant select (id, profile_id, enviado_em, objetivo, peso_kg, altura_cm, treino_freq, modalidade, tentativas, origem,
              saude, scoff_sim, alertas, revisar, responsavel, consentimento, consentimento_em, versao_consentimento, created_at)
  on public.pre_formularios to authenticated;
grant insert (profile_id, enviado_em, objetivo, peso_kg, altura_cm, treino_freq, modalidade, tentativas, origem,
              saude, scoff_sim, alertas, revisar, responsavel, consentimento, consentimento_em, versao_consentimento)
  on public.pre_formularios to authenticated;

drop policy if exists "pre_formularios: ler os próprios" on public.pre_formularios;
create policy "pre_formularios: ler os próprios" on public.pre_formularios
  for select to authenticated using ((select auth.uid()) = profile_id);
drop policy if exists "pre_formularios: enviar os próprios" on public.pre_formularios;
create policy "pre_formularios: enviar os próprios" on public.pre_formularios
  for insert to authenticated with check ((select auth.uid()) = profile_id);

-- anamneses: envia e lê as próprias.
grant select (id, profile_id, enviado_em, bristol, agua, respostas, consentimento, consentimento_em, versao_consentimento, created_at)
  on public.anamneses to authenticated;
grant insert (profile_id, enviado_em, bristol, agua, respostas, consentimento, consentimento_em, versao_consentimento)
  on public.anamneses to authenticated;

drop policy if exists "anamneses: ler as próprias" on public.anamneses;
create policy "anamneses: ler as próprias" on public.anamneses
  for select to authenticated using ((select auth.uid()) = profile_id);
drop policy if exists "anamneses: enviar as próprias" on public.anamneses;
create policy "anamneses: enviar as próprias" on public.anamneses
  for insert to authenticated with check ((select auth.uid()) = profile_id);

-- checkins: envia e lê os próprios (sem os avisos internos para a nutri).
grant select (id, profile_id, enviado_em, adesao, refeicoes_dificeis, fome, deslizes, deslize_motivo, agua,
              freq_evacuacao, bristol, sintomas_gi, alerta, energia, peso_kg, recado, quer_contato, created_at)
  on public.checkins to authenticated;
grant insert (profile_id, enviado_em, adesao, refeicoes_dificeis, fome, deslizes, deslize_motivo, agua,
              freq_evacuacao, bristol, sintomas_gi, alerta, energia, peso_kg, recado, quer_contato)
  on public.checkins to authenticated;

drop policy if exists "checkins: ler os próprios" on public.checkins;
create policy "checkins: ler os próprios" on public.checkins
  for select to authenticated using ((select auth.uid()) = profile_id);
drop policy if exists "checkins: enviar os próprios" on public.checkins;
create policy "checkins: enviar os próprios" on public.checkins
  for insert to authenticated with check ((select auth.uid()) = profile_id);

-- As funções de trigger não podem ser chamadas pela API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.checkin_recebido() from public, anon, authenticated;
