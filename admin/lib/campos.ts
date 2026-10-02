// Converte valores entre o banco, a tela e o formulário, campo por campo.
// Usado tanto para mostrar (lista, detalhe, CSV) quanto para validar no servidor.
import { data, rotulo } from "./rotulos";
import { humanizar } from "./humanizar";
import type { Campo, Tabela } from "./tabelas";

// Texto legível para mostrar na tela ou no CSV.
export function mostrar(c: Campo, v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  switch (c.tipo) {
    case "booleano": return v ? "Sim" : "Não";
    case "data": return data(String(v));
    case "datahora": return data(String(v), true);
    case "opcoes": return c.opcoes ? rotulo(c.opcoes, String(v)) : humanizar(v);
    case "lista": return Array.isArray(v) ? v.map((x) => (c.opcoes ? rotulo(c.opcoes, String(x)) : humanizar(x))).join(", ") : String(v);
    case "json": return JSON.stringify(v);
    case "numero": return Number(v).toLocaleString("pt-BR");
    default: return String(v);
  }
}

// O Brasil não tem mais horário de verão, então São Paulo é sempre -03:00.
export function paraDataHoraLocal(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 16);
}

// Valor inicial do campo no formulário.
export function valorInicial(c: Campo, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (c.tipo === "datahora") return paraDataHoraLocal(v);
  if (c.tipo === "data") return String(v).slice(0, 10);
  if (c.tipo === "json") return JSON.stringify(v, null, 2);
  return String(v);
}

// Lê e valida o formulário no servidor. Devolve os valores prontos para o banco ou os erros por campo.
// Ao criar, campos vazios ficam de fora para o banco usar o valor padrão.
export function lerFormulario(t: Tabela, form: FormData, criando: boolean) {
  const valores: Record<string, unknown> = {};
  const erros: Record<string, string> = {};

  for (const c of t.campos) {
    if (c.somenteLeitura) continue;
    if (c.tipo === "paciente" && !criando) continue; // o paciente de um registro não muda
    const bruto = c.tipo === "lista" ? form.getAll(c.col).map(String) : String(form.get(c.col) ?? "").trim();

    if (c.tipo === "booleano") { valores[c.col] = form.get(c.col) === "on"; continue; }
    if (c.tipo === "lista") {
      const lista = (bruto as string[]).filter((x) => /^[a-z0-9_]{1,40}$/.test(x));
      valores[c.col] = lista;
      continue;
    }
    const s = bruto as string;
    if (!s) {
      if (c.obrigatorio) erros[c.col] = "Preencha este campo.";
      else if (!criando) valores[c.col] = c.tipo === "json" ? (c.col === "responsavel" ? null : {}) : null;
      continue;
    }
    if (c.maxLen && s.length > c.maxLen) { erros[c.col] = `Máximo de ${c.maxLen} caracteres.`; continue; }

    switch (c.tipo) {
      case "paciente":
        if (!/^[0-9a-f-]{36}$/.test(s)) erros[c.col] = "Escolha um paciente.";
        else valores[c.col] = s;
        break;
      case "numero":
      case "inteiro": {
        const n = Number(s.replace(",", "."));
        if (!Number.isFinite(n) || (c.tipo === "inteiro" && !Number.isInteger(n))) erros[c.col] = c.tipo === "inteiro" ? "Use um número inteiro." : "Use um número.";
        else if (c.min !== undefined && n < c.min) erros[c.col] = `O mínimo é ${c.min}.`;
        else if (c.max !== undefined && n > c.max) erros[c.col] = `O máximo é ${c.max}.`;
        else valores[c.col] = n;
        break;
      }
      case "data":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) erros[c.col] = "Data inválida.";
        else valores[c.col] = s;
        break;
      case "datahora": {
        const d = new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s + ":00-03:00" : "x");
        if (Number.isNaN(d.getTime())) erros[c.col] = "Data e hora inválidas.";
        else valores[c.col] = d.toISOString();
        break;
      }
      case "opcoes":
        if (c.opcoes && !(s in c.opcoes)) erros[c.col] = "Escolha uma das opções.";
        else valores[c.col] = c.col === "bristol" ? Number(s) : s;
        break;
      case "json":
        try {
          const j = JSON.parse(s);
          if (typeof j !== "object" || j === null || Array.isArray(j)) erros[c.col] = "Use o formato { \"campo\": \"valor\" }.";
          else valores[c.col] = j;
        } catch {
          erros[c.col] = "Formato inválido. Confira aspas, vírgulas e chaves.";
        }
        break;
      default:
        valores[c.col] = s;
    }
  }
  return { valores, erros };
}
