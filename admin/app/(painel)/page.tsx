import { exigirAdmin } from "@/lib/admin";
import { Erro } from "@/components/estados";
import { supabaseServidor } from "@/lib/supabase/server";
import { GraficoCadastros } from "@/components/grafico-cadastros";

type Resumo = {
  total: number; novos_7: number; novos_30: number; nao_confirmados: number;
  ativos: number; pausados: number; atrasados: number; checkins_30: number;
};

export default async function VisaoGeral() {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  const [{ data, error }, porDia] = await Promise.all([
    supabase.rpc("admin_resumo"),
    supabase.rpc("admin_cadastros_por_dia", { p_dias: 30 }),
  ]);

  if (error) {
    return <Erro>Não foi possível carregar os números: {error.message}</Erro>;
  }
  const r = data as Resumo;

  const cartoes = [
    { rotulo: "Pacientes cadastrados", valor: r.total },
    { rotulo: "Novos em 7 dias", valor: r.novos_7 },
    { rotulo: "Novos em 30 dias", valor: r.novos_30 },
    { rotulo: "E-mails não confirmados", valor: r.nao_confirmados, destaque: r.nao_confirmados > 0 },
    { rotulo: "Em acompanhamento", valor: r.ativos },
    { rotulo: "Pausados", valor: r.pausados },
    { rotulo: "Check-ins pendentes", valor: r.atrasados, destaque: r.atrasados > 0 },
    { rotulo: "Check-ins em 30 dias", valor: r.checkins_30 },
  ];

  return (
    <>
      <h1 className="mb-6 text-3xl">Visão geral</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="rounded-card border border-linha bg-superficie p-4">
            <p className="text-sm text-suave">{c.rotulo}</p>
            <p className={`mt-1 font-display text-3xl ${c.destaque ? "text-alerta" : "text-verde-escuro"}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-card border border-linha bg-superficie p-5">
        <h2 className="text-xl">Cadastros por dia</h2>
        <p className="mb-4 text-sm text-suave">Últimos 30 dias. Passe o mouse (ou toque) numa coluna para ver o dia.</p>
        {porDia.error ? (
          <p role="alert" className="text-sm text-perigo">Não foi possível carregar o gráfico: {porDia.error.message}</p>
        ) : (
          <GraficoCadastros pontos={((porDia.data ?? []) as { dia: string; total: number }[]).map((p) => ({ dia: p.dia, total: Number(p.total) }))} />
        )}
      </section>
    </>
  );
}
