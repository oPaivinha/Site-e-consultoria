import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { listaPacientes } from "@/lib/registros";
import { tabelaPorSlug } from "@/lib/tabelas";
import { Erro } from "@/components/estados";
import { FormRegistro } from "../formulario";

// Criar um registro novo à mão (ex.: um check-in recebido por WhatsApp).
export default async function NovoRegistro({
  params, searchParams,
}: { params: Promise<{ tabela: string }>; searchParams: Promise<{ paciente?: string }> }) {
  await exigirAdmin();
  const t = tabelaPorSlug((await params).tabela);
  if (!t || !t.podeCriar) notFound();
  const { paciente } = await searchParams;

  let pacientes;
  try {
    pacientes = await listaPacientes();
  } catch (e) {
    return <Erro>Não foi possível carregar os pacientes: {(e as Error).message}</Erro>;
  }

  return (
    <>
      <Link href={`/${t.slug}`} className="text-sm text-verde underline">← {t.titulo}</Link>
      <h1 className="mt-2 mb-1 text-3xl">Novo {t.singular}</h1>
      <p className="mb-5 text-sm text-suave">Campos com * são obrigatórios.</p>
      <section className="rounded-card border border-linha bg-superficie p-5">
        <FormRegistro
          slug={t.slug} id={null} campos={t.campos} pacientes={pacientes} listas={{}}
          valores={{ ...Object.fromEntries(t.campos.filter((c) => c.padrao).map((c) => [c.col, c.padrao!])), profile_id: paciente && /^[0-9a-f-]{36}$/.test(paciente) ? paciente : "" }}
        />
      </section>
    </>
  );
}
