"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin, type Admin } from "@/lib/admin";
import { siteUrl } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/server";

export type Resultado = { ok?: string; erro?: string };
const UUID = /^[0-9a-f-]{36}$/;

// Ações sobre a conta não passam pelos gatilhos do banco, então anotamos na auditoria aqui.
async function anotar(admin: Admin, id: string, acao: string, antes?: unknown, depois?: unknown) {
  await supabaseAdmin().from("audit_log").insert({
    admin_id: admin.id, admin_email: admin.email, tabela: "conta", registro_id: id, acao,
    antes: antes ?? null, depois: depois ?? null,
  });
}

async function emailDaConta(id: string) {
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(id);
  if (error || !data.user?.email) throw new Error("Conta não encontrada.");
  return data.user;
}

function falha(e: unknown): Resultado {
  const msg = (e as Error).message || "";
  if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) return { erro: "Falta configurar a chave secreta no painel (SUPABASE_SERVICE_ROLE_KEY na Vercel)." };
  if (/rate limit/i.test(msg)) return { erro: "Muitos e-mails em pouco tempo. Espere alguns minutos e tente de novo." };
  return { erro: "Não foi possível concluir: " + msg };
}

export async function reenviarConfirmacao(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  try {
    const u = await emailDaConta(id);
    if (u.email_confirmed_at) return { erro: "Este e-mail já está confirmado." };
    const { error } = await supabaseAdmin().auth.resend({
      type: "signup", email: u.email!, options: { emailRedirectTo: siteUrl() + "auth/callback.html" },
    });
    if (error) throw error;
    await anotar(admin, id, "reenviar_confirmacao");
    return { ok: `E-mail de confirmação reenviado para ${u.email}.` };
  } catch (e) { return falha(e); }
}

export async function enviarNovaSenha(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  try {
    const u = await emailDaConta(id);
    const { error } = await supabaseAdmin().auth.resetPasswordForEmail(u.email!, { redirectTo: siteUrl() + "nova-senha.html" });
    if (error) throw error;
    await anotar(admin, id, "enviar_nova_senha");
    return { ok: `Link para criar senha nova enviado para ${u.email}.` };
  } catch (e) { return falha(e); }
}

// Desativar: bloqueia o login e esconde o paciente das listas (dá para reativar).
export async function desativar(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  if (id === admin.id) return { erro: "Você não pode desativar a sua própria conta." };
  try {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { ban_duration: "876000h" });
    if (error) throw error;
    const supabase = await supabaseServidor();
    const r = await supabase.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (r.error) throw r.error;
    await anotar(admin, id, "desativar");
  } catch (e) { return falha(e); }
  revalidatePath(`/pacientes/${id}`);
  return { ok: "Conta desativada. O paciente não consegue mais entrar." };
}

export async function reativar(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  try {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { ban_duration: "none" });
    if (error) throw error;
    const supabase = await supabaseServidor();
    const r = await supabase.from("profiles").update({ deleted_at: null }).eq("id", id);
    if (r.error) throw r.error;
    await anotar(admin, id, "reativar");
  } catch (e) { return falha(e); }
  revalidatePath(`/pacientes/${id}`);
  return { ok: "Conta reativada." };
}

// Excluir de vez (pedido LGPD): apaga a conta e todos os dados dela. Não tem volta.
export async function excluirDeVez(id: string, confirmacao: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  if (id === admin.id) return { erro: "Você não pode excluir a sua própria conta por aqui." };
  if (confirmacao.trim().toUpperCase() !== "EXCLUIR") return { erro: 'Digite EXCLUIR para confirmar.' };
  try {
    const sb = supabaseAdmin();
    const { data: perfil } = await sb.from("profiles").select("nome, email, created_at").eq("id", id).maybeSingle();
    const { error } = await sb.auth.admin.deleteUser(id);
    if (error) throw error;
    // Guarda só o mínimo para saber o que foi excluído (sem dados de saúde).
    await anotar(admin, id, "excluir_conta", perfil ?? null, null);
  } catch (e) { return falha(e); }
  revalidatePath("/pacientes");
  redirect("/pacientes?excluido=1");
}

// Promover ou remover admin: usa o login do próprio admin (RLS + auditoria automática do banco).
export async function definirAdmin(id: string, tornar: boolean): Promise<Resultado> {
  const admin = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  if (!tornar && id === admin.id) return { erro: "Você não pode remover o seu próprio acesso de admin." };
  const supabase = await supabaseServidor();
  const r = tornar
    ? await supabase.from("admins").upsert({ user_id: id }, { onConflict: "user_id", ignoreDuplicates: true })
    : await supabase.from("admins").delete().eq("user_id", id);
  if (r.error) return { erro: "Não foi possível alterar: " + r.error.message };
  revalidatePath(`/pacientes/${id}`);
  return { ok: tornar ? "Agora esta pessoa é administradora do painel." : "Acesso de admin removido." };
}
