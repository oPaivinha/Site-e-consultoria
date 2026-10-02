-- =============================================================================
-- Paiva Nutri — 0002: acesso de admin para o painel
--
-- O que este arquivo faz, em linguagem simples:
--   1. Cria a lista de admins (tabela `admins`) e a pergunta "quem está logado é admin?"
--      (função `is_admin()`).
--   2. Dá ao admin acesso total (ler, criar, editar, apagar) a todas as tabelas.
--      Os pacientes continuam vendo só os próprios dados.
--   3. Move as anotações que só a nutri pode ver para a tabela `notas_internas`.
--   4. Cria a "lixeira" (`deleted_at`): excluir pelo painel esconde o registro, não apaga.
--   5. Cria o registro de auditoria (`audit_log`): tudo que um admin muda fica anotado.
--   6. Cria as consultas do painel que precisam ler as contas (`auth.users`).
--
-- Pode rodar de novo sem problema. Rode DEPOIS do 0001_inicial.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Admins
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- "Quem está logado é admin?" Usada em todas as regras de acesso abaixo.
-- security definer: consegue olhar a lista de admins mesmo sem o usuário ter acesso a ela.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Ninguém tira o próprio acesso de admin (evita ficar trancado para fora do painel).
create or replace function public.admins_protege_si_mesmo()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.user_id = (select auth.uid()) then
    raise exception 'Você não pode remover o seu próprio acesso de admin.';
  end if;
  return old;
end $$;

drop trigger if exists admins_protege_si_mesmo on public.admins;
create trigger admins_protege_si_mesmo before delete on public.admins
  for each row execute function public.admins_protege_si_mesmo();


-- -----------------------------------------------------------------------------
-- 2. Notas internas (só admin vê)
--    Linha sem checkin_id = observações gerais sobre o paciente (uma por paciente).
--    Linha com checkin_id = avisos que o robô gerou para aquele check-in.
-- -----------------------------------------------------------------------------
create table if not exists public.notas_internas (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  checkin_id  bigint unique references public.checkins(id) on delete cascade,
  texto       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index if not exists notas_internas_uma_observacao
  on public.notas_internas (profile_id) where checkin_id is null;
create index if not exists notas_internas_profile on public.notas_internas (profile_id);

drop trigger if exists notas_internas_updated_at on public.notas_internas;
create trigger notas_internas_updated_at before update on public.notas_internas
  for each row execute function public.set_updated_at();

-- Copia o que já existia nas colunas antigas e remove as colunas.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'acompanhamentos' and column_name = 'observacoes') then
    insert into public.notas_internas (profile_id, texto)
      select profile_id, observacoes from public.acompanhamentos
       where nullif(trim(observacoes), '') is not null
      on conflict do nothing;
    alter table public.acompanhamentos drop column observacoes;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'checkins' and column_name = 'avisos_para_nutri') then
    insert into public.notas_internas (profile_id, checkin_id, texto)
      select profile_id, id, avisos_para_nutri from public.checkins
       where nullif(trim(avisos_para_nutri), '') is not null
      on conflict do nothing;
    alter table public.checkins drop column avisos_para_nutri;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 3. Lixeira: deleted_at em todas as tabelas
-- -----------------------------------------------------------------------------
alter table public.profiles        add column if not exists deleted_at timestamptz;
alter table public.acompanhamentos add column if not exists deleted_at timestamptz;
alter table public.pre_formularios add column if not exists deleted_at timestamptz;
alter table public.anamneses       add column if not exists deleted_at timestamptz;
alter table public.checkins        add column if not exists deleted_at timestamptz;

create index if not exists profiles_created_at on public.profiles (created_at desc);
create index if not exists pre_formularios_profile on public.pre_formularios (profile_id);
create index if not exists anamneses_profile on public.anamneses (profile_id);
create index if not exists checkins_profile on public.checkins (profile_id);


