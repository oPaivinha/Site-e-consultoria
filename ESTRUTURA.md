# Estrutura do site (Paiva Nutri)

Site estático (HTML/CSS/JS puro, sem build). Pode ser hospedado de graça em GitHub Pages, Netlify ou Cloudflare Pages.

## Páginas
| Página | Para quê | Estado |
|---|---|---|
| index.html | Landing: proposta, como funciona, plano, sobre, FAQ | Pronta, faltam dados reais |
| formulario.html | Pré-formulário com triagem (porta de entrada). A última etapa cria a conta (e-mail e senha) | Pronta |
| anamnese.html | Anamnese completa, enviada após pagamento. Exige login | Pronta |
| checkin.html | Check-in quinzenal. Exige login | Pronta |
| entrar.html | Login | Pronta |
| esqueci-senha.html, nova-senha.html | Recuperar e trocar a senha (também usada no convite da importação) | Pronta |
| auth/callback.html | Para onde o link de confirmação do e-mail leva | Pronta |
| perfil.html | "Meu perfil": status do acompanhamento, pagamento, editar dados, histórico de check-ins, sair | Pronta |
| pagamento.html | Escolha do plano e pagamento (Mercado Pago, Pix ou cartão), depois da anamnese. Exige login. Guia: [supabase/PAGAMENTOS.md](supabase/PAGAMENTOS.md) | Pronta, falta Hugo ligar o Mercado Pago |
| privacidade.html | Política LGPD | Rascunho, precisa revisão jurídica |

## Chamadas para ação
Todas as CTAs ("Quero começar") levam ao pré-formulário (os botões dos planos levam `?plano=<id>`). Depois: confirmação do e-mail → anamnese → pagamento (`pagamento.html`) → agendamento (config.schedulingUrl) → consulta → check-ins quinzenais.

## Integrações (config.js)
- supabaseUrl e supabaseAnonKey: banco de dados e login (Supabase). Vazios = modo demonstração. Passo a passo em [supabase/LEIA-ME.md](supabase/LEIA-ME.md).
- schedulingUrl: Cal.com/Calendly.
- whatsapp: número profissional.

## Pendências (dependem do Hugo)
- Nome da marca, nome da nutricionista, CRN, Instagram, WhatsApp, foto, texto "Sobre mim".
- Oferta (Hugo, 02/10/2026): Mensal R$190/mês, Trimestral R$170/mês, Anual R$150/mês. Preço só na tela de pagamento.
- Dados da política de privacidade.
- Onde hospedar e se cria repositório no GitHub.

## Triagem e anamnese (decisões do Hugo, 01/10/2026)
Especificação: /mnt/project-files/triagem/revisao-triagem-anamnese.md. Aplicado em 01/10/2026.

**Pré-formulário** (`formulario.html` + `form.js`)
- Nenhuma resposta de saúde encerra o formulário. Cada "sim" tem um "Qual?" opcional; diabetes pergunta se usa insulina.
- SCOFF (5 perguntas) na etapa de saúde, escondido para menores de 12. 2+ "sim" gera o alerta `scoff_positivo`.
- Menores de 18: etapa extra "Responsável legal" (nome, parentesco, WhatsApp, e-mail, autorização obrigatória). Para menores de 12 pergunta também se o responsável estará na consulta.
- Consentimento separado: uso dos dados (obrigatório) e check-ins por WhatsApp (opcional, `aceita_checkin`).
- Envio (JSON, Content-Type text/plain): `aceita_checkin`, `consentimento_em`, `saude{item:{resposta,qual}}`, `scoff_sim`, `alertas[]`, `revisar`, `menor`, `responsavel{nome,parentesco,whatsapp,email,presente_na_consulta,consentimento}`.
- Com `revisar: true`, a tela final avisa que o caso será avaliado antes do agendamento e esconde o botão de agendar.

**Anamnese** (`anamnese.html` + `anamnese.js`)
- Caixa de consentimento na etapa 1. Perguntas novas da seção 2 (doenças e cirurgias, hormônios, sintomas gerais, envio de exames, histórico de peso, cafeína, adoçante, horário de fome, mastigação, consumo da casa).
- Intestino na Escala de Bristol (`bristol` 1 a 7), igual ao check-in. Água usa as mesmas faixas.
- Link do paciente: `anamnese.html` (pede login). Sexo e idade vêm do perfil: masculino esconde o ciclo menstrual; idade < 12 mostra as perguntas para crianças (escola, quem decide, curva de crescimento). Em modo demonstração aceita `?s=<feminino|masculino>&idade=<anos>`.

**Política**: seção 9 reescrita, nova seção 10 (crianças e adolescentes). `consentVersion` passou para `2026-10-v2`.

## Dados e login (Supabase, 02/10/2026)
- Os dados saíram da Planilha Google e foram para o Supabase (plano grátis). Tabelas e regras de acesso em `supabase/migrations/0001_inicial.sql`.
- Cada paciente só vê e edita os próprios dados (RLS). A nutri vê tudo pelo painel do Supabase (Table Editor).
- Cadastro: o pré-formulário vira o cadastro; as respostas vão em `signUp({ options: { data } })` e o trigger `handle_new_user` grava `profiles`, `acompanhamentos` e `pre_formularios`. Menores: a conta fica no e-mail do responsável.
- Confirmação de e-mail obrigatória. Os links usam o fluxo "implicit" para funcionar mesmo abertos em outro aparelho.
- O cliente oficial `@supabase/supabase-js` fica em `vendor/supabase.js` (cópia do pacote npm, versão 2.117.2), porque o site não tem build.
- Automação do check-in: `supabase/apps-script/Code.gs` (lê o Supabase com a service_role guardada nas Propriedades do script).
- Importação da planilha antiga: `scripts/importar_excel.mjs`, roda só no computador da nutri.
