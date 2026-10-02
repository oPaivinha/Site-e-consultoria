import { exigirAdmin } from "@/lib/admin";
import { COLUNAS_IMPORTACAO } from "@/lib/importacao";
import { paraCsv, respostaCsv } from "@/lib/csv";

// Planilha de exemplo com o cabeçalho certo e duas linhas fictícias.
export async function GET() {
  await exigirAdmin();
  const exemplo = [
    ["Maria Exemplo", "maria@exemplo.com", "(11) 98765-4321", "15/03/1990", "feminino", "sim", "não", "", "", "", "", ""],
    ["Pedro Exemplo", "responsavel@exemplo.com", "", "20/08/2012", "masculino", "sim", "sim", "pedro@exemplo.com", "Ana Exemplo", "mãe", "11912345678", "responsavel@exemplo.com"],
  ];
  return respostaCsv("modelo-pacientes.csv", paraCsv([...COLUNAS_IMPORTACAO], exemplo));
}
