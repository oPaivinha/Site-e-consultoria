import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { buscarPacientes, POR_PAGINA, type Filtros } from "@/lib/pacientes";
import { ALERTAS, OBJETIVOS, STATUS, data, rotulo } from "@/lib/rotulos";
import { comParams } from "@/lib/url";
import { Erro, Vazio } from "@/components/estados";

const campo = "w-full rounded-lg border border-linha bg-white px-3 py-2 text-sm outline-none focus:border-verde focus:ring-2 focus:ring-verde-claro";

export default async function Pacientes({ searchParams }: { searchParams: Promise<Filtros> }) {
  await exigirAdmin();
  const f = await searchParams;
  const base = { ...f, excluido: undefined } as Record<string, string | undefined>;

  let linhas;
  try {
    linhas = await buscarPacientes(f);
  } catch (e) {
    return <Erro>Não foi possível carregar os pacientes: {(e as Error).message}</Erro>;
  }

  const total = Number(linhas[0]?.total ?? 0);
  const pagina = Math.max(1, Number.parseInt(f.pagina ?? "1", 10) || 1);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const ordem = f.ordem ?? "created_at";
  const desc = f.dir !== "asc";
  const maisFiltros = Boolean(f.confirmado || f.status || f.objetivo || f.desde || f.ate || f.menor || f.alerta);
  const temFiltro = Boolean(f.q) || maisFiltros;

  // Cabeçalho de coluna que ordena ao clicar (clicar de novo inverte).
  const Ordenar = ({ col, children }: { col: string; children: React.ReactNode }) => {
    const ativa = ordem === col;
    const dir = ativa && desc ? "asc" : ativa ? "desc" : col === "nome" || col === "email" ? "asc" : "desc";
    return (
      <Link href={comParams("/pacientes", base, { ordem: col, dir, pagina: undefined })} className="inline-flex items-center gap-1 hover:text-verde">
        {children}
        {ativa && <span aria-hidden>{desc ? "↓" : "↑"}</span>}
      </Link>
    );
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Pacientes</h1>
          <p className="text-sm text-suave">{total} {total === 1 ? "paciente encontrado" : "pacientes encontrados"}</p>
        </div>
        <a
          href={comParams("/pacientes/exportar", base, { pagina: undefined })}
          className="rounded-full border border-verde px-4 py-2 text-sm font-medium text-verde hover:bg-tom"
        >
          Exportar CSV
        </a>
      </div>

      {f.excluido && <p role="status" className="mb-4 rounded-lg bg-verde-claro px-4 py-3 text-sm text-verde-escuro">Paciente excluído.</p>}
      <form method="get" className="mb-5 rounded-card border border-linha bg-superficie p-4">
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Buscar por nome ou e-mail</span>
            <input name="q" defaultValue={f.q} placeholder="Buscar por nome ou e-mail" className={campo} />
          </label>
          <button className="rounded-full bg-verde px-5 py-2 text-sm font-medium text-white hover:bg-verde-escuro">Filtrar</button>
        </div>
        <details open={maisFiltros} className="group mt-3">
          <summary className="cursor-pointer text-sm text-verde select-none">Mais filtros{maisFiltros ? " (ativos)" : ""}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Situação</span>
          <select name="status" defaultValue={f.status ?? ""} className={campo}>
            <option value="">Todas (menos desativados)</option>
            {Object.entries(STATUS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Objetivo</span>
          <select name="objetivo" defaultValue={f.objetivo ?? ""} className={campo}>
            <option value="">Todos</option>
            {Object.entries(OBJETIVOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">E-mail confirmado</span>
          <select name="confirmado" defaultValue={f.confirmado ?? ""} className={campo}>
            <option value="">Tanto faz</option>
            <option value="sim">Confirmado</option>
            <option value="nao">Não confirmado</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Alertas de saúde</span>
          <select name="alerta" defaultValue={f.alerta ?? ""} className={campo}>
            <option value="">Tanto faz</option>
            <option value="sim">Com alerta</option>
            <option value="nao">Sem alerta</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Cadastrado a partir de</span>
          <input type="date" name="desde" defaultValue={f.desde} className={campo} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Cadastrado até</span>
          <input type="date" name="ate" defaultValue={f.ate} className={campo} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-suave">Idade</span>
          <select name="menor" defaultValue={f.menor ?? ""} className={campo}>
            <option value="">Todas</option>
            <option value="sim">Menores de 18</option>
            <option value="nao">Adultos</option>
          </select>
        </label>
          </div>
        </details>
        {f.ordem && <input type="hidden" name="ordem" value={f.ordem} />}
        {f.dir && <input type="hidden" name="dir" value={f.dir} />}
        {temFiltro && <Link href="/pacientes" className="mt-3 inline-block text-sm text-suave underline">Limpar filtros</Link>}
      </form>

      {linhas.length === 0 ? (
        <Vazio titulo={temFiltro ? "Nenhum paciente com esses filtros." : "Ainda não há pacientes cadastrados."}>
          {temFiltro ? <Link href="/pacientes" className="text-verde underline">Limpar filtros</Link> : "Eles aparecem aqui assim que alguém preenche o pré-formulário do site."}
        </Vazio>
      ) : (
        <div className="overflow-x-auto rounded-card border border-linha bg-superficie">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-linha bg-tom text-xs uppercase tracking-wide text-suave">
              <tr>
                <th className="px-4 py-3"><Ordenar col="nome">Nome</Ordenar></th>
                <th className="px-4 py-3"><Ordenar col="email">E-mail</Ordenar></th>
                <th className="px-4 py-3">Objetivo</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3"><Ordenar col="proximo_checkin">Próx. check-in</Ordenar></th>
                <th className="px-4 py-3"><Ordenar col="created_at">Cadastro</Ordenar></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => {
                const alertas = p.alertas ?? [];
                return (
                  <tr key={p.id} className="border-b border-linha last:border-0 hover:bg-fundo">
                    <td className="px-4 py-3">
                      <Link href={`/pacientes/${p.id}`} className="font-medium text-verde-escuro hover:underline">
                        {p.nome || "(sem nome)"}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.menor && <Etiqueta>Menor</Etiqueta>}
                        {p.admin && <Etiqueta>Admin</Etiqueta>}
                        {(p.revisar || alertas.length > 0) && (
                          <Etiqueta tipo="alerta" titulo={alertas.map((a) => rotulo(ALERTAS, a)).join(", ")}>
                            {alertas.length > 0 ? `${alertas.length} ${alertas.length === 1 ? "alerta" : "alertas"}` : "Revisar"}
                          </Etiqueta>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{p.email}</div>
                      {!p.email_confirmado_em && <div className="text-xs text-alerta">E-mail não confirmado</div>}
                    </td>
                    <td className="px-4 py-3">{rotulo(OBJETIVOS, p.objetivo) || <span className="text-suave">—</span>}</td>
                    <td className="px-4 py-3">{rotulo(STATUS, p.status)}</td>
                    <td className="px-4 py-3">{data(p.proximo_checkin) || <span className="text-suave">—</span>}</td>
                    <td className="px-4 py-3">{data(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Páginas">
          {pagina > 1 ? (
            <Link href={comParams("/pacientes", base, { pagina: String(pagina - 1) })} className="text-verde underline">Anterior</Link>
          ) : <span />}
          <span className="text-suave">Página {pagina} de {paginas}</span>
          {pagina < paginas ? (
            <Link href={comParams("/pacientes", base, { pagina: String(pagina + 1) })} className="text-verde underline">Próxima</Link>
          ) : <span />}
        </nav>
      )}
    </>
  );
}

function Etiqueta({ children, tipo, titulo }: { children: React.ReactNode; tipo?: "alerta"; titulo?: string }) {
  return (
    <span
      title={titulo}
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${tipo === "alerta" ? "bg-perigo-claro text-perigo" : "bg-verde-claro text-verde-escuro"}`}
    >
      {children}
    </span>
  );
}
