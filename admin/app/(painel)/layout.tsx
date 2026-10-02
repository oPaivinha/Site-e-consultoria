import { exigirAdmin } from "@/lib/admin";
import { Menu } from "@/components/menu";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const admin = await exigirAdmin();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-linha bg-superficie p-4 md:min-h-screen md:border-r md:border-b-0">
        <div className="mb-4 flex items-center justify-between md:block">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-verde">Paiva Nutri</p>
            <p className="font-display text-xl text-verde-escuro">Painel</p>
          </div>
          <form action="/sair" method="post" className="md:hidden">
            <button className="text-sm text-suave underline">Sair</button>
          </form>
        </div>
        <Menu />
        <div className="mt-8 hidden border-t border-linha pt-4 text-sm md:block">
          <p className="truncate text-suave" title={admin.email}>{admin.email}</p>
          <form action="/sair" method="post">
            <button className="mt-1 text-verde underline">Sair</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
