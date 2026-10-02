// Monta um link mantendo os filtros atuais e trocando só o que foi pedido.
export function comParams(base: string, atuais: Record<string, string | undefined>, mudar: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...atuais, ...mudar })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
