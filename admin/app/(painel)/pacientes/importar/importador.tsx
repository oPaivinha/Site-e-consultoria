"use client";

import { useState, useTransition } from "react";
import { importar, previsualizar, type Previa, type Resultado } from "./actions";
import { botao, botaoContorno } from "@/components/estilos";

// Lê o arquivo no navegador. Planilhas salvas pelo Excel às vezes não vêm em UTF-8; nesse caso tenta o padrão do Windows.
async function lerArquivo(f: File) {
  const bytes = await f.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

const ACAO = { criar: "Conta nova", atualizar: "Atualizar dados", erro: "Com erro" };
const COR = { criar: "text-verde-escuro", atualizar: "text-tinta", erro: "text-perigo", criado: "text-verde-escuro", atualizado: "text-tinta" };

export function Importador() {
  const [texto, setTexto] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [convidar, setConvidar] = useState(false);
  const [pendente, iniciar] = useTransition();

  const validas = previa?.linhas?.filter((l) => l.acao !== "erro") ?? [];
  const comErro = (previa?.linhas?.length ?? 0) - validas.length;

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPrevia(null); setResultado(null);
    if (!f) return;
    if (f.size > 1_000_000) { setPrevia({ erroGeral: "Arquivo grande demais (máximo 1 MB)." }); return; }
    const t = await lerArquivo(f);
    setTexto(t); setNomeArquivo(f.name);
    iniciar(async () => setPrevia(await previsualizar(t)));
  }

  function confirmar() {
    const novas = validas.filter((l) => l.acao === "criar").length;
    const msg = `Importar ${validas.length} ${validas.length === 1 ? "paciente" : "pacientes"}?` +
      (novas ? ` ${novas} ${novas === 1 ? "conta nova será criada" : "contas novas serão criadas"}${convidar ? " e receberão convite por e-mail" : ""}.` : "");
    if (!window.confirm(msg)) return;
    iniciar(async () => setResultado(await importar(texto, convidar)));
  }

  if (resultado) {
    const ok = resultado.linhas?.filter((l) => l.status !== "erro").length ?? 0;
    return (
      <section className="rounded-card border border-linha bg-superficie p-5">
        <h2 className="mb-2 text-xl">Resultado</h2>
        {resultado.erroGeral ? <p role="alert" className="text-perigo">{resultado.erroGeral}</p> : (
          <>
            <p className="mb-3 text-sm">{ok} de {resultado.linhas?.length} linhas importadas.</p>
            <Tabela linhas={resultado.linhas!.map((l) => ({ n: l.n, a: l.email, b: l.status === "criado" ? "Criado" : l.status === "atualizado" ? "Atualizado" : "Erro", c: l.mensagem, cor: COR[l.status] }))} colunas={["E-mail", "Situação", "Detalhe"]} />
          </>
        )}
        <button className={`${botaoContorno} mt-4`} onClick={() => { setResultado(null); setPrevia(null); setTexto(""); setNomeArquivo(""); }}>Importar outra planilha</button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-linha bg-superficie p-5">
        <label className="block">
          <span className="mb-2 block font-medium">1. Escolha a planilha (.csv)</span>
          <input type="file" accept=".csv,text/csv" onChange={escolher} className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-verde file:px-4 file:py-2 file:text-white" />
        </label>
        {nomeArquivo && <p className="mt-2 text-xs text-suave">{nomeArquivo}</p>}
        {pendente && !previa && <p className="mt-3 text-sm text-suave" role="status">Conferindo a planilha...</p>}
      </section>

      {previa && (
        <section className="rounded-card border border-linha bg-superficie p-5">
          <h2 className="mb-2 text-xl">2. Confira antes de importar</h2>
          {previa.erroGeral ? <p role="alert" className="text-perigo">{previa.erroGeral}</p> : (
            <>
              <p className="mb-1 text-sm">
                {validas.filter((l) => l.acao === "criar").length} contas novas, {validas.filter((l) => l.acao === "atualizar").length} para atualizar
                {comErro > 0 && <span className="text-perigo">, {comErro} com erro (serão puladas)</span>}.
              </p>
              {previa.ignoradas && previa.ignoradas.length > 0 && (
                <p className="mb-3 text-xs text-suave">Colunas ignoradas: {previa.ignoradas.join(", ")}.</p>
              )}
              <Tabela
                linhas={previa.linhas!.map((l) => ({ n: l.n, a: l.nome || "—", b: l.email || "—", c: l.erros.length ? l.erros.join(" ") : ACAO[l.acao], cor: COR[l.acao] }))}
                colunas={["Nome", "E-mail", "O que vai acontecer"]}
              />
              <label className="mt-4 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={convidar} onChange={(e) => setConvidar(e.target.checked)} className="mt-0.5 h-4 w-4 accent-verde" />
                <span>
                  Enviar convite por e-mail para as contas novas.
                  <span className="block text-xs text-suave">
                    Sem convite, a conta é criada sem senha e o paciente entra pelo &quot;Esqueci minha senha&quot; do site (ou você manda o link pela ficha).
                    O e-mail gratuito do Supabase envia poucos e-mails por hora: para muitos convites, configure o SMTP próprio antes.
                  </span>
                </span>
              </label>
              <button className={`${botao} mt-4`} disabled={pendente || validas.length === 0} onClick={confirmar}>
                {pendente ? "Importando..." : `Importar ${validas.length} ${validas.length === 1 ? "linha" : "linhas"}`}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Tabela({ linhas, colunas }: { linhas: { n: number; a: string; b: string; c: string; cor: string }[]; colunas: string[] }) {
  return (
    <div className="relative max-h-[28rem] overflow-auto rounded-lg border border-linha">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="sticky top-0 bg-tom text-xs uppercase tracking-wide text-suave">
          <tr><th className="px-3 py-2">Linha</th>{colunas.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.n} className="border-t border-linha align-top">
              <td className="px-3 py-2 text-suave">{l.n}</td>
              <td className="px-3 py-2">{l.a}</td>
              <td className="px-3 py-2">{l.b}</td>
              <td className={`px-3 py-2 ${l.cor}`}>{l.c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
