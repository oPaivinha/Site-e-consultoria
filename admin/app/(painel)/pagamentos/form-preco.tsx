"use client";

import { useActionState } from "react";
import { salvarPreco, type Resultado } from "./actions";

const campo = "w-full rounded-lg border border-linha bg-white px-3 py-2 text-sm outline-none focus:border-verde focus:ring-2 focus:ring-verde-claro";
const botao = "rounded-full bg-verde px-4 py-2 text-sm font-medium text-white hover:bg-verde-escuro disabled:opacity-60";

type Preco = { plano: string; nome: string; valor: number; parcelas_max: number; ativo: boolean };

export function FormPreco({ p }: { p: Preco }) {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(salvarPreco, {});
  return (
    <form action={acao} className="rounded-card border border-linha bg-superficie p-4">
      <input type="hidden" name="plano" value={p.plano} />
      <h3 className="mb-3 font-sans text-base font-bold">{p.nome}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-suave">Valor total (R$)</span>
          <input name="valor" inputMode="decimal" defaultValue={Number(p.valor).toFixed(2).replace(".", ",")} className={campo} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-suave">Parcelas no cartão (até)</span>
          <input name="parcelas" type="number" min={1} max={12} defaultValue={p.parcelas_max} className={campo} />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={p.ativo} className="h-4 w-4 accent-verde" />
        Disponível para pagamento no site
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button className={botao} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
        {r.erro && <p role="alert" className="text-sm text-perigo">{r.erro}</p>}
        {r.ok && <p role="status" className="text-sm text-verde">{r.ok}</p>}
      </div>
    </form>
  );
}
