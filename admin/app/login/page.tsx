import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { FormularioLogin } from "./formulario";

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  // Admin já logado não vê a tela de login.
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { data: ehAdmin } = await supabase.rpc("is_admin");
    if (ehAdmin === true) redirect("/");
  }

  const { erro } = await searchParams;
  const aviso = erro === "negado" ? "Acesso negado. Esta conta não é de administrador." : undefined;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm rounded-card border border-linha bg-superficie p-7 shadow-[0_10px_30px_rgba(21,54,40,.08)]">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-verde">Paiva Nutri</p>
        <h1 className="mt-1 mb-6 text-3xl">Painel</h1>
        <FormularioLogin avisoInicial={aviso} />
      </div>
    </main>
  );
}
