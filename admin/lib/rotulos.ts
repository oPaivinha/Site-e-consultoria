// Textos em português para os códigos guardados no banco.

export const OBJETIVOS: Record<string, string> = {
  emagrecimento: "Emagrecer",
  ganho_massa: "Ganhar massa magra",
  recomposicao: "Recomposição corporal",
  performance: "Desempenho nos treinos",
  saude: "Alimentação mais saudável",
};

export const STATUS: Record<string, string> = {
  novo: "Sem acompanhamento",
  ativo: "Em acompanhamento",
  pausado: "Pausado",
  desativado: "Desativado",
};

// Alertas do pré-formulário (condições de saúde e SCOFF) e do check-in (sinais de alarme).
export const ALERTAS: Record<string, string> = {
  diabetes: "Diabetes",
  insulina: "Usa insulina",
  cardio: "Doença cardiovascular",
  renal_hepatica: "Doença renal ou hepática",
  ta: "Transtorno alimentar",
  gestacao: "Gestação ou amamentação",
  cirurgia: "Cirurgia recente",
  medicamento: "Usa medicamento",
  outras: "Outra condição",
  scoff_positivo: "SCOFF positivo (risco de transtorno alimentar)",
  sangue_fezes: "Sangue nas fezes ou fezes pretas",
  dor_forte: "Dor abdominal forte",
  diarreia_vomito: "Diarreia ou vômitos por mais de 2 dias",
  tontura: "Tontura, fraqueza forte ou desmaio",
};

export const rotulo = (mapa: Record<string, string>, v?: string | null) => (v ? mapa[v] ?? v : "");

export function data(v?: string | null, comHora = false) {
  if (!v) return "";
  const d = new Date(v.length === 10 ? v + "T12:00:00" : v);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
