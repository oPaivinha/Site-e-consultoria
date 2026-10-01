# Mensagens automáticas — Paiva Nutri (modelo)

Textos prontos para colar no n8n/Make e no WhatsApp Business. Troque o que está entre `{{chaves}}` por variáveis do seu fluxo.

**Variáveis usadas**
`{{nome}}` primeiro nome · `{{link_anamnese}}` · `{{link_agenda}}` · `{{data_consulta}}` · `{{hora_consulta}}` · `{{link_pagamento}}` · `{{valor}}` · `{{vencimento}}` · `{{seu_nome}}`

## Regras de ouro (antes de usar)

1. **Consentimento para receber mensagens.** Registre no pré-formulário que a pessoa aceita receber lembretes e check-ins por WhatsApp. Toda mensagem automática deve permitir sair: "Responda PAUSAR para parar de receber".
2. **API oficial e janela de 24h.** Na API oficial do WhatsApp, mensagens que você inicia fora da janela de 24h após a última resposta do paciente precisam ser *templates* aprovados pela Meta. Os textos abaixo foram escritos como mensagens de utilidade (lembrete, cobrança, acompanhamento do serviço contratado). Evite tom de promoção para não cair em categoria de marketing, que é mais cara. Confira as categorias e preços vigentes na época do lançamento.
3. **Sem promessa de resultado.** Nada de "você vai perder X kg". Fale de processo e acompanhamento.
4. **Saída de segurança.** Check-ins que perguntam sobre sintomas devem sempre lembrar de procurar atendimento médico se houver algo forte.
5. **Dados sensíveis.** Respostas sobre intestino e adesão são dados de saúde: guarde apenas onde você controla o acesso.

---

## 1. Jornada de entrada

### 1.1 Boas-vindas (após o pré-formulário aprovado)
> Oi, {{nome}}! Aqui é {{seu_nome}}, nutricionista. Recebi o seu pré-formulário, obrigado por confiar em mim. 😊
>
> O próximo passo é escolher o horário da sua consulta: {{link_agenda}}
>
> Se tiver qualquer dúvida, é só responder aqui.

### 1.2 Confirmação de pagamento + anamnese
> Pagamento confirmado, {{nome}}! ✅ Sua consulta está marcada para {{data_consulta}} às {{hora_consulta}}.
>
> Antes da consulta, preencha a anamnese (leva uns 15 minutos): {{link_anamnese}}
>
> Quanto mais completa, mais personalizado fica o seu plano. Pode responder pelo celular.

### 1.3 Anamnese pendente (48h depois, se não preenchida)
> Oi, {{nome}}! Passando para lembrar da anamnese: {{link_anamnese}}
>
> Ela precisa estar preenchida até a véspera da consulta ({{data_consulta}}) para eu conseguir me preparar. Precisa de ajuda com alguma pergunta?

### 1.4 Lembrete de consulta (24h antes)
> Oi, {{nome}}! Lembrete: sua consulta é amanhã, {{data_consulta}} às {{hora_consulta}}, por videochamada: {{link_consulta}}
>
> Dica: separe um lugar silencioso e, se puder, tenha em mãos peso e altura atualizados. Se precisar remarcar, me avise até hoje.

### 1.5 Lembrete de consulta (1h antes)
> {{nome}}, nossa consulta começa em 1 hora ({{hora_consulta}}). O link é este: {{link_consulta}} Até já! 👋

### 1.6 Falta na consulta (15 min depois do horário)
> Oi, {{nome}}! Estou aqui na sala da consulta e não vi você entrar. Aconteceu algo? Posso te esperar mais alguns minutos ou remarcamos para outro horário.

---

## 2. Pós-consulta e plano

### 2.1 Logo após a consulta
> Foi um prazer conversar com você, {{nome}}! Vou montar o seu plano alimentar com tudo o que conversamos e envio em até 5 dias. Se lembrar de algo que esqueceu de comentar, pode me mandar por aqui.

### 2.2 Entrega do plano
> {{nome}}, seu plano alimentar está pronto! 🎉 Segue o arquivo.
>
> Algumas orientações:
> • Leia com calma e me chame se algo não fizer sentido ou não couber na sua rotina.
> • Não precisa ser perfeito: o plano existe para ser ajustado.
> • A cada 15 dias eu passo aqui para saber como está indo.

