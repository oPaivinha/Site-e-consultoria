#!/usr/bin/env node
// Importa a planilha antiga (Paiva Nutri - dados.xlsx) para o Supabase.
//
// Uso (no seu computador, na pasta do projeto):
//   cd scripts && npm install
//   node importar_excel.mjs "../Paiva Nutri - dados.xlsx"            -> só mostra o que faria (nada é gravado)
//   node importar_excel.mjs "../Paiva Nutri - dados.xlsx" --aplicar  -> grava de verdade
//
// Precisa de um arquivo .env.local na raiz do projeto (fora do Git) com:
//   SUPABASE_URL=https://SEU-PROJETO.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...   (a chave secreta; nunca vai para o site nem para o GitHub)
//   SITE_URL=https://site-five-chi-48.vercel.app/
//
// Seguro para rodar mais de uma vez:
//   - pacientes são conciliados pelo e-mail (para menores, o e-mail do responsável, que é o da conta);
//   - quem ainda não tem conta recebe um convite por e-mail para criar a senha;
//   - quem já tem conta não é sobrescrito: só campos vazios do perfil são completados;
//   - cada linha de pré-formulário, anamnese e check-in leva uma chave (importado_de) e não entra duas vezes.
// A planilha original não é alterada.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const aqui = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arquivo = args.find((a) => !a.startsWith("--"));
const APLICAR = args.includes("--aplicar");

if (!arquivo) {
  console.error('Uso: node importar_excel.mjs "caminho/para/Paiva Nutri - dados.xlsx" [--aplicar]');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Configuração (.env.local)
// ---------------------------------------------------------------------------
function lerEnv() {
  const env = { ...process.env };
  for (const caminho of [resolve(aqui, "../.env.local"), resolve(process.cwd(), ".env.local")]) {
    if (!existsSync(caminho)) continue;
    for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    break;
  }
  return env;
}
const env = lerEnv();
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SITE_URL"]) {
  if (!env[k]) { console.error(`Falta ${k} no .env.local (veja .env.example).`); process.exit(1); }
}
const SITE_URL = env.SITE_URL.replace(/\/?$/, "/");
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ---------------------------------------------------------------------------
// Leitura da planilha
// ---------------------------------------------------------------------------
function valorCelula(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return valorCelula(v.result);          // fórmula
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);                    // link
    return "";
  }
  return v;
}

async function lerPlanilha(caminho) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(caminho);
  const abas = {};
  wb.eachSheet((ws) => {
    const linhas = [];
    let cab = null;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => { vals[col - 1] = valorCelula(cell.value); });
      if (!cab) { cab = vals.map((c) => String(c ?? "").trim()); return; }
      const o = {};
      cab.forEach((c, i) => { if (c) o[c] = vals[i] ?? ""; });
      if (Object.values(o).some((x) => x !== "")) linhas.push(o);
    });
    abas[ws.name.trim().toLowerCase()] = linhas;
  });
  return abas;
}

