import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { supabaseServidor } from "@/lib/supabase/server";
import { data } from "@/lib/rotulos";
import { nomeCampo } from "@/lib/humanizar";
import type { Linha as LinhaDoBanco } from "@/lib/database.types";
import { comParams } from "@/lib/url";
import { Erro, Vazio } from "@/components/estados";
import { botao, campo } from "@/components/estilos";

// Log de auditoria: tudo o que um admin criou, alterou ou apagou, com o "antes e depois".
// As linhas são gravadas pelo banco (gatilhos) e pelas ações de conta; ninguém consegue editá-las pelo painel.

type Linha = Omit<LinhaDoBanco<"audit_log">, "admin_id" | "antes" | "depois"> & {
  antes: Record<string, unknown> | null; depois: Record<string, unknown> | null;
};
type Filtros = { tabela?: string; acao?: string; admin?: string; registro?: string; desde?: string; ate?: string; pagina?: string };

const TABELAS: Record<string, { nome: string; link?: string }> = {
  profiles: { nome: "Paciente (perfil)", link: "/pacientes" },
  conta: { nome: "Conta de acesso", link: "/pacientes" },
  admins: { nome: "Administradores", link: "/pacientes" },
  acompanhamentos: { nome: "Acompanhamento", link: "/acompanhamentos" },
  pre_formularios: { nome: "Pré-formulário", link: "/pre-formularios" },
  anamneses: { nome: "Anamnese", link: "/anamneses" },
  checkins: { nome: "Check-in", link: "/checkins" },
  notas_internas: { nome: "Observação interna", link: "/observacoes" },
};
const ACOES: Record<string, string> = {
  insert: "Criou", update: "Alterou", delete: "Apagou",
  reenviar_confirmacao: "Reenviou confirmação", enviar_nova_senha: "Enviou link de nova senha",
  desativar: "Desativou a conta", reativar: "Reativou a conta", excluir_conta: "Excluiu a conta",
  importar_criar: "Importou (conta nova)", importar_atualizar: "Importou (atualizou)",
};
const POR_PAGINA = 30;
const IGNORAR = new Set(["updated_at"]);
const dataValida = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export default async function Auditoria({ searchParams }: { searchParams: Promise<Filtros> }) {
  await exigirAdmin();
  const f = await searchParams;
  const pagina = Math.max(1, Number.parseInt(f.pagina ?? "1", 10) || 1);
  const supabase = await supabaseServidor();

  let q = supabase.from("audit_log").select("id,em,admin_email,tabela,registro_id,acao,antes,depois", { count: "exact" });
  if (f.tabela && TABELAS[f.tabela]) q = q.eq("tabela", f.tabela);
  if (f.acao && ACOES[f.acao]) q = q.eq("acao", f.acao);
  const admin = f.admin?.trim().replace(/[,()*%\\]/g, "").slice(0, 100);
  if (admin) q = q.ilike("admin_email", `%${admin}%`);
  const registro = f.registro?.trim().slice(0, 40);
  if (registro && /^[0-9a-f-]+$/i.test(registro)) q = q.eq("registro_id", registro);
  const desde = dataValida(f.desde), ate = dataValida(f.ate);
  if (desde) q = q.gte("em", `${desde}T00:00:00-03:00`);
  if (ate) q = q.lte("em", `${ate}T23:59:59.999-03:00`);
  const { data: linhas, count, error } = await q
    .order("em", { ascending: false })
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (error) return <Erro>Não foi possível carregar a auditoria: {error.message}</Erro>;

  const rows = (linhas ?? []) as Linha[];
  // Nome do paciente de cada linha (uma consulta só).
  const pacienteDe = (l: Linha) =>
    ["profiles", "conta", "admins", "acompanhamentos"].includes(l.tabela)
      ? l.registro_id
      : String((l.depois ?? l.antes)?.profile_id ?? "");
  const ids = [...new Set(rows.map(pacienteDe).filter((x): x is string => Boolean(x && /^[0-9a-f-]{36}$/.test(x))))];
  const nomes = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id,nome").in("id", ids);
    for (const p of ps ?? []) nomes.set(p.id, p.nome || "(sem nome)");
  }

  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const temFiltro = Boolean(f.tabela || f.acao || f.admin || f.registro || f.desde || f.ate);

  return (
    <>
      <h1 className="text-3xl">Auditoria</h1>
      <p className="mb-5 text-sm text-suave">
        {total} {total === 1 ? "registro" : "registros"}. Tudo o que um admin criou, alterou ou apagou pelo painel, com o antes e o depois. Senhas e tokens nunca entram aqui.
      </p>

      <form method="get" className="mb-5 grid gap-3 rounded-card border border-linha bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Onde</span>
          <select name="tabela" defaultValue={f.tabela ?? ""} className={campo}>
            <option value="">Tudo</option>
            {Object.entries(TABELAS).map(([v, t]) => <option key={v} value={v}>{t.nome}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Ação</span>
          <select name="acao" defaultValue={f.acao ?? ""} className={campo}>
            <option value="">Todas</option>
            {Object.entries(ACOES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">E-mail do admin</span>
          <input name="admin" defaultValue={f.admin} className={campo} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">De</span>
          <input type="date" name="desde" defaultValue={f.desde} className={campo} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Até</span>
          <input type="date" name="ate" defaultValue={f.ate} className={campo} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Número ou id do registro</span>
          <input name="registro" defaultValue={f.registro} className={campo} />
        </label>
        <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
          <button className={botao}>Filtrar</button>
          {temFiltro && <Link href="/auditoria" className="text-sm text-suave underline">Limpar filtros</Link>}
        </div>
      </form>

      {rows.length === 0 ? (
        <Vazio titulo={temFiltro ? "Nada encontrado com esses filtros." : "Nenhuma alteração registrada ainda."} />
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => {
            const t = TABELAS[l.tabela];
            const pid = pacienteDe(l);
            const link = t?.link && l.registro_id && l.acao !== "excluir_conta" && l.acao !== "delete"
              ? `${t.link}/${l.registro_id}`
              : null;
            return (
              <li key={l.id} className="rounded-card border border-linha bg-superficie">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                    <span className="text-suave">{data(l.em, true)}</span>
                    <span className="font-medium">{ACOES[l.acao] ?? l.acao}</span>
                    <span>{t?.nome ?? l.tabela}{l.registro_id && !/^[0-9a-f-]{36}$/.test(l.registro_id) ? ` nº ${l.registro_id}` : ""}</span>
                    {pid && <span className="text-verde-escuro">{nomes.get(pid) ?? "(paciente excluído)"}</span>}
                    <span className="ml-auto text-xs text-suave">{l.admin_email ?? "—"}</span>
                  </summary>
                  <div className="border-t border-linha px-4 py-3">
                    <Diferencas antes={l.antes} depois={l.depois} />
                    {link && <Link href={link} className="mt-3 inline-block text-sm text-verde underline">Abrir registro</Link>}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Páginas">
          {pagina > 1 ? <Link href={comParams("/auditoria", f, { pagina: String(pagina - 1) })} className="text-verde underline">Anterior</Link> : <span />}
          <span className="text-suave">Página {pagina} de {paginas}</span>
          {pagina < paginas ? <Link href={comParams("/auditoria", f, { pagina: String(pagina + 1) })} className="text-verde underline">Próxima</Link> : <span />}
        </nav>
      )}
    </>
  );
}

const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

// Em alterações, mostra só os campos que mudaram. Em criação/exclusão, mostra todos.
function Diferencas({ antes, depois }: { antes: Record<string, unknown> | null; depois: Record<string, unknown> | null }) {
  if (!antes && !depois) return <p className="text-sm text-suave">Sem detalhes (ação de conta).</p>;
  const chaves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(depois ?? {})])].filter((k) => !IGNORAR.has(k));
  const mudou = (k: string) => fmt(antes?.[k]) !== fmt(depois?.[k]);
  const mostrar = antes && depois ? chaves.filter(mudou) : chaves.filter((k) => fmt((depois ?? antes)?.[k]) !== "—");
  if (mostrar.length === 0) return <p className="text-sm text-suave">Nenhum campo mudou.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-suave">
          <tr>
            <th className="py-1 pr-4 font-medium">Campo</th>
            {antes && <th className="py-1 pr-4 font-medium">Antes</th>}
            {depois && <th className="py-1 font-medium">Depois</th>}
          </tr>
        </thead>
        <tbody>
          {mostrar.map((k) => (
            <tr key={k} className="border-t border-linha align-top">
              <td className="py-1 pr-4" title={k}>{nomeCampo(k)}</td>
              {antes && <td className="max-w-xs break-words py-1 pr-4 text-perigo">{fmt(antes[k])}</td>}
              {depois && <td className="max-w-xs break-words py-1 text-verde-escuro">{fmt(depois[k])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
