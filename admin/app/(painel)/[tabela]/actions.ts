"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { supabaseServidor } from "@/lib/supabase/server";
import { tabelaPorSlug } from "@/lib/tabelas";
import { lerFormulario } from "@/lib/campos";

export type ResultadoForm = { ok?: string; erro?: string; erros?: Record<string, string> };

// Traduz os erros mais comuns do banco para português.
function mensagem(e: { code?: string; message: string }) {
  if (e.code === "23505") return "Já existe um registro igual (por exemplo, esse paciente já tem acompanhamento ou esse check-in já tem aviso).";
  if (e.code === "23503") return "Paciente ou check-in não encontrado.";
  if (e.code === "23514") return "Algum valor está fora do permitido.";
  if (e.code === "42501") return "Acesso negado.";
  return e.message;
}

const idValido = (id: string) => /^[0-9a-f-]{36}$/.test(id) || /^\d{1,18}$/.test(id);

// Cria (id vazio) ou edita um registro. Valida tudo de novo aqui, no servidor.
export async function salvarRegistro(slug: string, id: string | null, _a: ResultadoForm, form: FormData): Promise<ResultadoForm> {
  await exigirAdmin();
  const t = tabelaPorSlug(slug);
  if (!t || (id !== null && !idValido(id))) return { erro: "Registro inválido." };

  const { valores, erros } = lerFormulario(t, form, id === null);
  if (Object.keys(erros).length) return { erro: "Confira os campos destacados.", erros };

  const supabase = await supabaseServidor();
  if (id === null) {
    const { data, error } = await supabase.from(t.tabela).insert(valores).select(t.chave).single();
    if (error) return { erro: "Não foi possível criar: " + mensagem(error) };
    revalidatePath(`/${slug}`);
    redirect(`/${slug}/${(data as unknown as Record<string, unknown>)[t.chave]}?criado=1`);
  }
  const { error } = await supabase.from(t.tabela).update(valores).eq(t.chave, id);
  if (error) return { erro: "Não foi possível salvar: " + mensagem(error) };
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/${id}`);
  return { ok: "Alterações salvas." };
}

// "Excluir" só esconde (preenche deleted_at). Dá para restaurar pela lixeira.
export async function moverParaLixeira(form: FormData) {
  await alterarLixeira(form, new Date().toISOString());
}

export async function restaurar(form: FormData) {
  await alterarLixeira(form, null);
}

async function alterarLixeira(form: FormData, deletedAt: string | null) {
  await exigirAdmin();
  const t = tabelaPorSlug(String(form.get("slug") ?? ""));
  const id = String(form.get("id") ?? "");
  if (!t || !idValido(id)) redirect("/");
  const supabase = await supabaseServidor();
  const { error } = await supabase.from(t.tabela).update({ deleted_at: deletedAt }).eq(t.chave, id);
  if (error) redirect(`/${t.slug}/${id}?erro=${encodeURIComponent(mensagem(error))}`);
  revalidatePath(`/${t.slug}`);
  redirect(deletedAt ? `/${t.slug}?excluido=1` : `/${t.slug}/${id}?restaurado=1`);
}