// ---------------------------------------------------------------------------
// Conversões
// ---------------------------------------------------------------------------
const txt = (v) => (v instanceof Date ? v.toISOString() : String(v ?? "").trim());
const vazio = (v) => v === null || v === undefined || v === "";
const simNao = (v) => v === true || /^(sim|s|true|1|verdadeiro)$/i.test(txt(v));
const digitos = (v) => txt(v).replace(/\D/g, "");
const email = (v) => { const e = txt(v).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ""; };
const lista = (v) => (Array.isArray(v) ? v : txt(v) ? txt(v).split(/\s*,\s*/).filter(Boolean) : []);
const num = (v) => { const n = typeof v === "number" ? v : parseFloat(txt(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = num(v); return n === null ? null : Math.round(n); };
function dia(v) {
  if (vazio(v)) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = txt(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
function instante(v) {
  if (vazio(v)) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(txt(v));
  if (!isNaN(d)) return d.toISOString();
  const so = dia(v);
  return so ? `${so}T12:00:00Z` : null;
}
// "saude.diabetes.resposta" -> { saude: { diabetes: { resposta } } }
function desachatar(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    const partes = k.split(".");
    let alvo = out;
    partes.slice(0, -1).forEach((p) => { alvo = alvo[p] = typeof alvo[p] === "object" && alvo[p] ? alvo[p] : {}; });
    alvo[partes.at(-1)] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}
const sexo = (v) => (["feminino", "masculino"].includes(txt(v).toLowerCase()) ? txt(v).toLowerCase() : null);

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
async function usuariosPorEmail() {
  const mapa = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => u.email && mapa.set(u.email.toLowerCase(), u.id));
    if (data.users.length < 1000) break;
  }
  return mapa;
}

async function completarVazios(tabela, chave, id, dados) {
  const { data: atual, error } = await sb.from(tabela).select("*").eq(chave, id).maybeSingle();
  if (error) throw error;
  if (!atual) return [];
  const mud = {};
  for (const [k, v] of Object.entries(dados)) {
    if (v === null || v === undefined || v === "") continue;
    const a = atual[k];
    if (a === null || a === "" || (k === "lembretes_enviados" && a === 0) || (k === "ativo" && a === false)) mud[k] = v;
  }
  if (!Object.keys(mud).length) return [];
  // inicio_acompanhamento dispara o cálculo do próximo check-in no banco; grava as datas da planilha depois
  const { inicio_acompanhamento, ...resto } = mud;
  if (APLICAR) {
    if (inicio_acompanhamento) {
      const r = await sb.from(tabela).update({ inicio_acompanhamento }).eq(chave, id);
      if (r.error) throw r.error;
    }
    if (Object.keys(resto).length) {
      const r = await sb.from(tabela).update(resto).eq(chave, id);
      if (r.error) throw r.error;
    }
  }
  return Object.keys(mud);
}

async function inserirSemDuplicar(tabela, linhas) {
  if (!linhas.length) return { novas: 0, existentes: 0 };
  const chaves = linhas.map((l) => l.importado_de);
  const { data, error } = await sb.from(tabela).select("importado_de").in("importado_de", chaves);
  if (error) throw error;
  const ja = new Set(data.map((d) => d.importado_de));
  const novas = linhas.filter((l) => !ja.has(l.importado_de));
  if (APLICAR && novas.length) {
    const r = await sb.from(tabela).upsert(novas, { onConflict: "importado_de", ignoreDuplicates: true });
    if (r.error) throw r.error;
  }
  return { novas: novas.length, existentes: linhas.length - novas.length };
}

// ---------------------------------------------------------------------------
// Importação
// ---------------------------------------------------------------------------
const abas = await lerPlanilha(resolve(process.cwd(), arquivo));
const pacientes = abas["pacientes"] || [];
const pre = abas["pre_formularios"] || [];
const anamneses = abas["anamneses"] || [];
const checkins = abas["checkins"] || [];
console.log(`Planilha: ${pacientes.length} pacientes, ${pre.length} pré-formulários, ${anamneses.length} anamneses, ${checkins.length} check-ins.`);
console.log(APLICAR ? "Modo: GRAVANDO no Supabase.\n" : "Modo: simulação (nada é gravado). Use --aplicar para gravar.\n");

const usuarios = await usuariosPorEmail();
const perfilPorCodigo = new Map();     // codigo da planilha -> profile id
const perfilPorEmail = new Map();
const perfilPorWhats = new Map();
const resumo = { convidados: 0, existentes: 0, ignorados: 0, completados: 0, falhas: 0 };
const vistos = new Set();

for (const p of pacientes) {
  const menor = simNao(p.menor);
  const contaEmail = menor ? email(p.responsavel_email) || email(p.email) : email(p.email);
  const nome = txt(p.nome);
  if (!contaEmail) { console.log(`- IGNORADO ${nome || "(sem nome)"}: sem e-mail válido${menor ? " do responsável" : ""}.`); resumo.ignorados++; continue; }
  if (vistos.has(contaEmail)) { console.log(`- IGNORADO ${nome}: e-mail ${contaEmail} repetido na planilha (vale a primeira linha).`); resumo.ignorados++; continue; }
  vistos.add(contaEmail);

  const perfil = {
    nome,
    whatsapp: digitos(p.whatsapp) || null,
    email_paciente: menor ? email(p.email) || null : null,
    canal: txt(p.canal).toLowerCase() === "email" ? "email" : "whatsapp",
    aceita_checkin: simNao(p.aceita_checkin),
    menor,
    responsavel_nome: txt(p.responsavel_nome) || null,
    responsavel_whatsapp: digitos(p.responsavel_whatsapp) || null,
    responsavel_email: email(p.responsavel_email) || null
  };
  const acomp = {
    inicio_acompanhamento: dia(p.inicio_acompanhamento),
    ativo: simNao(p.ativo) || null,
    pausado: simNao(p.pausado) || null,
    proximo_checkin: dia(p.proximo_checkin),
    ultimo_envio: dia(p.ultimo_envio),
    ultima_resposta: instante(p.ultima_resposta),
    lembretes_enviados: int(p.lembretes_enviados) || null
  };

  try {
    let id = usuarios.get(contaEmail);
    if (!id) {
      if (APLICAR) {
        const { data, error } = await sb.auth.admin.inviteUserByEmail(contaEmail, {
          data: perfil,      // o trigger handle_new_user cria o perfil com estes dados
          redirectTo: SITE_URL + "auth/callback.html"
        });
        if (error) throw error;
        id = data.user.id;
        usuarios.set(contaEmail, id);
      }
      console.log(`- CONVITE ${APLICAR ? "enviado" : "seria enviado"} para ${contaEmail} (${nome}).`);
      resumo.convidados++;
    } else {
      console.log(`- JÁ TEM CONTA: ${contaEmail} (${nome}).`);
      resumo.existentes++;
    }
    if (id) {
      const { aceita_checkin, menor: _m, ...camposPerfil } = perfil;
      const c1 = await completarVazios("profiles", "id", id, camposPerfil);
      const c2 = await completarVazios("acompanhamentos", "profile_id", id, acomp);
      if (c1.length + c2.length) { resumo.completados++; console.log(`    campos ${APLICAR ? "completados" : "a completar"}: ${[...c1, ...c2].join(", ")}`); }
    }
    const ref = id || `(novo:${contaEmail})`;
    if (txt(p.codigo)) perfilPorCodigo.set(txt(p.codigo), ref);
    perfilPorEmail.set(contaEmail, ref);
    if (email(p.email)) perfilPorEmail.set(email(p.email), ref);
    if (perfil.whatsapp) perfilPorWhats.set(perfil.whatsapp, ref);
  } catch (e) {
    resumo.falhas++;
    console.log(`- FALHOU ${contaEmail}: ${e.message || e}. Rode de novo mais tarde (não duplica).`);
  }
}

function acharPerfil(l) {
  return perfilPorCodigo.get(txt(l.codigo)) || perfilPorEmail.get(email(l.email)) ||
    perfilPorEmail.get(email(l["responsavel.email"])) || perfilPorWhats.get(digitos(l.whatsapp)) || null;
}
const real = (id) => id && !id.startsWith("(novo:");
const semDono = { pre_formularios: 0, anamneses: 0, checkins: 0 };

// pré-formulários
const linhasPre = [];
for (const l of pre) {
  const id = acharPerfil(l);
  if (!id) { semDono.pre_formularios++; continue; }
  const o = desachatar(l);
  const quando = instante(l.recebido_em) || instante(l.enviado_em) || "sem-data";
  linhasPre.push({
    profile_id: id,
    importado_de: `planilha:pre_formularios:${txt(l.codigo) || email(l.email)}:${quando}`,
    enviado_em: instante(l.enviado_em) || instante(l.recebido_em),
    objetivo: txt(l.objetivo) || null,
    peso_kg: num(l.peso_kg),
    altura_cm: int(l.altura_cm),
    treino_freq: txt(l.treino_freq) || null,
    modalidade: txt(l.modalidade) || null,
    tentativas: txt(l.tentativas) || null,
    origem: txt(l.origem) || null,
    saude: o.saude && typeof o.saude === "object" ? o.saude : {},
    scoff_sim: int(l.scoff_sim),
    alertas: lista(l.alertas),
    revisar: simNao(l.revisar),
    responsavel: o.responsavel && typeof o.responsavel === "object" && Object.values(o.responsavel).some((v) => v !== "") ? o.responsavel : null,
    consentimento: simNao(l.consentimento),
    consentimento_em: instante(l.consentimento_em),
    versao_consentimento: txt(l.versao_consentimento) || null,
    avisado_em: new Date().toISOString()     // já foram avisados na época da planilha
  });
}

// anamneses
const linhasAnam = [];
const fixos = ["recebido_em", "enviado_em", "codigo", "tipo", "consentimento", "consentimento_em", "versao_consentimento", "website"];
for (const l of anamneses) {
  const id = acharPerfil(l);
  if (!id) { semDono.anamneses++; continue; }
  const respostas = {};
  for (const [k, v] of Object.entries(l)) if (!fixos.includes(k) && !vazio(v)) respostas[k] = v instanceof Date ? v.toISOString() : v;
  const b = int(l.bristol);
  linhasAnam.push({
    profile_id: id,
    importado_de: `planilha:anamneses:${txt(l.codigo) || digitos(l.whatsapp)}:${instante(l.recebido_em) || "sem-data"}`,
    enviado_em: instante(l.enviado_em) || instante(l.recebido_em),
    bristol: b >= 1 && b <= 7 ? b : null,
    agua: txt(l.agua) || null,
    respostas,
    consentimento: simNao(l.consentimento),
    consentimento_em: instante(l.consentimento_em),
    versao_consentimento: txt(l.versao_consentimento) || null,
    avisado_em: new Date().toISOString()
  });
}

// check-ins
const linhasCk = [];
for (const l of checkins) {
  const id = acharPerfil(l);
  if (!id) { semDono.checkins++; continue; }
  const adesao = int(l.adesao);
  const b = int(l.bristol);
  const quando = instante(l.recebido_em);
  linhasCk.push({
    profile_id: id,
    importado_de: `planilha:checkins:${txt(l.codigo)}:${quando || "sem-data"}`,
    created_at: quando || new Date().toISOString(),
    enviado_em: quando,
    adesao: adesao !== null && adesao >= 0 && adesao <= 10 ? adesao : 0,
    refeicoes_dificeis: lista(l.refeicoes_dificeis),
    fome: txt(l.fome) || null,
    deslizes: txt(l.deslizes) || null,
    deslize_motivo: lista(l.deslize_motivo),
    agua: txt(l.agua) || null,
    freq_evacuacao: txt(l.freq_evacuacao) || null,
    bristol: b >= 1 && b <= 7 ? b : null,
    sintomas_gi: lista(l.sintomas_gi),
    alerta: lista(l.alerta),
    energia: txt(l.energia) || null,
    peso_kg: num(l.peso_kg),
    recado: txt(l.recado) || null,
    quer_contato: simNao(l.quer_contato),
    avisado_em: new Date().toISOString()
  });
}

// Linhas de quem ainda não tem conta (simulação) não podem ser gravadas: só contadas.
async function importar(tabela, linhas) {
  const prontas = linhas.filter((l) => real(l.profile_id));
  const pendentes = linhas.length - prontas.length;
  const r = await inserirSemDuplicar(tabela, prontas);
  console.log(`${tabela}: ${r.novas} ${APLICAR ? "importadas" : "a importar"}, ${r.existentes} já estavam no Supabase` +
    (pendentes ? `, ${pendentes} de pacientes que serão convidados` : "") +
    (semDono[tabela] ? `, ${semDono[tabela]} sem paciente correspondente (ignoradas)` : "") + ".");
}

console.log("");
try {
  await importar("pre_formularios", linhasPre);
  await importar("anamneses", linhasAnam);
  await importar("checkins", linhasCk);
} catch (e) {
  console.error("Erro ao importar respostas: " + (e.message || e));
  process.exitCode = 1;
}

console.log(`\nPacientes: ${resumo.convidados} ${APLICAR ? "convidados" : "a convidar"}, ${resumo.existentes} já tinham conta, ` +
  `${resumo.completados} com campos completados, ${resumo.ignorados} ignorados, ${resumo.falhas} falhas.`);
if (!APLICAR) console.log("Nada foi gravado. Confira a lista acima e rode de novo com --aplicar.");
