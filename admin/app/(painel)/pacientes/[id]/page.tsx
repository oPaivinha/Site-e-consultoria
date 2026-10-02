import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { supabaseServidor } from "@/lib/supabase/server";
import { ALERTAS, OBJETIVOS, PAGAMENTO, data, reais, rotulo } from "@/lib/rotulos";
import { humanizar, nomeCampo } from "@/lib/humanizar";
import { Erro } from "@/components/estados";
import { FormAcompanhamento, FormObservacao } from "./formularios";
import { AcoesConta } from "./acoes-conta";
import { FormLiberacao } from "./pagamento";

// Colunas lidas explicitamente (o banco não libera "select *" em checkins e acompanhamentos).
const COL_ACOMP = "ativo, pausado, inicio_acompanhamento, proximo_checkin, ultimo_envio, ultima_resposta, lembretes_enviados";
const COL_CHECKIN = "id, created_at, enviado_em, adesao, refeicoes_dificeis, fome, deslizes, deslize_motivo, agua, freq_evacuacao, bristol, sintomas_gi, alerta, energia, peso_kg, recado, quer_contato, deleted_at";

type Conta = { email: string; criado_em: string; email_confirmado_em: string | null; ultimo_login: string | null; bloqueado_ate: string | null; admin: boolean };
type Item = { tipo: "pre" | "anamnese" | "checkin"; quando: string; dados: Record<string, unknown> };

