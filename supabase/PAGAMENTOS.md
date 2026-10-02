# Pagamentos (Mercado Pago)

## Como funciona para o paciente
1. Escolhe o plano na página inicial (o botão leva a `formulario.html?plano=mensal` ou `?plano=anual`; o plano fica guardado no navegador).
2. Faz o pré-formulário (cadastro), confirma o e-mail e responde a anamnese.
3. No fim da anamnese aparece **Ir para o pagamento** (também em "Meu perfil"). A tela `pagamento.html` mostra os planos, o valor, o resumo, como funciona e a regra de cancelamento.
4. O botão abre a página segura do Mercado Pago (Pix ou cartão). Os dados do cartão nunca passam pelo site.
5. Ao pagar, o Mercado Pago volta para `pagamento.html`, que mostra "Pagamento confirmado" e o botão de agendar (se `schedulingUrl` estiver no `config.js`).

Quem teve alerta de saúde no pré-formulário (`revisar`) só vê o pagamento depois que você clicar em **Liberar pagamento** na ficha do paciente, no painel.

## Onde fica cada coisa
| Peça | Arquivo | O que faz |
|---|---|---|
| Tabelas | `supabase/migrations/0004_pagamentos.sql` | `precos` (valor de cada plano), `pagamentos` (cada tentativa), `liberacoes_pagamento` |
| Criar o pagamento | `supabase/functions/mp-checkout` | Confere login, anamnese e liberação; pega o valor no banco; cria a cobrança no Mercado Pago |
| Aviso do Mercado Pago | `supabase/functions/mp-webhook` | Recebe o aviso, consulta o pagamento na API do Mercado Pago e atualiza `pagamentos` |
| Tela do paciente | `pagamento.html`, `pagamento.js`, `pagamento.css` | Escolha do plano e situação do pagamento |
| Painel | `admin/app/(painel)/pagamentos` e ficha do paciente | Preços, lista de pagamentos, liberar pagamento |

O valor cobrado vem **sempre** da tabela `precos` (editável no painel, em Pagamentos). O `planos.js` continua com nome, descrição e duração dos planos.

## O que você (Hugo) precisa fazer, uma vez
Nunca mande senhas, chaves ou dados bancários no chat. Tudo abaixo é feito por você, nos sites do Mercado Pago e do Supabase.

1. **Conta Mercado Pago**: crie (ou use a sua) em mercadopago.com.br. Pode ser no CPF.
2. **Seu banco**: no app do Mercado Pago, cadastre sua conta bancária ou chave Pix para transferir o dinheiro recebido. O dinheiro das vendas cai na conta Mercado Pago e você transfere para o banco.
3. **Credenciais**: em mercadopago.com.br/developers, entre em **Suas integrações**, crie uma aplicação (tipo "Pagamentos online", produto Checkout Pro). Em **Credenciais de teste** copie o **Access Token**.
4. **Guardar no Supabase**: Supabase > projeto paiva-nutri > **Edge Functions > Secrets** > adicione `MP_ACCESS_TOKEN` com o Access Token. (Opcional: `SITE_URL` se o endereço do site mudar.)
5. **Avisos (webhook)**: na mesma aplicação do Mercado Pago, em **Webhooks**, cole a URL
   `https://blmxwpjovsyglnwsklkp.supabase.co/functions/v1/mp-webhook`, marque o evento **Pagamentos** e salve. Copie a **assinatura secreta** e adicione no Supabase como `MP_WEBHOOK_SECRET`.
6. **Testar**: com as credenciais de teste, faça um cadastro de teste, a anamnese e pague usando os cartões de teste do Mercado Pago (aparecem na documentação dele). O pagamento deve aparecer em Painel > Pagamentos.
7. **Valendo**: troque o `MP_ACCESS_TOKEN` pelo Access Token de **produção** e refaça o passo 5 no modo produção.

Os menus do Mercado Pago mudam de nome de vez em quando; se algum não bater, procure por "Credenciais" e "Webhooks" dentro da sua aplicação.

## Antes de cobrar pacientes de verdade
- **Hospedagem**: o plano grátis da Vercel (Hobby) não permite uso comercial. Mover o site (por exemplo para Cloudflare Pages, grátis) antes de cobrar. Se o endereço mudar, atualize `SITE_URL` no Supabase.
- **Política de cancelamento** na tela de pagamento e a política de privacidade passam pela revisão do advogado.
- **Nota fiscal / recibo**: o Mercado Pago manda o comprovante; nota fiscal de serviço depende da sua situação (autônomo ou CNPJ). Vale conversar com um contador.

## Detalhes técnicos
- As duas funções foram publicadas com `verify_jwt = false` (`supabase/config.toml`). A `mp-checkout` confere o login no código com `auth.getUser`; a `mp-webhook` não confia no aviso: busca o pagamento na API do Mercado Pago com o Access Token, e confere a assinatura `x-signature` quando `MP_WEBHOOK_SECRET` existe.
- Valor pago menor que o da tabela vira `em_analise` em vez de `aprovado`.
- Situações: `pendente` (abriu e não concluiu), `em_analise`, `aprovado`, `recusado`, `cancelado`, `devolvido`. O painel esconde `pendente` e `cancelado`.
- Pacientes só leem os próprios pagamentos; quem grava é a função com a chave secreta. Admin pode tudo (com auditoria).
- Para publicar as funções de novo: `supabase functions deploy mp-checkout mp-webhook` (ou pelo conector do Supabase).
