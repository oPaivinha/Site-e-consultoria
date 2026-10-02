import "server-only";
import { supabaseServidor } from "@/lib/supabase/server";

export type Paciente = {
  id: string; nome: string | null; email: string | null; whatsapp: string | null; menor: boolean | null;
  created_at: string; email_confirmado_em: string | null; ultimo_login: string | null;
  bloqueado_ate: string | null; deleted_at: string | null; status: string; admin: boolean;
  objetivo: string | null; alertas: string[]; revisar: boolean; proximo_checkin: string | null; total: number;
};

export type Filtros = {
  q?: string; confirmado?: string; status?: string; objetivo?: string; desde?: string; ate?: string;
  menor?: string; alerta?: string; ordem?: string; dir?: string; pagina?: string;
};

export const POR_PAGINA = 25;
const ORDENS = ["nome", "email", "created_at", "ultimo_login", "proximo_checkin"];
const dataValida = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const simNao = (v?: string) => (v === "sim" ? true : v === "nao" ? false : null);

// Transforma os filtros da URL nos parâmetros da função admin_pacientes do banco
// (só aceita valores conhecidos; o resto é ignorado).
export function parametros(f: Filtros, limite = POR_PAGINA, offset?: number) {
  const pagina = Math.max(1, Number.parseInt(f.pagina ?? "1", 10) || 1);
  return {
    p_busca: f.q?.trim().slice(0, 100) || null,
    p_confirmado: simNao(f.confirmado),
    p_status: f.status && ["novo", "ativo", "pausado", "desativado"].includes(f.status) ? f.status : null,
    p_objetivo: f.objetivo?.slice(0, 40) || null,
    p_desde: dataValida(f.desde),
    p_ate: dataValida(f.ate),
    p_menor: simNao(f.menor),
    p_alerta: simNao(f.alerta),
    p_ordem: f.ordem && ORDENS.includes(f.ordem) ? f.ordem : "created_at",
    p_desc: f.dir !== "asc",
    p_limite: limite,
    p_offset: offset ?? (pagina - 1) * limite,
  };
}

export async function buscarPacientes(f: Filtros, limite = POR_PAGINA, offset?: number) {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("admin_pacientes", parametros(f, limite, offset));
  if (error) throw new Error(error.message);
  return (data ?? []) as Paciente[];
}