export default async function FichaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await supabaseServidor();
  const [perfil, conta, acomp, pres, anams, checks, notas, pags, liberacao] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("admin_conta", { p_id: id }),
    supabase.from("acompanhamentos").select(COL_ACOMP).eq("profile_id", id).maybeSingle(),
    supabase.from("pre_formularios").select("*").eq("profile_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("anamneses").select("*").eq("profile_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("checkins").select(COL_CHECKIN).eq("profile_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("notas_internas").select("checkin_id, texto").eq("profile_id", id).is("deleted_at", null),
    supabase.from("pagamentos").select("id, plano, valor, status, metodo, parcelas, pago_em, created_at").eq("profile_id", id)
      .not("status", "in", "(pendente,cancelado)").order("created_at", { ascending: false }),
    supabase.from("liberacoes_pagamento").select("profile_id").eq("profile_id", id).maybeSingle(),
  ]);

  const falha = [perfil, conta, acomp, pres, anams, checks, notas, pags, liberacao].find((r) => r.error);
  if (falha?.error) return <Erro>Não foi possível carregar a ficha: {falha.error.message}</Erro>;
  if (!perfil.data) notFound();

  const p = perfil.data as Record<string, any>;
  const c = conta.data as Conta | null;
  const a = acomp.data as Record<string, any> | null;
  const listaPre = (pres.data ?? []) as Record<string, any>[];
  const listaAnam = (anams.data ?? []) as Record<string, any>[];
  const listaCheck = (checks.data ?? []) as Record<string, any>[];
  const listaNotas = (notas.data ?? []) as { checkin_id: number | null; texto: string }[];
  const observacao = listaNotas.find((n) => n.checkin_id === null)?.texto ?? "";
  const avisosCheckin = new Map(listaNotas.filter((n) => n.checkin_id !== null).map((n) => [n.checkin_id, n.texto]));

  // ---- Alertas de risco em destaque ----
  const ultimoPre = listaPre[0];
  const alertas: { texto: string; origem: string }[] = [];
  for (const cod of (ultimoPre?.alertas ?? []) as string[]) {
    const qual = ultimoPre?.saude?.[cod]?.qual;
    alertas.push({ texto: rotulo(ALERTAS, cod) + (qual ? `: ${qual}` : ""), origem: `Pré-formulário de ${data(ultimoPre.created_at)}` });
  }
  if (ultimoPre && typeof ultimoPre.scoff_sim === "number" && ultimoPre.scoff_sim >= 2 && !(ultimoPre.alertas ?? []).includes("scoff_positivo")) {
    alertas.push({ texto: `SCOFF com ${ultimoPre.scoff_sim} respostas "sim"`, origem: `Pré-formulário de ${data(ultimoPre.created_at)}` });
  }
  for (const ck of listaCheck.slice(0, 3)) {
    for (const cod of (ck.alerta ?? []) as string[]) {
      alertas.push({ texto: rotulo(ALERTAS, cod), origem: `Check-in de ${data(ck.created_at)}` });
    }
    if (ck.quer_contato) alertas.push({ texto: "Pediu contato da nutricionista", origem: `Check-in de ${data(ck.created_at)}` });
  }

  // ---- Linha do tempo ----
  const linha: Item[] = [
    ...listaPre.map((d) => ({ tipo: "pre" as const, quando: d.created_at, dados: d })),
    ...listaAnam.map((d) => ({ tipo: "anamnese" as const, quando: d.created_at, dados: d })),
    ...listaCheck.map((d) => ({ tipo: "checkin" as const, quando: d.created_at, dados: d })),
  ].sort((x, y) => y.quando.localeCompare(x.quando));

  const status = p.deleted_at ? "Desativado" : a?.pausado ? "Pausado" : a?.ativo ? "Em acompanhamento" : "Sem acompanhamento";

  return (
    <>
      <Link href="/pacientes" className="text-sm text-verde underline">← Pacientes</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-3xl">{p.nome || "(sem nome)"}</h1>
        <span className="rounded-full bg-verde-claro px-3 py-1 text-xs font-medium text-verde-escuro">{status}</span>
        {p.menor && <span className="rounded-full bg-tom px-3 py-1 text-xs font-medium">Menor de 18</span>}
      </div>

      {alertas.length > 0 && (
        <section className="mb-6 rounded-card border border-perigo/30 bg-perigo-claro p-4" aria-label="Alertas de risco">
          <h2 className="mb-2 font-sans text-base font-bold text-perigo">⚠ Atenção: {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"}</h2>
          <ul className="space-y-1 text-sm">
            {alertas.map((al, i) => (
              <li key={i}><strong className="text-perigo">{al.texto}</strong> <span className="text-suave">({al.origem})</span></li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao titulo="Contato">
          <Dado rotulo="E-mail da conta">{p.email}</Dado>
          <Dado rotulo="WhatsApp">{p.whatsapp || "—"}</Dado>
          <Dado rotulo="Nascimento">{data(p.nascimento) || "—"}</Dado>
          <Dado rotulo="Sexo">{humanizar(p.sexo)}</Dado>
          <Dado rotulo="Prefere contato por">{humanizar(p.canal)}</Dado>
          <Dado rotulo="Aceita check-in">{humanizar(p.aceita_checkin)}</Dado>
          {p.menor && (
            <>
              <Dado rotulo="E-mail do paciente">{p.email_paciente || "—"}</Dado>
              <Dado rotulo="Responsável">{[p.responsavel_nome, p.responsavel_parentesco].filter(Boolean).join(", ") || "—"}</Dado>
              <Dado rotulo="WhatsApp do responsável">{p.responsavel_whatsapp || "—"}</Dado>
            </>
          )}
        </Cartao>

        <Cartao titulo="Conta">
          <Dado rotulo="Cadastro">{data(c?.criado_em, true)}</Dado>
          <Dado rotulo="E-mail confirmado">{c?.email_confirmado_em ? data(c.email_confirmado_em, true) : <span className="text-alerta">Ainda não</span>}</Dado>
          <Dado rotulo="Último login">{data(c?.ultimo_login, true) || "Nunca"}</Dado>
          <Dado rotulo="Consentimento">{p.consentimento_em ? `${data(p.consentimento_em)} (versão ${p.versao_consentimento ?? "?"})` : "—"}</Dado>
          {c?.admin && <Dado rotulo="Acesso">Administrador</Dado>}
        </Cartao>

        <Cartao titulo="Acompanhamento">
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
            <Dado rotulo="Próximo check-in">{data(a?.proximo_checkin) || "—"}</Dado>
            <Dado rotulo="Última resposta">{data(a?.ultima_resposta) || "—"}</Dado>
          </div>
          <FormAcompanhamento profileId={id} inicio={a?.inicio_acompanhamento ?? ""} pausado={Boolean(a?.pausado)} />
        </Cartao>
      </div>

      <section className="mt-4 rounded-card border border-linha bg-superficie p-4">
        <h2 className="mb-2 text-xl">Pagamento</h2>
        {(pags.data ?? []).length === 0 ? (
          <p className="text-sm text-suave">Nenhum pagamento ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(pags.data ?? []).map((g) => (
              <li key={g.id}>
                <strong>{rotulo(PAGAMENTO, g.status)}</strong>: plano {g.plano}, {reais(g.valor)}
                {g.metodo ? ` por ${g.metodo}` : ""}{g.parcelas && g.parcelas > 1 ? ` em ${g.parcelas}x` : ""}
                <span className="text-suave"> ({data(g.pago_em ?? g.created_at, true)})</span>
              </li>
            ))}
          </ul>
        )}
        {ultimoPre?.revisar && <FormLiberacao profileId={id} liberado={Boolean(liberacao.data)} />}
      </section>

      <AcoesConta
        id={id}
        nome={p.nome || p.email}
        confirmado={Boolean(c?.email_confirmado_em)}
        desativado={Boolean(p.deleted_at)}
        admin={Boolean(c?.admin)}
        souEu={eu.id === id}
      />

      <section className="mt-4 rounded-card border border-linha bg-superficie p-4">
        <h2 className="mb-2 text-xl">Observações internas</h2>
        <FormObservacao profileId={id} texto={observacao} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-2xl">Linha do tempo</h2>
        {linha.length === 0 ? (
          <p className="text-suave">Nenhum formulário enviado ainda.</p>
        ) : (
          <ol className="space-y-3 border-l-2 border-verde-claro pl-4">
            {linha.map((it) => (
              <li key={`${it.tipo}-${it.dados.id}`} className="relative">
                <span className="absolute top-4 -left-[23px] h-3 w-3 rounded-full border-2 border-white bg-verde" />
                <Evento item={it} aviso={it.tipo === "checkin" ? avisosCheckin.get(it.dados.id as number) : undefined} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-linha bg-superficie p-4">
      <h2 className="mb-3 text-xl">{titulo}</h2>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-suave">{rotulo}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

const TITULOS = { pre: "Pré-formulário", anamnese: "Anamnese", checkin: "Check-in" };
const OCULTAR = new Set(["id", "profile_id", "created_at", "enviado_em", "importado_de", "avisado_em", "deleted_at", "consentimento", "consentimento_em", "versao_consentimento", "respostas", "saude", "responsavel", "alertas", "alerta", "revisar"]);

function Evento({ item, aviso }: { item: Item; aviso?: string }) {
  const d = item.dados as Record<string, any>;
  const riscos: string[] = [
    ...((d.alertas ?? []) as string[]),
    ...((d.alerta ?? []) as string[]),
  ].map((cod) => rotulo(ALERTAS, cod));

  let resumo = "";
  if (item.tipo === "pre") resumo = rotulo(OBJETIVOS, d.objetivo);
  if (item.tipo === "checkin") resumo = `Adesão ${d.adesao}/10`;
  if (item.tipo === "anamnese") resumo = d.bristol ? `Bristol ${d.bristol}` : "";

  // Campos simples (colunas) + respostas detalhadas (anamnese) + condições de saúde (pré-formulário).
  const campos: [string, unknown][] = Object.entries(d).filter(([k, v]) => !OCULTAR.has(k) && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  const respostas: [string, unknown][] = item.tipo === "anamnese" ? Object.entries(d.respostas ?? {}) : [];
  const saude: [string, any][] = item.tipo === "pre" ? Object.entries(d.saude ?? {}) : [];

  return (
    <details className={`rounded-card border bg-superficie ${riscos.length ? "border-perigo/40" : "border-linha"}`}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-4">
        <span className="font-medium text-verde-escuro">{TITULOS[item.tipo]}</span>
        <span className="text-sm text-suave">{data(item.quando, true)}</span>
        {resumo && <span className="text-sm">{resumo}</span>}
        {riscos.map((r) => (
          <span key={r} className="rounded-full bg-perigo-claro px-2 py-0.5 text-xs font-medium text-perigo">{r}</span>
        ))}
      </summary>
      <div className="border-t border-linha p-4 text-sm">
        {aviso && <p className="mb-3 rounded-lg bg-alerta-claro p-3 text-alerta"><strong>Avisos automáticos:</strong> {aviso}</p>}
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {campos.map(([k, v]) => <Dado key={k} rotulo={nomeCampo(k)}>{humanizar(v)}</Dado>)}
          {saude.map(([k, v]) => (
            <Dado key={"s-" + k} rotulo={nomeCampo(k)}>
              {humanizar(v?.resposta)}{v?.qual ? ` (${v.qual})` : ""}
            </Dado>
          ))}
          {respostas.map(([k, v]) => <Dado key={"r-" + k} rotulo={nomeCampo(k)}>{humanizar(v)}</Dado>)}
        </dl>
      </div>
    </details>
  );
}
