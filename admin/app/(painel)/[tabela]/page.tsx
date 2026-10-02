import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { buscarRegistros, POR_PAGINA, type FiltrosTabela } from "@/lib/registros";
import { campo as campoDe, tabelaPorSlug } from "@/lib/tabelas";
import { mostrar } from "@/lib/campos";
import { comParams } from "@/lib/url";
import { Erro, Vazio } from "@/components/estados";
import { botao, botaoContorno, campo } from "@/components/estilos";

// Lista genérica: acompanhamentos, pré-formulários, anamneses, check-ins e observações.
export default async function ListaTabela({
  params, searchParams,
}: { params: Promise<{ tabela: string }>; searchParams: Promise<FiltrosTabela> }) {
  await exigirAdmin();
  const t = tabelaPorSlug((await params).tabela);
  if (!t) notFound();
  const f = await searchParams;
  const base = { ...f, excluido: undefined } as FiltrosTabela;
  const caminho = `/${t.slug}`;

  let resultado;
  try {
    resultado = await buscarRegistros(t, f);
  } catch (e) {
    return <Erro>Não foi possível carregar {t.titulo.toLowerCase()}: {(e as Error).message}</Erro>;
  }
  const { linhas, total } = resultado;
  const pagina = Math.max(1, Number.parseInt(f.pagina ?? "1", 10) || 1);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const lixeira = f.lixeira === "1";
  const nomesFiltros = ["desde", "ate", ...t.filtros.map((x) => x.nome)];
  const maisFiltros = nomesFiltros.some((n) => f[n]);
  const temFiltro = Boolean(f.q || f.paciente) || maisFiltros;
  const ordemAtual = f.ordem ?? t.ordem;
  const asc = f.dir ? f.dir === "asc" : ordemAtual === "proximo_checkin";

  const Cabecalho = ({ col }: { col: string }) => {
    const c = campoDe(t, col);
    if (!t.ordenaveis.includes(col)) return <>{c.rotulo}</>;
    const ativa = ordemAtual === col;
    return (
      <Link href={comParams(caminho, base, { ordem: col, dir: ativa ? (asc ? "desc" : "asc") : "desc", pagina: undefined })} className="inline-flex items-center gap-1 hover:text-verde">
        {c.rotulo}
        {ativa && <span aria-hidden>{asc ? "↑" : "↓"}</span>}
      </Link>
    );
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">{t.titulo}{lixeira && " — lixeira"}</h1>
          <p className="text-sm text-suave">{total} {total === 1 ? "registro" : "registros"}. {t.descricao}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={comParams(`${caminho}/exportar`, base, { pagina: undefined })} className={botaoContorno}>Exportar CSV</a>
          {t.podeCriar && !lixeira && <Link href={`${caminho}/novo`} className={botao}>Novo {t.singular}</Link>}
        </div>
      </div>

      {f.excluido && <p role="status" className="mb-4 rounded-lg bg-verde-claro px-4 py-3 text-sm text-verde-escuro">Registro movido para a lixeira.</p>}

      <form method="get" className="mb-5 rounded-card border border-linha bg-superficie p-4">
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Buscar pelo nome ou e-mail do paciente</span>
            <input name="q" defaultValue={f.q} placeholder="Buscar pelo nome ou e-mail do paciente" className={campo} />
          </label>
          <button className={botao}>Filtrar</button>
        </div>
        <details open={maisFiltros} className="mt-3">
          <summary className="cursor-pointer select-none text-sm text-verde">Mais filtros{maisFiltros ? " (ativos)" : ""}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.filtros.map((x) => (
              <label key={x.nome}>
                <span className="mb-1 block text-xs font-medium text-suave">{x.rotulo}</span>
                <select name={x.nome} defaultValue={f[x.nome] ?? ""} className={campo}>
                  <option value="">Tanto faz</option>
                  {Object.entries(x.tipo === "simnao" ? { sim: "Sim", nao: "Não" } : x.opcoes).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </label>
            ))}
            <label>
              <span className="mb-1 block text-xs font-medium text-suave">Recebido a partir de</span>
              <input type="date" name="desde" defaultValue={f.desde} className={campo} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-suave">Recebido até</span>
              <input type="date" name="ate" defaultValue={f.ate} className={campo} />
            </label>
          </div>
        </details>
        {f.ordem && <input type="hidden" name="ordem" value={f.ordem} />}
        {f.dir && <input type="hidden" name="dir" value={f.dir} />}
        {f.paciente && <input type="hidden" name="paciente" value={f.paciente} />}
        {lixeira && <input type="hidden" name="lixeira" value="1" />}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {temFiltro && <Link href={lixeira ? `${caminho}?lixeira=1` : caminho} className="text-suave underline">Limpar filtros</Link>}
          <Link href={lixeira ? caminho : `${caminho}?lixeira=1`} className="text-suave underline">
            {lixeira ? "Voltar para a lista" : "Ver lixeira"}
          </Link>
        </div>
      </form>

      {linhas.length === 0 ? (
        <Vazio titulo={temFiltro ? "Nada encontrado com esses filtros." : lixeira ? "A lixeira está vazia." : `Ainda não há ${t.titulo.toLowerCase()}.`} />
      ) : (
        <div className="relative overflow-x-auto rounded-card border border-linha bg-superficie">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-linha bg-tom text-xs uppercase tracking-wide text-suave">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                {t.lista.map((col) => <th key={col} className="px-4 py-3"><Cabecalho col={col} /></th>)}
                <th className="px-4 py-3"><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const id = String(l[t.chave]);
                return (
                  <tr key={id} className="border-b border-linha last:border-0 hover:bg-fundo">
                    <td className="px-4 py-3">
                      <Link href={`/pacientes/${l.profile_id}`} className="font-medium text-verde-escuro hover:underline">
                        {l.paciente?.nome || "(sem nome)"}
                      </Link>
                      <div className="text-xs text-suave">{l.paciente?.email}</div>
                    </td>
                    {t.lista.map((col) => {
                      const c = campoDe(t, col);
                      const texto = mostrar(c, l[col]);
                      const destaque = (col === "alerta" || col === "alertas") && texto && texto !== "Nenhum";
                      return (
                        <td key={col} className={`px-4 py-3 ${destaque ? "font-medium text-perigo" : ""}`}>
                          {texto ? (c.tipo === "textolongo" ? <span className="line-clamp-2 max-w-xs">{texto}</span> : texto) : <span className="text-suave">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <Link href={`${caminho}/${id}`} className="text-verde underline">Abrir</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Páginas">
          {pagina > 1 ? <Link href={comParams(caminho, base, { pagina: String(pagina - 1) })} className="text-verde underline">Anterior</Link> : <span />}
          <span className="text-suave">Página {pagina} de {paginas}</span>
          {pagina < paginas ? <Link href={comParams(caminho, base, { pagina: String(pagina + 1) })} className="text-verde underline">Próxima</Link> : <span />}
        </nav>
      )}
    </>
  );
}
