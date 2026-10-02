"use client";

import { Erro } from "@/components/estados";

export default function ErroPainel({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3">
      <Erro>Algo deu errado ao carregar esta página.</Erro>
      <button onClick={reset} className="text-sm text-verde underline">Tentar de novo</button>
    </div>
  );
}
