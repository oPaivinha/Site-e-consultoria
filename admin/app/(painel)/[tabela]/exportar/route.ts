import { type NextRequest } from "next/server";
import { exigirAdmin } from "@/lib/admin";
import { buscarRegistros, type Registro } from "@/lib/registros";
import { tabelaPorSlug } from "@/lib/tabelas";
import { mostrar } from "@/lib/campos";
import { paraCsv, respostaCsv } from "@/lib/csv";

// Baixa a lista com os MESMOS filtros da tela, em blocos de 100.
export async function GET(request: NextRequest, { params }: { params: Promise<{ tabela: string }> }) {
  await exigirAdmin();
  const t = tabelaPorSlug((await params).tabela);
  if (!t) return new Response("Não encontrado", { status: 404 });
  const f = Object.fromEntries(request.nextUrl.searchParams);

  const todas: Registro[] = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const { linhas } = await buscarRegistros(t, f, 100, offset);
    todas.push(...linhas);
    if (linhas.length < 100) break;
  }

  const campos = t.campos.filter((c) => c.tipo !== "paciente");
  const csv = paraCsv(
    ["Paciente", "E-mail", ...campos.map((c) => c.rotulo)],
    todas.map((l) => [l.paciente?.nome, l.paciente?.email, ...campos.map((c) => mostrar(c, l[c.col]))]),
  );
  const hoje = new Date().toISOString().slice(0, 10);
  return respostaCsv(`${t.slug}${f.lixeira === "1" ? "-lixeira" : ""}-${hoje}.csv`, csv);
}