### 2.3 Primeiro retorno do plano (3 dias depois)
> Oi, {{nome}}! Como foram os primeiros dias com o plano? Alguma refeição está difícil de encaixar ou algum alimento você não está conseguindo comprar ou preparar? Me conta, que eu ajusto.

---

## 3. Check-in quinzenal (o coração do acompanhamento)

### 3.1 Mensagem principal (enviar a cada 15 dias)
> Oi, {{nome}}! Hora do nosso check-in quinzenal. 😊 Responda numa mensagem só, do jeito que preferir (pode ser por áudio):
>
> 1️⃣ **Intestino:** como está funcionando? (vai todo dia? fezes duras, normais ou moles? algum desconforto?)
> 2️⃣ **Adesão ao plano:** de 0 a 10, quanto você conseguiu seguir?
> 3️⃣ **Deslizes:** teve algum? Qual foi a situação (festa, estresse, falta de tempo...)?
> 4️⃣ **Energia e treino:** como se sentiu nos treinos e no dia a dia?
> 5️⃣ **Dificuldade:** o que mais atrapalhou nesses dias?
>
> Não precisa ser perfeito: o objetivo é eu entender como ajustar o plano para você. ⚠️ Se tiver algum sintoma forte (dor intensa, sangue nas fezes, febre, tontura), procure atendimento médico e me avise depois.

### 3.2 Lembrete se não responder (48h depois)
> Oi, {{nome}}! Sei que a rotina aperta. Quando puder, me responde o check-in com o que der, mesmo que seja só a nota de 0 a 10 da adesão. Assim consigo te acompanhar melhor. 😉

### 3.3 Segundo lembrete (5 dias depois do primeiro)
> {{nome}}, ainda não recebi seu check-in. Aconteceu algo ou está difícil seguir o plano? Prefere que a gente converse por ligação rápida? Estou aqui para ajustar.

### 3.4 Respostas-modelo (você escolhe e adapta, não automatize sem revisão)

**Adesão alta (8–10):**
> Que ótimo, {{nome}}! Boa consistência. Vou observar sua evolução e na nossa próxima consulta vemos o que ajustar.

**Adesão média (5–7):**
> Obrigado pela sinceridade, {{nome}}. É normal ter altos e baixos. Me conta qual refeição está mais complicada que eu adapto o plano para facilitar.

**Adesão baixa (0–4) ou duas semanas seguidas ≤ 5:**
> Obrigado por contar, {{nome}}. Quando a adesão cai, quase sempre o plano precisa de ajuste, e não você. Vamos conversar? Posso te ligar hoje ou amanhã, qual horário fica melhor?

**Intestino preso:**
> Obrigado por avisar. Vamos ajustar fibras e hidratação. Enquanto isso, tente manter a água ao longo do dia e a rotina de horários. Se passar de alguns dias sem evacuar ou tiver dor, procure um médico.

**Deslize relatado:**
> Tudo bem, {{nome}}, deslize faz parte. O que importa é a próxima refeição. Quer pensar comigo como lidar com essa situação da próxima vez?

---

## 4. Retorno mensal e renovação

### 4.1 Aviso de retorno (3 dias antes)
> Oi, {{nome}}! Nosso retorno mensal é em 3 dias, {{data_consulta}} às {{hora_consulta}}. Se puder, me envie até lá: peso atual, uma foto das suas refeições de um dia comum e como você tem se sentido. Link: {{link_consulta}}

### 4.2 Atualização do plano
> {{nome}}, ajustei seu plano com base no nosso retorno. Segue o novo arquivo. As mudanças principais: {{resumo_mudancas}}. Qualquer dúvida, me chame!

### 4.3 Aviso de renovação (no início do 3º mês)
> Oi, {{nome}}! Você está chegando ao fim do seu plano trimestral. Foi bom acompanhar sua evolução até aqui. Se quiser continuar com o acompanhamento, me avise que renovamos com {{valor}}/mês e já marcamos a próxima consulta. Se preferir pausar, tudo bem também.

