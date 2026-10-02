import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { buscarRegistro } from "@/lib/registros";
import { tabelaPorSlug, type Campo } from "@/lib/tabelas";
import { mostrar, valorInicial } from "@/lib/campos";
import { humanizar, nomeCampo } from "@/lib/humanizar";
import { Erro } from "@/components/estados";
import { botaoPerigo, botaoContorno } from "@/components/estilos";
import { BotaoConfirmar } from "@/components/confirmar";
import { FormRegistro } from "../formulario";
import { moverParaLixeira, restaurar } from "../actions";

type Busca = { criado?: string; restaurado?: string; erro?: string };

export default async function DetalheRegistro({
  params, searchParams,
}: { params: Promise<{ tabela: string; id: string }>; searchParams: Promise<Busca> }) {
  await exigirAdmin();
  const { tabela, id } = await params;
  const t = tabelaPorSlug(tabela);
  if (!t || !(/^[0-9a-f-]{36}$/.test(id) || /^\d{1,18}$/.test(id))) notFound();
  const avisos = await searchParams;

  let r;
  try {
    r = await buscarRegistro(t, id);
  } catch (e) {
    return <Erro>Não foi possível carregar: {(e as Error).message}</Erro>;
  }
  if (!r) notFound();

  const excluido = Boolean(r.deleted_at);
  const valores = Object.fromEntries(t.campos.map((c) => [c.col, valorInicial(c, r[c.col])]));
  const listas = Object.fromEntries(t.campos.filter((c) => c.tipo === "lista").map((c) => [c.col, (r[c.col] as string[]) ?? []]));

  return (
    <>
      <Link href={`/${t.slug}`} className="text-sm text-verde underline">← {t.titulo}</Link>
      <div className="mt-2 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">{t.singular.charAt(0).toUpperCase() + t.singular.slice(1)}</h1>
          <p className="text-sm text-suave">
            de{" "}
            <Link href={`/pacientes/${r.profile_id}`} className="text-verde-escuro underline">{r.paciente?.nome || "(sem nome)"}</Link>
            {r.paciente?.email && ` · ${r.paciente.email}`}
          </p>
        </div>
      </div>

      {avisos.criado && <Aviso>Registro criado.</Aviso>}
      {avisos.restaurado && <Aviso>Registro restaurado.</Aviso>}
      {avisos.erro && <p role="alert" className="mb-4 rounded-lg bg-perigo-claro px-4 py-3 text-sm text-perigo">{avisos.erro}</p>}

      {excluido && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-alerta bg-alerta-claro p-4 text-sm">
          <span>Este registro está na lixeira desde {mostrar({ col: "", rotulo: "", tipo: "datahora" }, r.deleted_at)}. O paciente não o vê.</span>
          <form action={restaurar}>
            <input type="hidden" name="slug" value={t.slug} />
            <input type="hidden" name="id" value={id} />
            <button className={botaoContorno}>Restaurar</button>
          </form>
        </div>
      )}

      <section className="mb-5 rounded-card border border-linha bg-superficie p-5">
        <h2 className="mb-3 text-xl">Dados</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {t.campos.filter((c) => c.tipo !== "paciente" && c.tipo !== "json").map((c) => (
            <div key={c.col}>
              <dt className="text-xs font-medium text-suave">{c.rotulo}</dt>
              <dd className="whitespace-pre-wrap">{mostrar(c, r[c.col]) || "—"}</dd>
            </div>
          ))}
        </dl>
        {t.campos.filter((c) => c.tipo === "json").map((c) => <Json key={c.col} c={c} v={r[c.col]} />)}
      </section>

      {!excluido && (
        <>
          <details className="mb-5 rounded-card border border-linha bg-superficie p-5">
            <summary className="cursor-pointer select-none font-display text-xl">Editar</summary>
            <div className="mt-4">
              <FormRegistro slug={t.slug} id={id} campos={t.campos} valores={valores} listas={listas} />
            </div>
          </details>
          <form action={moverParaLixeira} className="rounded-card border border-linha bg-superficie p-5">
            <input type="hidden" name="slug" value={t.slug} />
            <input type="hidden" name="id" value={id} />
            <p className="mb-3 text-sm text-suave">Excluir manda o registro para a lixeira: some da lista e do site do paciente, mas pode ser restaurado.</p>
            <BotaoConfirmar pergunta={`Mover este ${t.singular} para a lixeira?`} className={botaoPerigo}>Excluir</BotaoConfirmar>
          </form>
        </>
      )}
    </>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p role="status" className="mb-4 rounded-lg bg-verde-claro px-4 py-3 text-sm text-verde-escuro">{children}</p>;
}

// Mostra respostas guardadas em JSON como uma lista "pergunta: resposta".
function Json({ c, v }: { c: Campo; v: unknown }) {
  const entradas = v && typeof v === "object" ? Object.entries(v as Record<string, unknown>) : [];
  return (
    <div className="mt-5">
      <h3 className="mb-2 font-medium">{c.rotulo}</h3>
      {entradas.length === 0 ? (
        <p className="text-sm text-suave">Nada preenchido.</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {entradas.map(([k, x]) => (
            <div key={k}>
              <dt className="text-xs font-medium text-suave">{nomeCampo(k)}</dt>
              <dd className="whitespace-pre-wrap">
                {x && typeof x === "object" && !Array.isArray(x)
                  ? Object.entries(x as Record<string, unknown>).map(([k2, y]) => `${nomeCampo(k2)}: ${humanizar(y)}`).join(" · ")
                  : humanizar(x)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
