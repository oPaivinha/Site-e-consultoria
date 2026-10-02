import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

// Cliente do Supabase usado nas páginas e ações do painel (sempre no servidor).
// Usa a chave pública + o login do admin guardado em cookie, então o RLS do banco vale normalmente.
export async function supabaseServidor() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Páginas (Server Components) não podem gravar cookie; o proxy.ts já renova a sessão.
        }
      },
    },
  });
}