### 4.4 Encerramento sem renovação
> Obrigado por ter me escolhido para te acompanhar, {{nome}}! Foi um prazer. Se precisar voltar, minha agenda estará aberta. Tudo de bom! 💚

---

## 5. Cobrança educada (mensal, via Pix/Mercado Pago)

### 5.1 Aviso 3 dias antes
> Oi, {{nome}}! Passando para avisar que a mensalidade do seu acompanhamento vence em {{vencimento}} ({{valor}}). Link para pagamento: {{link_pagamento}} Qualquer dúvida, me chame.

### 5.2 No dia do vencimento
> {{nome}}, hoje vence a mensalidade do acompanhamento ({{valor}}): {{link_pagamento}} Se já pagou, desconsidere. Obrigado!

### 5.3 3 dias após o vencimento
> Oi, {{nome}}! Não identifiquei o pagamento da mensalidade que venceu em {{vencimento}}. Pode ser que tenha passado batido. Segue o link: {{link_pagamento}} Se houver algum imprevisto, me conta que a gente conversa.

### 5.4 7 dias após o vencimento (último aviso)
> {{nome}}, a mensalidade de {{vencimento}} continua em aberto. Preciso manter o acompanhamento em dia para seguir com os ajustes no plano. Podemos resolver hoje? Link: {{link_pagamento}}

---

## 6. Mensagens de apoio

### 6.1 Lembrete de hidratação / registro (opcional, 1–2x por semana)
> {{nome}}, dica rápida da semana: separe sua garrafa de água logo cedo e anote uma refeição por dia no celular. Pequenas rotinas sustentam o resultado. 💧

### 6.2 Mensagem de ausência (WhatsApp Business)
> Olá! Aqui é {{seu_nome}}, nutricionista. No momento estou fora do horário de atendimento (seg. a sex., {{horario}}). Respondo assim que possível. Se tiver sintomas fortes, procure atendimento médico.

### 6.3 Resposta para PAUSAR/SAIR
> Tudo certo, {{nome}}, parei os lembretes automáticos. Se quiser voltar, é só me avisar por aqui. Seguimos com o acompanhamento normalmente nas consultas.

---

## 7. Notificações para você (nutricionista)

Mensagens internas que o n8n manda para o seu WhatsApp ou e-mail:

| Gatilho | Texto |
|---|---|
| Novo pré-formulário aprovado | "Novo lead: {{nome}}, objetivo {{objetivo}}. Enviar link de agenda." |
| Pré-formulário barrado na triagem | "Triagem encerrou um lead (sem dados armazenados)." |
| Pagamento confirmado | "{{nome}} pagou. Consulta {{data_consulta}}. Anamnese enviada." |
| Anamnese não preenchida 24h antes | "{{nome}} ainda não preencheu a anamnese. Consulta amanhã." |
| Plano para entregar | "Plano de {{nome}} vence em 2 dias (consulta {{data_consulta}})." |
| Plano para atualizar | "Retorno mensal de {{nome}} em 7 dias: atualizar plano." |
| Check-in sem resposta | "{{nome}} não respondeu o check-in há 5 dias." |
| Adesão baixa | "{{nome}} reportou adesão ≤ 5 duas vezes seguidas. Entrar em contato." |
| Sintoma de alerta citado | "{{nome}} mencionou sintoma forte no check-in. Ligar hoje." |
| Pagamento atrasado | "Mensalidade de {{nome}} atrasada há {{dias}} dias." |
| Fim do trimestre | "{{nome}} termina o plano em 15 dias. Oferecer renovação." |

---

## 8. Calendário de envio sugerido (por paciente)

| Momento | Mensagem |
|---|---|
| Dia 0 (pré-formulário aprovado) | 1.1 |
| Pagamento | 1.2 |
| +48h sem anamnese | 1.3 |
| 24h antes da consulta | 1.4 |
| 1h antes | 1.5 |
| Pós-consulta | 2.1 |
| Até 5 dias | 2.2 |
| +3 dias do plano | 2.3 |
| A cada 15 dias | 3.1 (e 3.2/3.3 se necessário) |
| 3 dias antes do retorno mensal | 4.1 |
| Mensalidade | 5.1 a 5.4 |
| Mês 3 | 4.3 |
