-- =============================================================================
-- Paiva Nutri — 0003: lista de pacientes do painel
-- Igual à admin_usuarios do 0002, mais: filtro por objetivo, filtro "com alerta",
-- e as colunas objetivo, alertas, revisar e próximo check-in (do último pré-formulário).
-- Pode rodar de novo sem problema.
-- =============================================================================

create or replace function public.admin_pacientes(
  p_busca      text    default null,
  p_confirmado boolean default null,
  p_status     text    default null,
  p_objetivo   text    default null,
  p_desde      date    default null,
  p_ate        date    default null,
  p_menor      boolean default null,
  p_alerta     boolean default null,
  p_ordem      text    default 'created_at',
  p_desc       boolean default true,
  p_limite     int     default 25,
  p_offset     int     default 0
)
returns table (
  id uuid, nome text, email text, whatsapp text, menor boolean, created_at timestamptz,
  email_confirmado_em timestamptz, ultimo_login timestamptz, bloqueado_ate timestamptz,
  deleted_at timestamptz, status text, admin boolean, objetivo text, alertas text[],
  revisar boolean, proximo_checkin date, total bigint
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
           exists (select 1 from public.admins ad where ad.user_id = p.id) as admin,
           f.objetivo, coalesce(f.alertas, '{}'::text[]) as alertas, coalesce(f.revisar, false) as revisar,
           a.proximo_checkin
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.acompanhamentos a on a.profile_id = p.id
      left join lateral (
        select pf.objetivo, pf.alertas, pf.revisar from public.pre_formularios pf
         where pf.profile_id = p.id and pf.deleted_at is null
         order by pf.created_at desc limit 1
      ) f on true
  )
  select b.id, b.nome, b.email, b.whatsapp, b.menor, b.created_at,
         b.email_confirmed_at, b.last_sign_in_at, b.banned_until, b.deleted_at,
         b.status, b.admin, b.objetivo, b.alertas, b.revisar, b.proximo_checkin, count(*) over ()
    from base b
   where (p_busca is null or b.nome ilike '%' || p_busca || '%' or b.email ilike '%' || p_busca || '%')
     and (p_confirmado is null or (b.email_confirmed_at is not null) = p_confirmado)
     and (p_status is null or b.status = p_status)
     and (p_status = 'desativado' or b.deleted_at is null)
     and (p_objetivo is null or b.objetivo = p_objetivo)
     and (p_desde is null or (b.created_at at time zone 'America/Sao_Paulo')::date >= p_desde)
     and (p_ate   is null or (b.created_at at time zone 'America/Sao_Paulo')::date <= p_ate)
     and (p_menor is null or b.menor = p_menor)
     and (p_alerta is null or (b.revisar or cardinality(b.alertas) > 0) = p_alerta)
   order by
     case when p_ordem = 'nome'         and not p_desc then lower(b.nome) end asc,
     case when p_ordem = 'nome'         and p_desc     then lower(b.nome) end desc,
     case when p_ordem = 'email'        and not p_desc then b.email end asc,
     case when p_ordem = 'email'        and p_desc     then b.email end desc,
     case when p_ordem = 'ultimo_login' and not p_desc then b.last_sign_in_at end asc nulls first,
     case when p_ordem = 'ultimo_login' and p_desc     then b.last_sign_in_at end desc nulls last,
     case when p_ordem = 'proximo_checkin' and not p_desc then b.proximo_checkin end asc nulls last,
     case when p_ordem = 'proximo_checkin' and p_desc     then b.proximo_checkin end desc nulls last,
     case when p_ordem = 'created_at'   and not p_desc then b.created_at end asc,
     b.created_at desc
   limit least(greatest(p_limite, 1), 100) offset greatest(p_offset, 0);
end $$;
revoke execute on function public.admin_pacientes(text, boolean, text, text, date, date, boolean, boolean, text, boolean, int, int) from public, anon;
grant execute on function public.admin_pacientes(text, boolean, text, text, date, date, boolean, boolean, text, boolean, int, int) to authenticated;
