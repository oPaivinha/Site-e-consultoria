// Descrição de cada tabela que o painel mostra nas seções "Acompanhamentos", "Pré-formulários" etc.
// Uma tela genérica lê esta descrição e monta a lista, os filtros, o formulário e a exportação.
// Para mostrar uma coluna nova, basta acrescentá-la aqui.
import { ALERTAS, OBJETIVOS } from "./rotulos";
import type { Database } from "./database.types";

export type Tipo =
  | "paciente" // id do paciente (mostrado pelo nome)
  | "texto" | "textolongo" | "numero" | "inteiro" | "data" | "datahora" | "booleano"
  | "opcoes" // uma opção de uma lista fixa
  | "lista" // várias opções (guardadas como lista no banco)
  | "json"; // dados estruturados (respostas completas, saúde etc.)

export type Campo = {
  col: string;
  rotulo: string;
  tipo: Tipo;
  opcoes?: Record<string, string>;
  obrigatorio?: boolean;
  min?: number;
  max?: number;
  maxLen?: number;
  somenteLeitura?: boolean; // preenchido pelo banco ou pela automação
  padrao?: string; // valor inicial ao criar
  ajuda?: string;
};

export type Filtro =
  | { tipo: "opcoes"; nome: string; rotulo: string; opcoes: Record<string, string> }
  | { tipo: "simnao"; nome: string; rotulo: string };

export type Tabela = {
  slug: string;
  titulo: string;
  singular: string;
  tabela: keyof Database["public"]["Tables"]; // nome conferido pelos tipos gerados do banco
  chave: string; // coluna que identifica a linha
  ordem: string; // coluna da ordem padrão (mais recente primeiro)
  lista: string[]; // colunas que aparecem na lista (além do paciente)
  ordenaveis: string[];
  campos: Campo[];
  filtros: Filtro[];
  podeCriar: boolean;
  descricao: string;
};

const SIM_NAO = { sim: "Sim", nao: "Não" };
const AGUA = { menos_1l: "Menos de 1 L", "1_2l": "1 a 2 L", "2_3l": "2 a 3 L", mais_3l: "Mais de 3 L" };
const BRISTOL = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), `Tipo ${n}`]));
const EVACUACAO = {
  mais_1x_dia: "Mais de uma vez por dia", "1x_dia": "Uma vez por dia", "3_6x_semana": "3 a 6 vezes por semana",
  "1_2x_semana": "1 a 2 vezes por semana", menos: "Menos de uma vez por semana",
};
const TREINO = { "0": "Não treina", "1-2": "1 a 2 vezes", "3-4": "3 a 4 vezes", "5+": "5 vezes ou mais" };
const REFEICOES = { cafe: "Café da manhã", almoco: "Almoço", lanches: "Lanches", jantar: "Jantar", fim_de_semana: "Fim de semana", nenhuma: "Nenhuma" };
const MOTIVOS = { fome: "Fome", emocional: "Emocional", social: "Social", tempo: "Falta de tempo", vontade: "Vontade", outro: "Outro" };
const SINTOMAS_GI = { azia: "Azia", dor: "Dor", gases: "Gases", inchaco: "Inchaço", incompleta: "Evacuação incompleta", nenhum: "Nenhum" };
const FOME = { ok: "Ok", passando_fome: "Passando fome", sobrando: "Sobrando comida" };
const DESLIZES = { nenhuma: "Nenhum", "1_2": "1 ou 2", "3_5": "3 a 5", mais_5: "Mais de 5" };
const ENERGIA = { baixa: "Baixa", normal: "Normal", alta: "Alta" };

const paciente: Campo = { col: "profile_id", rotulo: "Paciente", tipo: "paciente", obrigatorio: true };
const criado: Campo = { col: "created_at", rotulo: "Recebido em", tipo: "datahora", somenteLeitura: true };
const avisado: Campo = { col: "avisado_em", rotulo: "Aviso enviado a você em", tipo: "datahora", somenteLeitura: true };
const consentimento: Campo[] = [
  { col: "consentimento", rotulo: "Deu consentimento", tipo: "booleano" },
  { col: "consentimento_em", rotulo: "Consentimento em", tipo: "datahora" },
  { col: "versao_consentimento", rotulo: "Versão do termo", tipo: "texto", maxLen: 40 },
];

