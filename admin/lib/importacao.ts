// Lê e confere uma planilha CSV de pacientes, linha por linha, antes de gravar qualquer coisa.
// Aceita separador ";" (Excel em português) ou ",", e datas em dd/mm/aaaa ou aaaa-mm-dd.

export const COLUNAS_IMPORTACAO = [
  "nome", "email", "whatsapp", "nascimento", "sexo", "aceita_checkin", "menor",
  "email_paciente", "responsavel_nome", "responsavel_parentesco", "responsavel_whatsapp", "responsavel_email",
] as const;
type Coluna = (typeof COLUNAS_IMPORTACAO)[number];
export type DadosPaciente = Partial<Record<Coluna, string | boolean>>;

export type LinhaImportacao = {
  n: number; // número da linha na planilha (o cabeçalho é a linha 1)
  email: string; // como veio na planilha (para mostrar mesmo quando tem erro)
  dados: DadosPaciente;
  erros: string[];
};

export const MAX_LINHAS = 500;

// Apelidos aceitos no cabeçalho (inclusive os nomes da exportação do painel).
const APELIDOS: Record<string, Coluna> = {
  e_mail: "email", celular: "whatsapp", telefone: "whatsapp", data_de_nascimento: "nascimento",
  aceita_check_in: "aceita_checkin", checkin: "aceita_checkin", menor_de_idade: "menor",
  e_mail_do_paciente: "email_paciente", responsavel: "responsavel_nome",
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// Divide o texto CSV em linhas e células, respeitando aspas ("a;b" é uma célula só).
export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let linha: string[] = [], celula = "", aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { celula += '"'; i++; }
      else if (c === '"') aspas = false;
      else celula += c;
    } else if (c === '"' && celula === "") aspas = true;
    else if (c === sep) { linha.push(celula); celula = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(celula); linhas.push(linha); linha = []; celula = "";
    } else celula += c;
  }
  if (celula !== "" || linha.length) { linha.push(celula); linhas.push(linha); }
  return linhas;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function simNao(v: string): boolean | null {
  const s = normalizar(v);
  if (["sim", "s", "true", "1", "x", "yes"].includes(s)) return true;
  if (["nao", "n", "false", "0", "no", ""].includes(s)) return false;
  return null;
}
function lerData(v: string): string | null {
  let m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : v;
  m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(iso + "T12:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

export function conferirPlanilha(texto: string) {
  const tabela = lerCsv(texto);
  const vazia = (l: string[]) => l.every((c) => c.trim() === "");
  if (tabela.length === 0 || vazia(tabela[0])) return { erroGeral: "A planilha está vazia.", linhas: [] as LinhaImportacao[], ignoradas: [] as string[] };
  const cabecalho = tabela[0].map((c) => {
    const n = normalizar(c);
    return (COLUNAS_IMPORTACAO as readonly string[]).includes(n) ? (n as Coluna) : APELIDOS[n] ?? null;
  });
  const ignoradas = tabela[0].filter((_, i) => !cabecalho[i]).map((c) => c.trim()).filter(Boolean);
  if (!cabecalho.includes("nome") || !cabecalho.includes("email")) {
    return { erroGeral: 'A primeira linha precisa ter as colunas "nome" e "email".', linhas: [], ignoradas };
  }
  const dadosBrutos = tabela.slice(1).map((celulas, i) => ({ celulas, n: i + 2 })).filter((l) => !vazia(l.celulas));
  if (dadosBrutos.length === 0) return { erroGeral: "A planilha só tem o cabeçalho.", linhas: [], ignoradas };
  if (dadosBrutos.length > MAX_LINHAS) {
    return { erroGeral: `Máximo de ${MAX_LINHAS} pacientes por vez. Divida a planilha em partes.`, linhas: [], ignoradas };
  }

  const vistos = new Map<string, number>();
  const linhas = dadosBrutos.map(({ celulas, n }): LinhaImportacao => {
    const bruto: Partial<Record<Coluna, string>> = {};
    cabecalho.forEach((col, j) => { if (col) bruto[col] = (celulas[j] ?? "").trim(); });
    const dados: DadosPaciente = {};
    const erros: string[] = [];

    const nome = bruto.nome ?? "";
    if (!nome) erros.push("Falta o nome.");
    else if (nome.length > 200) erros.push("Nome muito longo.");
    else dados.nome = nome;

    const email = (bruto.email ?? "").toLowerCase();
    if (!email) erros.push("Falta o e-mail.");
    else if (!EMAIL.test(email) || email.length > 200) erros.push(`E-mail inválido: ${email}`);
    else if (vistos.has(email)) erros.push(`E-mail repetido (já está na linha ${vistos.get(email)}).`);
    else { dados.email = email; vistos.set(email, n); }

    for (const col of ["whatsapp", "responsavel_whatsapp"] as const) {
      const v = bruto[col];
      if (!v) continue;
      const dig = v.replace(/\D/g, "");
      const comPais = dig.length === 10 || dig.length === 11 ? "55" + dig : dig;
      if (comPais.length < 12 || comPais.length > 13) erros.push(`WhatsApp inválido: ${v} (use DDD + número).`);
      else dados[col] = comPais;
    }
    if (bruto.nascimento) {
      const d = lerData(bruto.nascimento);
      if (!d || d > new Date().toISOString().slice(0, 10) || d < "1900-01-01") erros.push(`Data de nascimento inválida: ${bruto.nascimento}`);
      else dados.nascimento = d;
    }
    if (bruto.sexo) {
      const s = normalizar(bruto.sexo);
      const v = ["f", "feminino", "mulher"].includes(s) ? "feminino" : ["m", "masculino", "homem"].includes(s) ? "masculino" : null;
      if (!v) erros.push(`Sexo deve ser feminino ou masculino: ${bruto.sexo}`);
      else dados.sexo = v;
    }
    for (const col of ["aceita_checkin", "menor"] as const) {
      if (bruto[col] === undefined || bruto[col] === "") continue;
      const v = simNao(bruto[col]!);
      if (v === null) erros.push(`Use sim ou não em ${col}: ${bruto[col]}`);
      else dados[col] = v;
    }
    for (const col of ["email_paciente", "responsavel_email"] as const) {
      const v = (bruto[col] ?? "").toLowerCase();
      if (!v) continue;
      if (!EMAIL.test(v)) erros.push(`E-mail inválido em ${col}: ${v}`);
      else dados[col] = v;
    }
    if (bruto.responsavel_nome) dados.responsavel_nome = bruto.responsavel_nome.slice(0, 200);
    if (bruto.responsavel_parentesco) dados.responsavel_parentesco = bruto.responsavel_parentesco.slice(0, 60);
    if (dados.menor === true && !dados.responsavel_nome) erros.push("Menor de idade precisa do nome do responsável.");

    return { n, email, dados, erros };
  });
  return { erroGeral: null, linhas, ignoradas };
}
