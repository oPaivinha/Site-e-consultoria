import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serviceRoleKey, supabaseUrl } from "@/lib/env";

// Cliente com a chave secreta (service_role). Ignora o RLS, então:
// - só existe no servidor (o "server-only" acima impede que vá para o navegador);
// - só é usado DEPOIS de exigirAdmin(), e só para o que a chave pública não consegue fazer
//   (bloquear, excluir e convidar contas).
export function supabaseAdmin() {
  return createClient(supabaseUrl(), serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
