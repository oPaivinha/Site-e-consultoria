import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { COLUNAS_IMPORTACAO, MAX_LINHAS } from "@/lib/importacao";
import { Importador } from "./importador";

// Importar pacientes de uma planilha CSV: confere tudo, mostra a prévia e só grava depois da confirmação.
export default async function ImportarPacientes() {
  await exigirAdmin();
  return (
    <>
      <Link href="/pacientes" className="text-sm text-verde underline">← Pacientes</Link>
      <h1 className="mt-2 text-3xl">Importar pacientes</h1>
      <div className="mt-2 mb-5 max-w-3xl space-y-2 text-sm text-suave">
        <p>
          A planilha precisa ter uma linha de cabeçalho com pelo menos <b>nome</b> e <b>email</b>. Colunas opcionais:{" "}
          {COLUNAS_IMPORTACAO.slice(2).join(", ")}. Até {MAX_LINHAS} pacientes por vez.
        </p>
        <p>
          O e-mail é a chave: se já existe conta com ele, os dados são atualizados (só as colunas preenchidas); se não existe, uma conta nova é criada.
          Nada é gravado antes de você conferir a prévia e confirmar.
        </p>
        <p><a href="/pacientes/importar/modelo" className="text-verde underline">Baixar planilha modelo</a></p>
      </div>
      <Importador />
    </>
  );
}
