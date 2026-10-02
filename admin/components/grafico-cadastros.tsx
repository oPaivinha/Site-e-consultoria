"use client";

import { useEffect, useRef, useState } from "react";

type Ponto = { dia: string; total: number };

const fmtDia = (d: string, longo = false) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", longo ? { day: "2-digit", month: "long" } : { day: "2-digit", month: "2-digit" });

// Topo do eixo em número "redondo" e 3 a 5 marcas inteiras.
function escala(max: number) {
  if (max <= 4) return { topo: Math.max(max, 1), passo: 1 };
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((m) => m * pot).find((p) => p >= bruto)!;
  return { topo: Math.ceil(max / passo) * passo, passo };
}

// Gráfico de colunas de cadastros por dia (uma série só, então sem legenda: o título diz o que é).
export function GraficoCadastros({ pontos }: { pontos: Ponto[] }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [foco, setFoco] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const altura = 200, esq = 32, dir = 8, topoPad = 12, baixo = 24;
  const areaL = largura - esq - dir, areaA = altura - topoPad - baixo;
  const max = Math.max(0, ...pontos.map((p) => p.total));
  const { topo, passo } = escala(max);
  const faixa = areaL / Math.max(pontos.length, 1);
  const larg = Math.min(24, Math.max(2, faixa - 2)); // coluna fina, com 2px de folga entre vizinhas
  const y = (v: number) => topoPad + areaA - (v / topo) * areaA;
  const marcas = Array.from({ length: Math.floor(topo / passo) + 1 }, (_, i) => i * passo);
  const cadaRotulo = Math.ceil(pontos.length / Math.max(2, Math.floor(areaL / 56)));
  const total = pontos.reduce((s, p) => s + p.total, 0);
  const atual = foco !== null ? pontos[foco] : null;

  return (
    <div>
      <div ref={caixa} className="relative" onMouseLeave={() => setFoco(null)}>
        <svg width={largura} height={altura} role="img" aria-label={`Cadastros por dia nos últimos ${pontos.length} dias: ${total} no total.`} className="block">
          {marcas.map((m) => (
            <g key={m}>
              <line x1={esq} x2={largura - dir} y1={y(m)} y2={y(m)} stroke="var(--color-linha)" strokeWidth={1} />
              <text x={esq - 6} y={y(m)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-suave)">{m}</text>
            </g>
          ))}
          {pontos.map((p, i) => {
            const cx = esq + faixa * i + faixa / 2;
            const h = Math.max(0, y(0) - y(p.total));
            const r = Math.min(4, larg / 2, h);
            const x0 = cx - larg / 2, x1 = cx + larg / 2, base = y(0), top = base - h;
            // Coluna com cantos arredondados só no topo (a base fica reta, presa ao eixo).
            const caminho = h > 0
              ? `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x1 - r} Q${x1},${top} ${x1},${top + r} V${base} Z`
              : "";
            return (
              <g key={p.dia}>
                {caminho && <path d={caminho} fill="var(--color-verde)" opacity={foco === null || foco === i ? 1 : 0.45} />}
                {i % cadaRotulo === 0 && (
                  <text x={cx} y={altura - 6} textAnchor="middle" fontSize={11} fill="var(--color-suave)">{fmtDia(p.dia)}</text>
                )}
                {/* Área de toque maior que a coluna, para o mouse e o dedo acharem fácil. */}
                <rect
                  x={esq + faixa * i} y={topoPad} width={faixa} height={areaA} fill="transparent"
                  onMouseEnter={() => setFoco(i)} onClick={() => setFoco(i)}
                />
              </g>
            );
          })}
        </svg>
        {atual && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 rounded-lg border border-linha bg-superficie px-3 py-2 text-xs shadow-sm"
            style={{
              left: Math.min(Math.max(esq + faixa * foco! + faixa / 2 - 60, 0), largura - 120),
              top: Math.max(0, y(atual.total) - 52),
              width: 120,
            }}
          >
            <div className="text-suave">{fmtDia(atual.dia, true)}</div>
            <div className="font-medium text-tinta">{atual.total} {atual.total === 1 ? "cadastro" : "cadastros"}</div>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer select-none text-verde">Ver em tabela</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-linha">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-tom text-xs uppercase tracking-wide text-suave">
              <tr><th className="px-3 py-2">Dia</th><th className="px-3 py-2 text-right">Cadastros</th></tr>
            </thead>
            <tbody>
              {[...pontos].reverse().map((p) => (
                <tr key={p.dia} className="border-t border-linha">
                  <td className="px-3 py-1.5">{fmtDia(p.dia, true)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
