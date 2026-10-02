-- =============================================================================
-- Paiva Nutri — 0004: pagamentos (Mercado Pago)
-- precos:                 valor de cada plano. Quem decide o valor cobrado é o banco, nunca o navegador.
-- pagamentos:             uma linha por tentativa de pagamento. Só o servidor (Edge Function com
--                         service_role) cria e atualiza; o paciente só lê as dele.
-- liberacoes_pagamento:   pacientes com alerta no pré-formulário só pagam depois que a nutri libera.
-- Pode rodar de novo sem problema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Preços
-- -----------------------------------------------------------------------------
create table if not exists public.precos (
  plano         text primary key,                -- mesmo id do planos.js: mensal, anual
  nome          text not null,
  valor         numeric(10,2) not null check (valor > 0),   -- valor TOTAL cobrado
  parcelas_max  smallint not null default 1 check (parcelas_max between 1 and 12),
  ativo         boolean not null default true,
  updated_at    timestamptz not null default now()
);
comment on table public.precos is 'Valor cobrado por plano. Edite pelo painel (Pagamentos > Preços).';

insert into public.precos (plano, nome, valor, parcelas_max) values
  ('mensal', 'Mensal', 150.00, 1),
  ('anual',  'Anual', 1800.00, 12)
on conflict (plano) do nothing;

drop trigger if exists precos_updated_at on public.precos;
create trigger precos_updated_at before update on public.precos
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Pagamentos
-- -----------------------------------------------------------------------------
create table if not exists public.pagamentos (
  id                bigint generated always as identity primary key,
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  plano             text not null references public.precos(plano),
  valor             numeric(10,2) not null,
  status            text not null default 'pendente'
                    check (status in ('pendente','em_analise','aprovado','recusado','cancelado','devolvido')),
  metodo            text,                          -- pix, cartão de crédito, boleto...
  parcelas          smallint,
  mp_preference_id  text,
  mp_payment_id     text unique,
  pago_em           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists pagamentos_profile_idx on public.pagamentos(profile_id, created_at desc);
comment on table public.pagamentos is 'Pagamentos pelo Mercado Pago. Atualizado sozinho pelo aviso (webhook) do Mercado Pago.';

drop trigger if exists pagamentos_updated_at on public.pagamentos;
create trigger pagamentos_updated_at before update on public.pagamentos
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Liberação para pagar (casos com alerta)
-- -----------------------------------------------------------------------------
create table if not exists public.liberacoes_pagamento (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  liberado_em   timestamptz not null default now(),
  liberado_por  uuid default auth.uid()
);

-- -----------------------------------------------------------------------------
-- 4. Permissões e regras (RLS)
-- -----------------------------------------------------------------------------
alter table public.precos               enable row level security;
alter table public.pagamentos           enable row level security;
alter table public.liberacoes_pagamento enable row level security;

revoke all on public.precos, public.pagamentos, public.liberacoes_pagamento from anon, authenticated;
grant select on public.precos to anon;
grant select, insert, update, delete on public.precos, public.pagamentos, public.liberacoes_pagamento to authenticated;

-- Preços: qualquer pessoa vê os planos ativos (aparecem na tela de pagamento).
drop policy if exists "precos: ver ativos" on public.precos;
create policy "precos: ver ativos" on public.precos for select to anon, authenticated using (ativo);

-- Paciente: só lê o que é dele. Não cria nem muda nada (quem faz isso é o servidor).
drop policy if exists "pagamentos: ler os próprios" on public.pagamentos;
create policy "pagamentos: ler os próprios" on public.pagamentos
  for select to authenticated using ((select auth.uid()) = profile_id);
drop policy if exists "liberacoes: ler a própria" on public.liberacoes_pagamento;
create policy "liberacoes: ler a própria" on public.liberacoes_pagamento
  for select to authenticated using ((select auth.uid()) = profile_id);

-- Admin: pode tudo.
drop policy if exists "admin: tudo" on public.precos;
create policy "admin: tudo" on public.precos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.pagamentos;
create policy "admin: tudo" on public.pagamentos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin: tudo" on public.liberacoes_pagamento;
create policy "admin: tudo" on public.liberacoes_pagamento for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Auditoria: mudanças feitas pelo admin entram no audit_log, como nas outras tabelas.
drop trigger if exists precos_audita on public.precos;
create trigger precos_audita after insert or update or delete on public.precos
  for each row execute function public.audita();
drop trigger if exists pagamentos_audita on public.pagamentos;
create trigger pagamentos_audita after insert or update or delete on public.pagamentos
  for each row execute function public.audita();
drop trigger if exists liberacoes_pagamento_audita on public.liberacoes_pagamento;
create trigger liberacoes_pagamento_audita after insert or update or delete on public.liberacoes_pagamento
  for each row execute function public.audita();
