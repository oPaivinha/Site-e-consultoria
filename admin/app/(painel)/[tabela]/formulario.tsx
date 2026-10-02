"use client";

import { useActionState } from "react";
import { salvarRegistro, type ResultadoForm } from "./actions";
import { botao, campo as estiloCampo } from "@/components/estilos";
import type { Campo } from "@/lib/tabelas";

type Paciente = { id: string; nome: string | null; email: string | null };

// Formulário de criar/editar gerado a partir da descrição da tabela (lib/tabelas.ts).
// A validação do navegador (obrigatório, mínimo, máximo) ajuda; a do servidor é a que vale.
export function FormRegistro({
  slug, id, campos, valores, listas, pacientes,
}: {
  slug: string;
  id: string | null;
  campos: Campo[];
  valores: Record<string, string>;
  listas: Record<string, string[]>;
  pacientes?: Paciente[];
}) {
  const [r, acao, salvando] = useActionState<ResultadoForm, FormData>(salvarRegistro.bind(null, slug, id), {});
  const editaveis = campos.filter((c) => !c.somenteLeitura && !(c.tipo === "paciente" && id !== null));

  return (
    <form action={acao} className="space-y-4" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        {editaveis.map((c) => {
          const erro = r.erros?.[c.col];
          const largo = c.tipo === "json" || c.tipo === "textolongo" || c.tipo === "lista";
          return (
            <div key={c.col} className={largo ? "sm:col-span-2" : ""}>
              <Entrada c={c} valor={valores[c.col] ?? ""} lista={listas[c.col] ?? []} pacientes={pacientes} invalido={Boolean(erro)} />
              {c.ajuda && <p className="mt-1 text-xs text-suave">{c.ajuda}</p>}
              {erro && <p className="mt-1 text-xs text-perigo" role="alert">{erro}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className={botao} disabled={salvando}>{salvando ? "Salvando..." : id === null ? "Criar" : "Salvar alterações"}</button>
        {r.erro && <p role="alert" className="text-sm text-perigo">{r.erro}</p>}
        {r.ok && <p role="status" className="text-sm text-verde">{r.ok}</p>}
      </div>
    </form>
  );
}

function Entrada({ c, valor, lista, pacientes, invalido }: { c: Campo; valor: string; lista: string[]; pacientes?: Paciente[]; invalido: boolean }) {
  const cls = `${estiloCampo} ${invalido ? "border-perigo" : ""}`;
  const rotulo = <span className="mb-1 block text-xs font-medium text-suave">{c.rotulo}{c.obrigatorio && " *"}</span>;

  if (c.tipo === "booleano") {
    return (
      <label className="flex items-center gap-2 pt-5 text-sm">
        <input type="checkbox" name={c.col} defaultChecked={valor === "true"} className="h-4 w-4 accent-verde" />
        {c.rotulo}
      </label>
    );
  }
  if (c.tipo === "lista") {
    // Mostra as opções conhecidas e também qualquer valor antigo que não esteja na lista.
    const opcoes = { ...c.opcoes, ...Object.fromEntries(lista.filter((v) => !c.opcoes?.[v]).map((v) => [v, v])) };
    return (
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-suave">{c.rotulo}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(opcoes).map(([v, t]) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={c.col} value={v} defaultChecked={lista.includes(v)} className="h-4 w-4 accent-verde" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (c.tipo === "paciente") {
    return (
      <label className="block">
        {rotulo}
        <select name={c.col} defaultValue={valor} required className={cls}>
          <option value="">Escolha o paciente</option>
          {pacientes?.map((p) => <option key={p.id} value={p.id}>{p.nome || "(sem nome)"} — {p.email}</option>)}
        </select>
      </label>
    );
  }
  if (c.tipo === "opcoes") {
    return (
      <label className="block">
        {rotulo}
        <select name={c.col} defaultValue={valor} required={c.obrigatorio} className={cls}>
          <option value="">—</option>
          {Object.entries(c.opcoes ?? {}).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          {valor && !c.opcoes?.[valor] && <option value={valor}>{valor}</option>}
        </select>
      </label>
    );
  }
  if (c.tipo === "textolongo" || c.tipo === "json") {
    return (
      <label className="block">
        {rotulo}
        <textarea
          name={c.col} defaultValue={valor} required={c.obrigatorio} maxLength={c.maxLen}
          rows={c.tipo === "json" ? 8 : 4} spellCheck={c.tipo !== "json"}
          className={`${cls} ${c.tipo === "json" ? "font-mono text-xs" : ""}`}
        />
      </label>
    );
  }
  const tipo = { numero: "number", inteiro: "number", data: "date", datahora: "datetime-local", texto: "text" }[c.tipo] ?? "text";
  return (
    <label className="block">
      {rotulo}
      <input
        type={tipo} name={c.col} defaultValue={valor} required={c.obrigatorio} maxLength={c.maxLen}
        min={c.min} max={c.max} step={c.tipo === "numero" ? "0.1" : c.tipo === "inteiro" ? "1" : undefined}
        className={cls}
      />
    </label>
  );
}