export const TABELAS: Tabela[] = [
  {
    slug: "acompanhamentos",
    titulo: "Acompanhamentos",
    singular: "acompanhamento",
    tabela: "acompanhamentos",
    chave: "profile_id",
    ordem: "proximo_checkin",
    descricao: "Um por paciente. Ao preencher o início, o banco ativa o acompanhamento e marca o 1º check-in para 15 dias depois.",
    lista: ["ativo", "pausado", "inicio_acompanhamento", "proximo_checkin", "ultima_resposta", "lembretes_enviados"],
    ordenaveis: ["inicio_acompanhamento", "proximo_checkin", "ultima_resposta"],
    campos: [
      paciente,
      { col: "inicio_acompanhamento", rotulo: "Início", tipo: "data" },
      { col: "ativo", rotulo: "Ativo", tipo: "booleano" },
      { col: "pausado", rotulo: "Pausado", tipo: "booleano", ajuda: "Pausado não recebe check-ins." },
      { col: "proximo_checkin", rotulo: "Próximo check-in", tipo: "data" },
      { col: "ultimo_envio", rotulo: "Último envio do check-in", tipo: "data" },
      { col: "ultima_resposta", rotulo: "Última resposta", tipo: "datahora" },
      { col: "lembretes_enviados", rotulo: "Lembretes enviados", tipo: "inteiro", min: 0, max: 2, obrigatorio: true, padrao: "0" },
      { col: "created_at", rotulo: "Criado em", tipo: "datahora", somenteLeitura: true },
      { col: "updated_at", rotulo: "Alterado em", tipo: "datahora", somenteLeitura: true },
    ],
    filtros: [
      { tipo: "opcoes", nome: "situacao", rotulo: "Situação", opcoes: { ativo: "Em acompanhamento", pausado: "Pausado", sem_inicio: "Sem início" } },
      { tipo: "simnao", nome: "atrasado", rotulo: "Check-in atrasado" },
    ],
    podeCriar: true,
  },
  {
    slug: "pre-formularios",
    titulo: "Pré-formulários",
    singular: "pré-formulário",
    tabela: "pre_formularios",
    chave: "id",
    ordem: "created_at",
    descricao: "Enviados pelo site junto com o cadastro.",
    lista: ["created_at", "objetivo", "alertas", "revisar"],
    ordenaveis: ["created_at"],
    campos: [
      paciente,
      { col: "enviado_em", rotulo: "Enviado em", tipo: "datahora" },
      { col: "objetivo", rotulo: "Objetivo", tipo: "opcoes", opcoes: OBJETIVOS },
      { col: "peso_kg", rotulo: "Peso (kg)", tipo: "numero", min: 20, max: 400 },
      { col: "altura_cm", rotulo: "Altura (cm)", tipo: "inteiro", min: 50, max: 250 },
      { col: "treino_freq", rotulo: "Treinos por semana", tipo: "opcoes", opcoes: TREINO },
      { col: "modalidade", rotulo: "Modalidade", tipo: "texto", maxLen: 300 },
      { col: "tentativas", rotulo: "Tentativas anteriores", tipo: "textolongo", maxLen: 3000 },
      { col: "origem", rotulo: "Como conheceu", tipo: "texto", maxLen: 60 },
      { col: "alertas", rotulo: "Alertas de saúde", tipo: "lista", opcoes: ALERTAS },
      { col: "revisar", rotulo: "Revisar antes da consulta", tipo: "booleano" },
      { col: "scoff_sim", rotulo: "SCOFF (respostas sim)", tipo: "inteiro", min: 0, max: 5 },
      { col: "saude", rotulo: "Saúde (respostas)", tipo: "json" },
      { col: "responsavel", rotulo: "Responsável (menores)", tipo: "json" },
      ...consentimento,
      avisado,
      { col: "importado_de", rotulo: "Importado da planilha", tipo: "texto", somenteLeitura: true },
      criado,
    ],
    filtros: [
      { tipo: "opcoes", nome: "objetivo", rotulo: "Objetivo", opcoes: OBJETIVOS },
      { tipo: "simnao", nome: "alerta", rotulo: "Com alerta ou revisar" },
    ],
    podeCriar: true,
  },
  {
    slug: "anamneses",
    titulo: "Anamneses",
    singular: "anamnese",
    tabela: "anamneses",
    chave: "id",
    ordem: "created_at",
    descricao: "Questionário completo enviado pelo paciente antes da consulta.",
    lista: ["created_at", "bristol", "agua"],
    ordenaveis: ["created_at", "bristol"],
    campos: [
      paciente,
      { col: "enviado_em", rotulo: "Enviada em", tipo: "datahora" },
      { col: "bristol", rotulo: "Bristol", tipo: "opcoes", opcoes: BRISTOL },
      { col: "agua", rotulo: "Água por dia", tipo: "opcoes", opcoes: AGUA },
      { col: "respostas", rotulo: "Respostas completas", tipo: "json" },
      ...consentimento,
      avisado,
      { col: "importado_de", rotulo: "Importada da planilha", tipo: "texto", somenteLeitura: true },
      criado,
    ],
    filtros: [{ tipo: "opcoes", nome: "agua", rotulo: "Água por dia", opcoes: AGUA }],
    podeCriar: true,
  },
  {
    slug: "checkins",
    titulo: "Check-ins",
    singular: "check-in",
    tabela: "checkins",
    chave: "id",
    ordem: "created_at",
    descricao: "Respostas dos check-ins de 15 dias. Um check-in novo marca o próximo para daqui a 15 dias.",
    lista: ["created_at", "adesao", "alerta", "quer_contato"],
    ordenaveis: ["created_at", "adesao"],
    campos: [
      paciente,
      { col: "enviado_em", rotulo: "Enviado em", tipo: "datahora" },
      { col: "adesao", rotulo: "Adesão (0 a 10)", tipo: "inteiro", min: 0, max: 10, obrigatorio: true },
      { col: "refeicoes_dificeis", rotulo: "Refeições difíceis", tipo: "lista", opcoes: REFEICOES },
      { col: "fome", rotulo: "Fome", tipo: "opcoes", opcoes: FOME },
      { col: "deslizes", rotulo: "Deslizes", tipo: "opcoes", opcoes: DESLIZES },
      { col: "deslize_motivo", rotulo: "Motivo dos deslizes", tipo: "lista", opcoes: MOTIVOS },
      { col: "agua", rotulo: "Água por dia", tipo: "opcoes", opcoes: AGUA },
      { col: "freq_evacuacao", rotulo: "Evacuação", tipo: "opcoes", opcoes: EVACUACAO },
      { col: "bristol", rotulo: "Bristol", tipo: "opcoes", opcoes: BRISTOL },
      { col: "sintomas_gi", rotulo: "Sintomas gastrointestinais", tipo: "lista", opcoes: SINTOMAS_GI },
      { col: "alerta", rotulo: "Sinais de alarme", tipo: "lista", opcoes: ALERTAS },
      { col: "energia", rotulo: "Energia", tipo: "opcoes", opcoes: ENERGIA },
      { col: "peso_kg", rotulo: "Peso (kg)", tipo: "numero", min: 20, max: 400 },
      { col: "recado", rotulo: "Recado", tipo: "textolongo", maxLen: 3000 },
      { col: "quer_contato", rotulo: "Quer contato", tipo: "booleano" },
      avisado,
      { col: "importado_de", rotulo: "Importado da planilha", tipo: "texto", somenteLeitura: true },
      criado,
    ],
    filtros: [
      { tipo: "simnao", nome: "alerta", rotulo: "Com sinal de alarme" },
      { tipo: "simnao", nome: "contato", rotulo: "Quer contato" },
    ],
    podeCriar: true,
  },
  {
    slug: "observacoes",
    titulo: "Observações internas",
    singular: "observação",
    tabela: "notas_internas",
    chave: "id",
    ordem: "updated_at",
    descricao: "Anotações que só você vê: a observação geral de cada paciente e os avisos automáticos dos check-ins.",
    lista: ["texto", "checkin_id", "updated_at"],
    ordenaveis: ["updated_at", "created_at"],
    campos: [
      paciente,
      { col: "checkin_id", rotulo: "Check-in (número)", tipo: "inteiro", min: 1, ajuda: "Deixe vazio para a observação geral do paciente." },
      { col: "texto", rotulo: "Texto", tipo: "textolongo", obrigatorio: true, maxLen: 5000 },
      { col: "created_at", rotulo: "Criada em", tipo: "datahora", somenteLeitura: true },
      { col: "updated_at", rotulo: "Alterada em", tipo: "datahora", somenteLeitura: true },
    ],
    filtros: [{ tipo: "simnao", nome: "de_checkin", rotulo: "Aviso de check-in" }],
    podeCriar: true,
  },
];

export const tabelaPorSlug = (slug: string) => TABELAS.find((t) => t.slug === slug);
export const campo = (t: Tabela, col: string) => t.campos.find((c) => c.col === col)!;
// Lista explícita de colunas (nunca "*": algumas colunas antigas ficam ocultas no banco).
export const colunas = (t: Tabela) => [...new Set([t.chave, ...t.campos.map((c) => c.col), "deleted_at"])].join(",");
