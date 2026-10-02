// Transforma códigos das respostas ("passando_fome", "1_2") em texto legível.
const PALAVRAS: Record<string, string> = {
  sim: "Sim", nao: "Não", ok: "Ok", nenhum: "Nenhum", nenhuma: "Nenhuma",
  "1_2": "1 ou 2", "3_5": "3 a 5", mais_5: "Mais de 5", menos_1l: "Menos de 1 L", "1_2l": "1 a 2 L",
  "2_3l": "2 a 3 L", mais_3l: "Mais de 3 L", agua: "Água",
  menos_10: "Menos de 10 min", "10_20": "10 a 20 min", "20_30": "20 a 30 min", mais_30: "Mais de 30 min",
  quase_sempre: "Quase sempre", as_vezes: "Às vezes", raramente: "Raramente",
};

export function humanizar(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (Array.isArray(v)) return v.length ? v.map(humanizar).join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  if (PALAVRAS[s]) return PALAVRAS[s];
  if (/^[a-z0-9]+(_[a-z0-9]+)*$/.test(s)) {
    const t = s.replace(/_/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return s;
}

const CAMPOS: Record<string, string> = {
  adesao: "Adesão ao plano (0 a 10)", agua: "Água por dia", freq_evacuacao: "Frequência de evacuação",
  refeicoes_dificeis: "Refeições difíceis", deslize_motivo: "Motivo dos deslizes", sintomas_gi: "Sintomas gastrointestinais",
  peso_kg: "Peso (kg)", altura_cm: "Altura (cm)", treino_freq: "Frequência de treino", scoff_sim: "SCOFF (respostas sim)",
  quer_contato: "Quer contato", energia: "Energia", fome: "Fome", deslizes: "Deslizes", recado: "Recado",
  bristol: "Bristol (1 a 7)", objetivo: "Objetivo", modalidade: "Modalidade", tentativas: "Tentativas anteriores",
  origem: "Como conheceu", diabetes: "Diabetes", insulina: "Insulina", cardio: "Doença cardiovascular",
  renal_hepatica: "Doença renal ou hepática", ta: "Transtorno alimentar", gestacao: "Gestação ou amamentação",
  cirurgia: "Cirurgia", medicamento: "Medicamento", outras: "Outras condições",
  tempo_refeicao: "Tempo por refeição", mastiga_pouco: "Mastiga pouco", come_rapido: "Come rápido",
};

export function nomeCampo(k: string): string {
  if (CAMPOS[k]) return CAMPOS[k];
  const t = k.replace(/^t_/, "").replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
