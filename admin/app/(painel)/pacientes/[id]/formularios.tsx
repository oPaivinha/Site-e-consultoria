"use client";

import { useActionState } from "react";
import { salvarAcompanhamento, salvarObservacao, type Resultado } from "./actions";

const campo = "w-full rounded-lg border border-linha bg-white px-3 py-2 text-sm outline-none focus:border-verde focus:ring-2 focus:ring-verde-claro";
const botao = "rounded-full bg-verde px-4 py-2 text-sm font-medium text-white hover:bg-verde-escuro disabled:opacity-60";

function Aviso({ r }: { r: Resultado }) {
  if (r.erro) return <p role="alert" className="text-sm text-perigo">{r.erro}</p>;
  if (r.ok) return <p role="status" className="text-sm text-verde">{r.ok}</p>;
  return null;
}

export function FormObservacao({ profileId, texto }: { profileId: string; texto: string }) {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(salvarObservacao, {});
  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <textarea name="texto" defaultValue={texto} rows={4} maxLength={5000} className={campo} placeholder="Anotações que só você vê." />
      <div className="flex items-center gap-3">
        <button className={botao} disabled={salvando}>{salvando ? "Salvando..." : "Salvar observação"}</button>
        <Aviso r={r} />
      </div>
    </form>
  );
}

export function FormAcompanhamento({ profileId, inicio, pausado }: { profileId: string; inicio: string; pausado: boolean }) {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(salvarAcompanhamento, {});
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="profile_id" value={profileId} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-suave">Início do acompanhamento</span>
        <input type="date" name="inicio" defaultValue={inicio} className={campo} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="pausado" defaultChecked={pausado} className="h-4 w-4 accent-verde" />
        Pausado (não recebe check-ins)
      </label>
      <div className="flex items-center gap-3">
        <button className={botao} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
        <Aviso r={r} />
      </div>
    </form>
  );
}
