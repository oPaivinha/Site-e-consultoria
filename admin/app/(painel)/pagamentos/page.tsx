import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { supabaseServidor } from "@/lib/supabase/server";
import { Erro, Vazio } from "@/components/estados";
import { PAGAMENTO, data, reais, rotulo } from "@/lib/rotulos";
import { FormPreco } from "./form-preco";

type Linha = {
  id: number; profile_id: string; plano: string; valor: number; status: string; metodo: string | null;
  parcelas: number | null; pago_em: string | null; created_at: string;
  profiles: { nome: string | null; email: string | null } | null;
};

const COR: Record<string, string> = {
  aprovado: "bg-verde-claro text-verde-escuro",
  em_analise: "bg-alerta-claro text-alerta",
  recusado: "bg-perigo-claro text-perigo",
  devolvido: "bg-perigo-claro text-perigo",
};

export default async function Pagamentos() {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  const [precos, pags] = await Promise.all([
    supabase.from("precos").select("plano, nome, valor, parcelas_max, ativo").order("valor"),
    supabase.from("pagamentos")
      .select("id, profile_id, plano, valor, status, metodo, parcelas, pago_em, created_at, profiles(nome, email)")
      .order("created_at", { ascending: false }).limit(200),
  ]);
  if (precos.error || pags.error) return <Erro>Não foi possível carregar os pagamentos: {(precos.error ?? pags.error)?.message}</Erro>;

  // Abandonos (pendente) só poluem a lista: mostra os que andaram.
  const lista = ((pags.data ?? []) as unknown as Linha[]).filter((p) => p.status !== "pendente" && p.status !== "cancelado");
  const desde = Date.now() - 30 * 864e5;
  const aprovados30 = lista.filter((p) => p.status === "aprovado" && p.pago_em && Date.parse(p.pago_em) >= desde);
  const total30 = aprovados30.reduce((s, p) => s + Number(p.valor), 0);
  const emAnalise = lista.filter((p) => p.status === "em_analise").length;

  return (
    <>
      <h1 className="mb-6 text-3xl">Pagamentos</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Recebido em 30 dias" valor={reais(total30)} />
        <Numero rotulo="Pagamentos em 30 dias" valor={String(aprovados30.length)} />
        <Numero rotulo="Em análise" valor={String(emAnalise)} destaque={emAnalise > 0} />
      </div>

      <h2 className="mb-3 text-2xl">Preços dos planos</h2>
      <p className="mb-3 text-sm text-suave">É este o valor cobrado na tela de pagamento. A descrição dos planos continua no arquivo planos.js do site.</p>
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        {(precos.data ?? []).map((p) => <FormPreco key={p.plano} p={p} />)}
      </div>

      <h2 className="mb-3 text-2xl">Últimos pagamentos</h2>
      {lista.length === 0 ? (
        <Vazio titulo="Nenhum pagamento ainda.">Quando alguém pagar, aparece aqui.</Vazio>
      ) : (
        <div className="overflow-x-auto rounded-card border border-linha bg-superficie">
          <table className="w-full text-sm">
            <thead className="bg-tom text-left text-xs text-suave">
              <tr><th className="p-3">Paciente</th><th className="p-3">Plano</th><th className="p-3">Valor</th><th className="p-3">Forma</th><th className="p-3">Situação</th><th className="p-3">Data</th></tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-t border-linha">
                  <td className="p-3"><Link className="text-verde underline" href={`/pacientes/${p.profile_id}`}>{p.profiles?.nome || p.profiles?.email || "(sem nome)"}</Link></td>
                  <td className="p-3 capitalize">{p.plano}</td>
                  <td className="p-3">{reais(p.valor)}</td>
                  <td className="p-3">{p.metodo ?? "—"}{p.parcelas && p.parcelas > 1 ? ` (${p.parcelas}x)` : ""}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR[p.status] ?? "bg-tom"}`}>{rotulo(PAGAMENTO, p.status)}</span></td>
                  <td className="p-3 whitespace-nowrap">{data(p.pago_em ?? p.created_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-suave">Devoluções e detalhes de cada venda ficam no app do Mercado Pago.</p>
    </>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-card border border-linha bg-superficie p-4">
      <p className="text-sm text-suave">{rotulo}</p>
      <p className={`mt-1 font-display text-3xl ${destaque ? "text-alerta" : "text-verde-escuro"}`}>{valor}</p>
    </div>
  );
}
