import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";

export type Admin = { id: string; email: string };

// Confere no servidor, a cada página, se quem está logado é admin.
// Não basta esconder botões: sem isso, nenhuma página do painel abre.
export const exigirAdmin = cache(async (): Promise<Admin> => {
  const supabase = await supabaseServidor();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: ehAdmin, error } = await supabase.rpc("is_admin");
  if (error || ehAdmin !== true) redirect("/sair?motivo=negado");

  return { id: u.user.id, email: u.user.email ?? "" };
});
