"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string; email?: string };

const MENSAGENS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Este e-mail ainda não foi confirmado. Abra o link que chegou no seu e-mail.",
  over_request_rate_limit: "Muitas tentativas. Espere alguns minutos e tente de novo.",
  user_banned: "Esta conta está desativada.",
};

export async function entrar(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Digite um e-mail válido.", email };
  if (!senha) return { erro: "Digite a senha.", email };

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return { erro: MENSAGENS[error.code ?? ""] ?? "Não foi possível entrar. Tente de novo.", email };
  }

  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (ehAdmin !== true) {
    await supabase.auth.signOut();
    return { erro: "Acesso negado. Esta conta não é de administrador.", email };
  }

  redirect("/");
}