-- -----------------------------------------------------------------------------
-- 4. Campos que o paciente não pode mexer
--    Antes isso era feito liberando coluna por coluna. Como o admin entra pelo
--    mesmo tipo de usuário (authenticated), essa trava agora é um gatilho que
--    só vale para quem NÃO é admin.
-- -----------------------------------------------------------------------------
create or replace function public.protege_campos()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Só vale para pacientes logados. O banco, o robô (service_role) e o admin passam direto.
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.consentimento_em is distinct from old.consentimento_em
       or new.versao_consentimento is distinct from old.versao_consentimento
       or new.created_at is distinct from old.created_at
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Este campo não pode ser alterado por aqui.';
    end if;
    return new;
  end if;

  -- pre_formularios, anamneses, checkins: o envio do paciente sempre chega "limpo".
  new.avisado_em   := null;
  new.importado_de := null;
  new.deleted_at   := null;
  new.created_at   := now();
  return new;
end $$;

drop trigger if exists profiles_protege on public.profiles;
create trigger profiles_protege before update on public.profiles
  for each row execute function public.protege_campos();
drop trigger if exists pre_formularios_protege on public.pre_formularios;
create trigger pre_formularios_protege before insert on public.pre_formularios
  for each row execute function public.protege_campos();
drop trigger if exists anamneses_protege on public.anamneses;
create trigger anamneses_protege before insert on public.anamneses
  for each row execute function public.protege_campos();
drop trigger if exists checkins_protege on public.checkins;
create trigger checkins_protege before insert on public.checkins
  for each row execute function public.protege_campos();


-- -----------------------------------------------------------------------------
-- 5. Auditoria
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  em          timestamptz not null default now(),
  admin_id    uuid,
  admin_email text,
  tabela      text not null,
  registro_id text,
  acao        text not null,   -- insert, update, delete, ou ações de conta (convite, reset_senha, ...)
  antes       jsonb,
  depois      jsonb
);
create index if not exists audit_log_em on public.audit_log (em desc);
create index if not exists audit_log_tabela on public.audit_log (tabela, registro_id);

-- Anota toda mudança feita por um admin. Mudanças dos pacientes e do robô não entram.
create or replace function public.audita()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  linha jsonb := to_jsonb(coalesce(new, old));
begin
  if public.is_admin() then
    insert into public.audit_log (admin_id, admin_email, tabela, registro_id, acao, antes, depois)
    values (
      (select auth.uid()),
      (select email from auth.users where id = (select auth.uid())),
      tg_table_name,
      coalesce(linha->>'id', linha->>'profile_id', linha->>'user_id'),
      lower(tg_op),
      case when tg_op <> 'INSERT' then to_jsonb(old) end,
      case when tg_op <> 'DELETE' then to_jsonb(new) end
    );
  end if;
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','acompanhamentos','pre_formularios','anamneses','checkins','notas_internas','admins'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audita', t);
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.audita()', t || '_audita', t);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 6. Permissões e regras (RLS)
-- -----------------------------------------------------------------------------
alter table public.admins         enable row level security;
alter table public.notas_internas enable row level security;
alter table public.audit_log      enable row level security;

-- Visitante sem login: nada.
revoke all on public.profiles, public.acompanhamentos, public.pre_formularios, public.anamneses,
              public.checkins, public.admins, public.notas_internas, public.audit_log from anon;

-- Usuário logado: a tabela inteira fica liberada, e quem decide QUAIS LINHAS cada um
-- vê ou muda são as regras (policies) abaixo. Paciente sem regra de editar/apagar não edita/apaga.
revoke all on public.profiles, public.acompanhamentos, public.pre_formularios, public.anamneses,
              public.checkins, public.admins, public.notas_internas, public.audit_log from authenticated;
grant select, insert, update, delete on public.profiles, public.acompanhamentos, public.pre_formularios,
              public.anamneses, public.checkins, public.notas_internas to authenticated;
grant select, insert, delete on public.admins to authenticated;
grant select on public.audit_log to authenticated;

-- Paciente: lê só o que é dele e não está na lixeira.
drop policy if exists "profiles: ler o próprio" on public.profiles;
create policy "profiles: ler o próprio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id and deleted_at is null);
drop policy if exists "acompanhamentos: ler o próprio" on public.acompanhamentos;
create policy "acompanhamentos: ler o próprio" on public.acompanhamentos
  for select to authenticated using ((select auth.uid()) = profile_id and deleted_at is null);
