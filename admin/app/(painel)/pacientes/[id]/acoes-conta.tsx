"use client";

import { useState, useTransition } from "react";
import { definirAdmin, desativar, enviarNovaSenha, excluirDeVez, reativar, reenviarConfirmacao, type Resultado } from "./conta-actions";

type Props = { id: string; nome: string; confirmado: boolean; desativado: boolean; admin: boolean; souEu: boolean };

const botao = "rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50";
const normal = `${botao} border-verde text-verde hover:bg-tom`;
const perigo = `${botao} border-perigo text-perigo hover:bg-perigo-claro`;

export function AcoesConta({ id, nome, confirmado, desativado, admin, souEu }: Props) {
  const [res, setRes] = useState<Resultado>({});
  const [ocupado, iniciar] = useTransition();
  const [excluindo, setExcluindo] = useState(false);
  const [texto, setTexto] = useState("");

  const rodar = (fn: () => Promise<Resultado>, pergunta?: string) => {
    if (pergunta && !window.confirm(pergunta)) return;
    iniciar(async () => setRes(await fn()));
  };

  return (
    <section className="mt-4 rounded-card border border-linha bg-superficie p-4">
      <h2 className="mb-3 text-xl">Ações da conta</h2>
      <div className="flex flex-wrap gap-2">
        {!confirmado && (
          <button className={normal} disabled={ocupado} onClick={() => rodar(() => reenviarConfirmacao(id))}>Reenviar e-mail de confirmação</button>
        )}
        <button className={normal} disabled={ocupado} onClick={() => rodar(() => enviarNovaSenha(id), `Enviar para ${nome} um link para criar uma senha nova?`)}>
          Enviar link de nova senha
        </button>
        {!souEu && (
          admin ? (
            <button className={normal} disabled={ocupado} onClick={() => rodar(() => definirAdmin(id, false), `Remover o acesso de admin de ${nome}?`)}>Remover admin</button>
          ) : (
            <button className={normal} disabled={ocupado} onClick={() => rodar(() => definirAdmin(id, true), `Dar a ${nome} acesso total a este painel e a todos os dados?`)}>Tornar admin</button>
          )
        )}
        {!souEu && (
          desativado ? (
            <button className={normal} disabled={ocupado} onClick={() => rodar(() => reativar(id))}>Reativar conta</button>
          ) : (
            <button className={perigo} disabled={ocupado} onClick={() => rodar(() => desativar(id), `Desativar a conta de ${nome}? Ela não conseguirá mais entrar no site (dá para reativar depois).`)}>
              Desativar conta
            </button>
          )
        )}
        {!souEu && !excluindo && (
          <button className={perigo} disabled={ocupado} onClick={() => setExcluindo(true)}>Excluir de vez</button>
        )}
      </div>

      {excluindo && (
        <div className="mt-4 rounded-lg border border-perigo/40 bg-perigo-claro p-4 text-sm">
          <p className="mb-2 text-perigo">
            <strong>Isto apaga a conta de {nome} e TODOS os dados dela</strong> (pré-formulários, anamneses, check-ins e notas). Não tem como desfazer.
            Use só para pedidos de exclusão (LGPD). Para só bloquear o acesso, use &quot;Desativar conta&quot;.
          </p>
          <label className="block">
            <span className="mb-1 block">Digite <strong>EXCLUIR</strong> para confirmar:</span>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} className="w-full max-w-xs rounded-lg border border-perigo/40 bg-white px-3 py-2" />
          </label>
          <div className="mt-3 flex gap-2">
            <button className={perigo} disabled={ocupado || texto.trim().toUpperCase() !== "EXCLUIR"} onClick={() => rodar(() => excluirDeVez(id, texto))}>
              Excluir definitivamente
            </button>
            <button className="px-3 text-sm text-suave underline" onClick={() => { setExcluindo(false); setTexto(""); }}>Cancelar</button>
          </div>
        </div>
      )}

      {ocupado && <p className="mt-3 text-sm text-suave" role="status">Processando...</p>}
      {!ocupado && res.ok && <p className="mt-3 text-sm text-verde" role="status">{res.ok}</p>}
      {!ocupado && res.erro && <p className="mt-3 text-sm text-perigo" role="alert">{res.erro}</p>}
    </section>
  );
}
