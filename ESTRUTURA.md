# Estrutura do site (NutriForma, nome provisório)

Site estático (HTML/CSS/JS puro, sem build). Pode ser hospedado de graça em GitHub Pages, Netlify ou Cloudflare Pages.

## Páginas
| Página | Para quê | Estado |
|---|---|---|
| index.html | Landing: proposta, como funciona, plano, sobre, FAQ | Pronta, faltam dados reais |
| formulario.html | Pré-formulário com triagem (porta de entrada) | Pronta; integração com a thread de triagem |
| anamnese.html | Anamnese completa, enviada após pagamento | Pronta; integração com a thread de triagem |
| checkin.html | Check-in quinzenal (`checkin.html?p=<codigo>`); cópia de /automacoes, que é a dona do arquivo | Pronta |
| privacidade.html | Política LGPD | Rascunho, precisa revisão jurídica |

## Chamadas para ação
Todas as CTAs ("Quero começar") levam ao pré-formulário. Depois: agendamento (config.schedulingUrl) → pagamento → anamnese → consulta → check-ins quinzenais (thread de automações).

## Integrações (config.js)
- webhookUrl: recebe pré-formulário e anamnese (n8n/Make). Vazio = modo demonstração.
- schedulingUrl: Cal.com/Calendly.
- whatsapp: número profissional.

## Pendências (dependem do Hugo)
- Nome da marca, nome da nutricionista, CRN, Instagram, WhatsApp, foto, texto "Sobre mim".
- Confirmar oferta: R$150/mês, plano de 3 meses.
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
- Link do paciente: `anamnese.html?p=<codigo>&s=<feminino|masculino>&idade=<anos>`. `p` vai no envio como `codigo`; `s=masculino` esconde o ciclo menstrual; `idade` < 12 mostra as perguntas para crianças (escola, quem decide, curva de crescimento). Sem parâmetros, mostra tudo menos o bloco infantil.

**Política**: seção 9 reescrita, nova seção 10 (crianças e adolescentes). `consentVersion` passou para `2026-10-v2`.