drop policy if exists "pre_formularios: ler os próprios" on public.pre_formularios;
create policy "pre_formularios: ler os próprios" on public.pre_formularios
  for select to authenticated using ((select auth.uid()) = profile_id and deleted_at is null);
drop policy if exists "anamneses: ler as próprias" on public.anamneses;
create policy "anamneses: ler as próprias" on public.anamneses
  for select to authenticated using ((select auth.uid()) = profile_id and deleted_at is null);
drop policy if exists "checkins: ler os próprios" on public.checkins;
create policy "checkins: ler os próprios" on public.checkins
  for select to authenticated using ((select auth.uid()) = profile_id and deleted_at is null);
-- (As regras de "enviar" e "editar o próprio perfil" do 0001 continuam valendo.)

-- Admin: pode tudo em todas as tabelas.
drop policy if exists "admin: tudo" on public.profiles;
create policy "admin: tudo" on public.profiles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.acompanhamentos;
create policy "admin: tudo" on public.acompanhamentos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.pre_formularios;
create policy "admin: tudo" on public.pre_formularios for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.anamneses;
create policy "admin: tudo" on public.anamneses for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.checkins;
create policy "admin: tudo" on public.checkins for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.notas_internas;
create policy "admin: tudo" on public.notas_internas for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.admins;
create policy "admin: tudo" on public.admins for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: ler" on public.audit_log;
create policy "admin: ler" on public.audit_log for select to authenticated
  using ((select public.is_admin()));


-- -----------------------------------------------------------------------------
-- 7. Consultas do painel (precisam ler as contas em auth.users)
--    Todas começam conferindo is_admin(); para qualquer outra pessoa dão erro.
-- -----------------------------------------------------------------------------
create or replace function public.exige_admin()
returns void language plpgsql stable set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
end $$;

-- Números do dashboard.
create or replace function public.admin_resumo()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  perform public.exige_admin();
  return jsonb_build_object(
    'total',           (select count(*) from public.profiles where deleted_at is null),
    'novos_7',         (select count(*) from public.profiles where deleted_at is null and created_at >= now() - interval '7 days'),
    'novos_30',        (select count(*) from public.profiles where deleted_at is null and created_at >= now() - interval '30 days'),
    'nao_confirmados', (select count(*) from auth.users u join public.profiles p on p.id = u.id
                         where p.deleted_at is null and u.email_confirmed_at is null),
    'ativos',          (select count(*) from public.acompanhamentos where deleted_at is null and ativo and not pausado),
    'pausados',        (select count(*) from public.acompanhamentos where deleted_at is null and pausado),
    'atrasados',       (select count(*) from public.acompanhamentos where deleted_at is null and ativo and not pausado
                         and proximo_checkin < hoje
                         and (ultima_resposta is null or (ultima_resposta at time zone 'America/Sao_Paulo')::date < proximo_checkin)),
    'checkins_30',     (select count(*) from public.checkins where deleted_at is null and created_at >= now() - interval '30 days')
  );
end $$;

