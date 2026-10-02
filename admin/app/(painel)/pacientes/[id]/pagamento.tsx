"use client";

import { useActionState } from "react";
import { liberarPagamento, type Resultado } from "./pagamento-actions";

const botao = "rounded-full bg-verde px-4 py-2 text-sm font-medium text-white hover:bg-verde-escuro disabled:opacity-60";
const botaoLeve = "rounded-full border border-linha px-4 py-2 text-sm font-medium hover:bg-tom disabled:opacity-60";

export function FormLiberacao({ profileId, liberado }: { profileId: string; liberado: boolean }) {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(liberarPagamento, {});
  return (
    <form action={acao} className="mt-3 space-y-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="liberar" value={liberado ? "nao" : "sim"} />
      <p className="text-sm">
        {liberado
          ? "Você já liberou o pagamento deste paciente."
          : "Teve alerta no pré-formulário: o pagamento só aparece para ele depois que você liberar."}
      </p>
      <div className="flex items-center gap-3">
        <button className={liberado ? botaoLeve : botao} disabled={salvando}>
          {salvando ? "Salvando..." : liberado ? "Bloquear de novo" : "Liberar pagamento"}
        </button>
        {r.erro && <p role="alert" className="text-sm text-perigo">{r.erro}</p>}
        {r.ok && <p role="status" className="text-sm text-verde">{r.ok}</p>}
      </div>
    </form>
  );
}
