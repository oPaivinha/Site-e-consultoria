# Supabase: passo a passo para ligar o banco e o login

Tudo aqui é grátis (plano Free do Supabase, Gmail e Google Apps Script). Siga na ordem.

## 1. Projeto (já criado)
Projeto `paiva-nutri` (região us-east-1): `https://blmxwpjovsyglnwsklkp.supabase.co`.

## 2. Criar as tabelas (já feito em 02/10/2026)
1. Menu **SQL Editor** > **New query**.
2. Cole o conteúdo inteiro de [`migrations/0001_inicial.sql`](migrations/0001_inicial.sql) e clique em **Run**.
3. Em **Table Editor** devem aparecer: `profiles`, `acompanhamentos`, `pre_formularios`, `anamneses`, `checkins`, todas com o selo de RLS ligado.

Pode rodar o arquivo de novo sem problema: ele não apaga nada.

## 3. Configurar o login
Menu **Authentication**:
1. **Sign In / Providers** > **Email**: deixe ligado, com **Confirm email** ativado. Em **Minimum password length**, coloque `8`. Salve.
2. **URL Configuration**:
   - **Site URL**: `https://opaivinha.github.io/Site-e-consultoria/`
   - **Redirect URLs**, adicione: `https://opaivinha.github.io/Site-e-consultoria/**`
3. **Emails** > **Templates**: troque os textos para português (modelos no fim deste arquivo).

## 4. Ligar o envio de e-mails pelo Gmail (obrigatório para pacientes reais)
O e-mail grátis do Supabase só entrega para os e-mails da sua equipe no painel e manda poucos por hora. Para os pacientes receberem o link de confirmação:
1. Na sua conta Google: **Segurança** > ative a **Verificação em duas etapas** > depois **Senhas de app** > crie uma chamada `Supabase`. Copie a senha de 16 letras.
2. No Supabase: **Authentication** > **Emails** > **SMTP Settings** > **Enable custom SMTP**:
   - Sender email: seu Gmail. Sender name: `Paiva Nutri`
   - Host: `smtp.gmail.com`, Port: `465`
   - Username: seu Gmail. Password: a senha de app do passo 1
3. **Authentication** > **Rate Limits**: suba "emails sent per hour" para `30`.

O Gmail permite até 500 e-mails por dia, bem mais do que o consultório precisa.

## 5. Ligar o site (já feito em 02/10/2026)
1. **Project Settings** > **API Keys**: copie a **Project URL** e a chave **publishable** (ou `anon`).
2. Cole em `config.js`, nos campos `supabaseUrl` e `supabaseAnonKey` (ou mande para o Claude fazer isso).

Essas duas são públicas: a chave anon foi feita para ficar no navegador, e quem protege os dados é o RLS. A chave **service_role / secret** é outra coisa: ela vê tudo. Nunca coloque no site, no GitHub nem em mensagens.

## 6. Ligar a automação do check-in (Apps Script)
A automação antiga lia a planilha. A nova ([`apps-script/Code.gs`](apps-script/Code.gs)) lê o Supabase.
1. No Apps Script antigo (da planilha), rode `removerGatilho` para desligar a rotina velha.
2. Em [script.google.com](https://script.google.com), crie um **Novo projeto**, apague o conteúdo e cole o `Code.gs` novo.
3. Engrenagem **Configurações do projeto** > **Propriedades do script** > adicione:
   - `SUPABASE_URL` = a Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = a chave service_role / secret (aqui ela fica protegida na sua conta Google)
4. No topo do `Code.gs`, troque `EMAIL_NUTRI` pelo seu e-mail.
5. Rode `testarConexao` (autorize quando o Google pedir). Depois rode `instalarGatilhos`.

A partir daí: a cada 10 minutos você recebe e-mail de pré-formulário, anamnese e check-in novos (com os sinais de alerta), e todo dia às 8h chega o resumo com os links do WhatsApp. A rotina diária também mantém o projeto Supabase acordado (o plano grátis pausa depois de 7 dias sem uso).

## 7. Importar a planilha antiga (opcional)
Só vale se a planilha tiver pacientes de verdade. Precisa de Node.js instalado no seu computador.
1. Baixe a planilha: Google Sheets > **Arquivo** > **Fazer download** > **Microsoft Excel (.xlsx)**. Salve na pasta do projeto (o `.gitignore` impede que ela vá para o GitHub).
2. Copie `.env.example` para `.env.local` e preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SITE_URL`.
3. No terminal:
   ```
   cd scripts
   npm install
   node importar_excel.mjs "../Paiva Nutri - dados.xlsx"
   ```
   Isso só mostra o que vai acontecer. Se estiver certo, rode de novo com `--aplicar` no fim.

Quem não tem conta recebe um e-mail de convite para criar a senha. Pode rodar quantas vezes quiser: nada é duplicado. A planilha não é alterada.

## No dia a dia
- **Ver pacientes e respostas**: Supabase > **Table Editor**. A anamnese completa fica na coluna `respostas` da tabela `anamneses`.
- **Começar o acompanhamento de alguém**: tabela `acompanhamentos`, preencha `inicio_acompanhamento`. O banco ativa o paciente e marca o 1º check-in para 15 dias depois.
- **Paciente pediu PAUSAR**: tabela `acompanhamentos`, marque `pausado`.
- **Exportar para Excel**: em qualquer tabela, botão **Export** > CSV.
- **Excluir um paciente (pedido LGPD)**: **Authentication** > **Users** > apague o usuário. Todos os dados dele somem junto.

## Modelos de e-mail em português
Cole em **Authentication** > **Emails** > **Templates**. Mantenha o `{{ .ConfirmationURL }}`.

**Confirm signup**: assunto `Confirme seu e-mail | Paiva Nutri`
```html
<h2>Falta só confirmar seu e-mail</h2>
<p>Recebi seu pré-formulário. Para ativar sua conta, clique no link abaixo:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar meu e-mail</a></p>
<p>Se não foi você, ignore este e-mail.</p>
```

**Invite user**: assunto `Seu acesso ao site da Paiva Nutri`
```html
<h2>Seu acesso está pronto</h2>
<p>Agora suas respostas e check-ins ficam no site. Clique no link para criar sua senha:</p>
<p><a href="{{ .ConfirmationURL }}">Criar minha senha</a></p>
```

**Reset password**: assunto `Crie uma senha nova | Paiva Nutri`
```html
<h2>Criar uma senha nova</h2>
<p>Recebemos um pedido para trocar a senha da sua conta. Clique no link abaixo:</p>
<p><a href="{{ .ConfirmationURL }}">Criar senha nova</a></p>
<p>Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
```