-- Cadastros por dia (dias sem cadastro aparecem com zero).
create or replace function public.admin_cadastros_por_dia(p_dias int default 30)
returns table (dia date, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  perform public.exige_admin();
  return query
    select d::date, count(p.id)
      from generate_series(hoje - (least(greatest(p_dias, 1), 365) - 1), hoje, interval '1 day') d
      left join public.profiles p
        on (p.created_at at time zone 'America/Sao_Paulo')::date = d::date and p.deleted_at is null
     group by d order by d;
end $$;

-- Lista de pacientes com busca, filtros, ordenação e paginação (tudo no banco).
create or replace function public.admin_usuarios(
  p_busca      text    default null,
  p_confirmado boolean default null,
  p_status     text    default null,   -- novo | ativo | pausado | desativado
  p_desde      date    default null,
  p_ate        date    default null,
  p_menor      boolean default null,
  p_ordem      text    default 'created_at',  -- nome | email | created_at | ultimo_login
  p_desc       boolean default true,
  p_limite     int     default 25,
  p_offset     int     default 0
)
returns table (
  id uuid, nome text, email text, whatsapp text, menor boolean, created_at timestamptz,
  email_confirmado_em timestamptz, ultimo_login timestamptz, bloqueado_ate timestamptz,
  deleted_at timestamptz, status text, admin boolean, total bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exige_admin();
  return query
  with base as (
    select p.id, p.nome, p.email, p.whatsapp, p.menor, p.created_at,
           u.email_confirmed_at, u.last_sign_in_at, u.banned_until, p.deleted_at,
           case when p.deleted_at is not null then 'desativado'
                when a.pausado then 'pausado'
                when a.ativo then 'ativo'
                else 'novo' end as status,
           exists (select 1 from public.admins ad where ad.user_id = p.id) as admin
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.acompanhamentos a on a.profile_id = p.id
  )
  select b.id, b.nome, b.email, b.whatsapp, b.menor, b.created_at,
         b.email_confirmed_at, b.last_sign_in_at, b.banned_until, b.deleted_at,
         b.status, b.admin, count(*) over ()
    from base b
   where (p_busca is null or b.nome ilike '%' || p_busca || '%' or b.email ilike '%' || p_busca || '%')
     and (p_confirmado is null or (b.email_confirmed_at is not null) = p_confirmado)
     and (p_status is null or b.status = p_status)
     and (p_status = 'desativado' or p_status is null or b.deleted_at is null)
     and (p_desde is null or (b.created_at at time zone 'America/Sao_Paulo')::date >= p_desde)
     and (p_ate   is null or (b.created_at at time zone 'America/Sao_Paulo')::date <= p_ate)
     and (p_menor is null or b.menor = p_menor)
   order by
     case when p_ordem = 'nome'         and not p_desc then lower(b.nome) end asc,
     case when p_ordem = 'nome'         and p_desc     then lower(b.nome) end desc,
     case when p_ordem = 'email'        and not p_desc then b.email end asc,
     case when p_ordem = 'email'        and p_desc     then b.email end desc,
     case when p_ordem = 'ultimo_login' and not p_desc then b.last_sign_in_at end asc nulls first,
     case when p_ordem = 'ultimo_login' and p_desc     then b.last_sign_in_at end desc nulls last,
     case when p_ordem = 'created_at'   and not p_desc then b.created_at end asc,
     b.created_at desc
   limit least(greatest(p_limite, 1), 100) offset greatest(p_offset, 0);
end $$;

-- Dados da conta de um paciente (para a página de detalhes).
create or replace function public.admin_conta(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exige_admin();
  return (select jsonb_build_object(
            'email', u.email,
            'criado_em', u.created_at,
            'email_confirmado_em', u.email_confirmed_at,
            'ultimo_login', u.last_sign_in_at,
            'bloqueado_ate', u.banned_until,
            'admin', exists (select 1 from public.admins where user_id = u.id))
            from auth.users u where u.id = p_id);
end $$;


-- -----------------------------------------------------------------------------
-- 8. Quem pode chamar cada função
-- -----------------------------------------------------------------------------
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

revoke execute on function public.exige_admin(), public.admin_resumo(), public.admin_cadastros_por_dia(int),
  public.admin_usuarios(text, boolean, text, date, date, boolean, text, boolean, int, int),
  public.admin_conta(uuid) from public, anon;
grant execute on function public.exige_admin(), public.admin_resumo(), public.admin_cadastros_por_dia(int),
  public.admin_usuarios(text, boolean, text, date, date, boolean, text, boolean, int, int),
  public.admin_conta(uuid) to authenticated;

revoke execute on function public.audita(), public.protege_campos(), public.admins_protege_si_mesmo()
  from public, anon, authenticated;


-- =============================================================================
-- PRIMEIRO ADMIN — rode uma vez no SQL Editor, trocando pelo seu e-mail de login:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'SEU-EMAIL-AQUI'
--   on conflict do nothing;
-- =============================================================================
