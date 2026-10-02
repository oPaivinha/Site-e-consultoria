// Gera um CSV que o Excel em português abre certo (separador ";" e acentos ok).
export function paraCsv(cabecalho: string[], linhas: (string | number | boolean | null | undefined)[][]) {
  const celula = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "boolean" ? (v ? "sim" : "não") : String(v);
    // Evita que o Excel interprete o texto como fórmula.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
}

export function respostaCsv(nomeArquivo: string, conteudo: string) {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
