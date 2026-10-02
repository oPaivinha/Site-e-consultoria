import Link from "next/link";
import { Vazio } from "@/components/estados";

export default function NaoEncontrado() {
  return (
    <Vazio titulo="Não encontramos este registro.">
      Ele pode ter sido excluído. <Link href="/pacientes" className="text-verde underline">Voltar para pacientes</Link>
    </Vazio>
  );
}
