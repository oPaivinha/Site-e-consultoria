"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin";
import { siteUrl } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/server";
import { conferirPlanilha, type DadosPaciente } from "@/lib/importacao";

export type Previa = {
  erroGeral?: string | null;
  ignoradas?: string[];
  linhas?: { n: number; nome: string; email: string; acao: "criar" | "atualizar" | "erro"; erros: string[] }[];
};
export type Resultado = {
  erroGeral?: string;
  linhas?: { n: number; email: string; status: "criado" | "atualizado" | "erro"; mensagem: string }[];
};

const MAX_TEXTO = 1_000_000; // 1 MB

// Quais e-mails da planilha já têm conta (busca no banco em blocos de 100).
async function contasExistentes(emails: string[]) {
  const supabase = await supabaseServidor();
  const mapa = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data, error } = await supabase.from("profiles").select("id,email").in("email", emails.slice(i, i + 100));
    if (error) throw new Error(error.message);
    for (const p of data ?? []) if (p.email) mapa.set(p.email.toLowerCase(), p.id);
  }
  return mapa;
}

async function conferir(texto: string) {
  if (texto.length > MAX_TEXTO) return { erroGeral: "Arquivo grande demais (máximo 1 MB).", linhas: [], ignoradas: [], existentes: new Map<string, string>() };
  const r = conferirPlanilha(texto);
  const emails = r.linhas.map((l) => l.dados.email).filter((e): e is string => typeof e === "string");
  const existentes = r.erroGeral ? new Map<string, string>() : await contasExistentes(emails);
  return { ...r, existentes };
}

// Passo 1: só confere e mostra o que vai acontecer. Nada é gravado.
export async function previsualizar(texto: string): Promise<Previa> {
  await exigirAdmin();
  try {
    const r = await conferir(texto);
    return {
      erroGeral: r.erroGeral,
      ignoradas: r.ignoradas,
      linhas: r.linhas.map((l) => ({
        n: l.n,
        nome: String(l.dados.nome ?? ""),
        email: l.email,
        acao: l.erros.length ? "erro" : r.existentes.has(String(l.dados.email)) ? "atualizar" : "criar",
        erros: l.erros,
      })),
    };
  } catch (e) {
    return { erroGeral: "Não foi possível conferir a planilha: " + (e as Error).message };
  }
}

// Passo 2: confere tudo de novo (nunca confia na prévia) e grava só as linhas sem erro.
export async function importar(texto: string, convidar: boolean): Promise<Resultado> {
  const admin = await exigirAdmin();
  let r;
  try {
    r = await conferir(texto);
  } catch (e) {
    return { erroGeral: "Não foi possível conferir a planilha: " + (e as Error).message };
  }
  if (r.erroGeral) return { erroGeral: r.erroGeral };

  const supabase = await supabaseServidor();
  let servico: ReturnType<typeof supabaseAdmin> | null = null;
  let limiteEmail = false;
  const saida: NonNullable<Resultado["linhas"]> = [];

  for (const l of r.linhas) {
    const email = l.email;
    if (l.erros.length) { saida.push({ n: l.n, email, status: "erro", mensagem: l.erros.join(" ") }); continue; }
    const { email: _e, ...campos } = l.dados;
    const id = r.existentes.get(email);

    if (id) {
      // Já tem conta: atualiza só as colunas preenchidas na planilha (o e-mail nunca muda).
      // A auditoria é gravada pelo próprio banco.
      const { error } = await supabase.from("profiles").update(campos).eq("id", id);
      saida.push(error
        ? { n: l.n, email, status: "erro", mensagem: "Não foi possível atualizar: " + error.message }
        : { n: l.n, email, status: "atualizado", mensagem: "Dados atualizados." });
      continue;
    }

    try {
      servico ??= supabaseAdmin();
    } catch {
      return { erroGeral: "Falta configurar a chave secreta no painel (SUPABASE_SERVICE_ROLE_KEY na Vercel) para criar contas." };
    }
    if (convidar && limiteEmail) {
      saida.push({ n: l.n, email, status: "erro", mensagem: "Não enviado: limite de e-mails atingido. Importe de novo mais tarde." });
      continue;
    }
    // Os dados vão como "metadados" e o gatilho do banco cria o perfil, igual ao cadastro pelo site.
    const meta: DadosPaciente = { ...campos };
    const res = convidar
      ? await servico.auth.admin.inviteUserByEmail(email, { data: meta, redirectTo: siteUrl() + "auth/callback.html" })
      : await servico.auth.admin.createUser({ email, user_metadata: meta, email_confirm: false });
    if (res.error) {
      const msg = res.error.message || "";
      if (/rate limit/i.test(msg)) limiteEmail = true;
      saida.push({
        n: l.n, email, status: "erro",
        mensagem: /already been registered|already registered|exists/i.test(msg)
          ? "Já existe uma conta com este e-mail."
          : /rate limit/i.test(msg) ? "Limite de e-mails atingido. Importe de novo mais tarde." : "Não foi possível criar: " + msg,
      });
      continue;
    }
    await servico.from("audit_log").insert({
      admin_id: admin.id, admin_email: admin.email, tabela: "conta", registro_id: res.data.user?.id ?? null,
      acao: "importar_criar", antes: null, depois: { ...meta, email, convite: convidar },
    });
    saida.push({ n: l.n, email, status: "criado", mensagem: convidar ? "Conta criada e convite enviado." : "Conta criada (sem e-mail)." });
  }

  revalidatePath("/pacientes");
  return { linhas: saida };
}
