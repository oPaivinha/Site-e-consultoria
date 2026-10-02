import "server-only";
import { supabaseServidor } from "@/lib/supabase/server";
import { colunas, type Tabela } from "@/lib/tabelas";

export type Registro = Record<string, unknown> & { paciente?: { nome: string | null; email: string | null } | null };
export type FiltrosTabela = Record<string, string | undefined>;

export const POR_PAGINA = 25;
const SINAIS_ALARME = "{sangue_fezes,dor_forte,diarreia_vomito,tontura}";
const dataValida = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Busca uma página da tabela com os filtros da URL. Tudo é filtrado e paginado no banco.
export async function buscarRegistros(t: Tabela, f: FiltrosTabela, limite = POR_PAGINA, offset?: number) {
  const supabase = await supabaseServidor();
  const busca = f.q?.trim().slice(0, 100).replace(/[,()*%\\]/g, " ").trim();
  // "!inner" faz a busca pelo nome do paciente filtrar as linhas da tabela.
  const paciente = `paciente:profiles!profile_id${busca ? "!inner" : ""}(nome,email)`;
  let q = supabase.from(t.tabela).select(`${colunas(t)},${paciente}`, { count: "exact" });

  q = f.lixeira === "1" ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  if (busca) q = q.or(`nome.ilike.*${busca}*,email.ilike.*${busca}*`, { referencedTable: "paciente" });
  if (f.paciente && /^[0-9a-f-]{36}$/.test(f.paciente)) q = q.eq("profile_id", f.paciente);
  const desde = dataValida(f.desde), ate = dataValida(f.ate);
  if (desde) q = q.gte("created_at", desde);
  if (ate) q = q.lt("created_at", new Date(new Date(ate).getTime() + 86400000).toISOString().slice(0, 10));

  switch (t.slug) {
    case "acompanhamentos":
      if (f.situacao === "ativo") q = q.eq("ativo", true).eq("pausado", false);
      if (f.situacao === "pausado") q = q.eq("pausado", true);
      if (f.situacao === "sem_inicio") q = q.is("inicio_acompanhamento", null);
      if (f.atrasado === "sim") q = q.eq("ativo", true).eq("pausado", false).lt("proximo_checkin", hoje());
      if (f.atrasado === "nao") q = q.or(`ativo.eq.false,pausado.eq.true,proximo_checkin.is.null,proximo_checkin.gte.${hoje()}`);
      break;
    case "pre-formularios":
      if (f.objetivo && /^[a-z_]{1,40}$/.test(f.objetivo)) q = q.eq("objetivo", f.objetivo);
      if (f.alerta === "sim") q = q.or("revisar.eq.true,alertas.neq.{}");
      if (f.alerta === "nao") q = q.eq("revisar", false).eq("alertas", "{}");
      break;
    case "anamneses":
      if (f.agua && /^[a-z0-9_]{1,20}$/.test(f.agua)) q = q.eq("agua", f.agua);
      break;
    case "checkins":
      if (f.alerta === "sim") q = q.overlaps("alerta", SINAIS_ALARME);
      if (f.alerta === "nao") q = q.not("alerta", "ov", SINAIS_ALARME);
      if (f.contato === "sim") q = q.eq("quer_contato", true);
      if (f.contato === "nao") q = q.eq("quer_contato", false);
      break;
    case "observacoes":
      if (f.de_checkin === "sim") q = q.not("checkin_id", "is", null);
      if (f.de_checkin === "nao") q = q.is("checkin_id", null);
      break;
  }

  const ordem = f.ordem && [...t.ordenaveis, t.ordem].includes(f.ordem) ? f.ordem : t.ordem;
  const asc = f.dir ? f.dir === "asc" : ordem === "proximo_checkin";
  const pagina = Math.max(1, Number.parseInt(f.pagina ?? "1", 10) || 1);
  const inicio = offset ?? (pagina - 1) * limite;
  q = q.order(ordem, { ascending: asc, nullsFirst: false }).order(t.chave, { ascending: false }).range(inicio, inicio + limite - 1);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { linhas: (data ?? []) as unknown as Registro[], total: count ?? 0 };
}

export async function buscarRegistro(t: Tabela, id: string) {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from(t.tabela)
    .select(`${colunas(t)},paciente:profiles!profile_id(nome,email)`)
    .eq(t.chave, id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as Registro | null;
}

// Pacientes para o campo "Paciente" do formulário (nome e e-mail, em ordem alfabética).
export async function listaPacientes() {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from("profiles").select("id,nome,email").order("nome").limit(2000);
  if (error) throw new Error(error.message);
  return data ?? [];
}
