"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Visão geral" },
  { href: "/pacientes", rotulo: "Pacientes" },
  { href: "/acompanhamentos", rotulo: "Acompanhamentos" },
  { href: "/pre-formularios", rotulo: "Pré-formulários" },
  { href: "/anamneses", rotulo: "Anamneses" },
  { href: "/checkins", rotulo: "Check-ins" },
  { href: "/observacoes", rotulo: "Observações" },
  { href: "/pagamentos", rotulo: "Pagamentos" },
  { href: "/auditoria", rotulo: "Auditoria" },
];

export function Menu() {
  const atual = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {ITENS.map((i) => {
        const ativo = i.href === "/" ? atual === "/" : atual.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              ativo ? "bg-verde text-white" : "text-tinta hover:bg-tom"
            }`}
          >
            {i.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
