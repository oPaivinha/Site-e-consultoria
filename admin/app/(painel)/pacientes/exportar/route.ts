import { type NextRequest } from "next/server";
import { exigirAdmin } from "@/lib/admin";
import { buscarPacientes, type Filtros } from "@/lib/pacientes";
import { paraCsv, respostaCsv } from "@/lib/csv";
import { ALERTAS, OBJETIVOS, STATUS, data, rotulo } from "@/lib/rotulos";

// Baixa a lista de pacientes com os MESMOS filtros da tela, em blocos de 100 (nunca a tabela de uma vez).
export async function GET(request: NextRequest) {
  await exigirAdmin();
  const f = Object.fromEntries(request.nextUrl.searchParams) as Filtros;

  const todas = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const bloco = await buscarPacientes(f, 100, offset);
    todas.push(...bloco);
    if (bloco.length < 100) break;
  }

  const csv = paraCsv(
    ["Nome", "E-mail", "WhatsApp", "Menor", "Objetivo", "Situação", "Alertas", "E-mail confirmado", "Próximo check-in", "Cadastro", "Último login"],
    todas.map((p) => [
      p.nome, p.email, p.whatsapp, p.menor, rotulo(OBJETIVOS, p.objetivo), rotulo(STATUS, p.status),
      (p.alertas ?? []).map((a) => rotulo(ALERTAS, a)).join(", "),
      Boolean(p.email_confirmado_em), data(p.proximo_checkin), data(p.created_at, true), data(p.ultimo_login, true),
    ]),
  );
  const hoje = new Date().toISOString().slice(0, 10);
  return respostaCsv(`pacientes-${hoje}.csv`, csv);
}
