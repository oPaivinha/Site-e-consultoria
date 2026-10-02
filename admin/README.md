# Painel Paiva Nutri

Painel de administração do site. Mostra e gerencia os dados do Supabase (pacientes, pré-formulários, anamneses e check-ins). Só entra quem está na tabela `admins`.

É um projeto separado do site público, dentro da mesma pasta do repositório.

## Rodar no seu computador
Precisa do Node.js 20 ou mais novo.
```
cd admin
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev
```
Abre em http://localhost:3000.

## Variáveis de ambiente
| Nome | Onde achar | Pode aparecer no navegador? |
|---|---|---|
| `SUPABASE_URL` | Supabase > Project Settings > API Keys | sim |
| `SUPABASE_ANON_KEY` | a chave **publishable** (ou `anon`) | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave **secret** (`service_role`) | **não**, só no servidor |
| `SITE_URL` (opcional) | endereço do site público, usado nos links dos e-mails | sim |

O arquivo `.env.local` nunca vai para o GitHub (está no `.gitignore`).

## Publicar na Vercel (grátis)
O painel é um **segundo projeto** na Vercel, separado do site.
1. **Add New > Project** e importe o mesmo repositório.
2. Em **Root Directory**, escolha a pasta `admin`.
3. Em **Environment Variables**, coloque as variáveis da tabela acima.
4. **Deploy**.

## Criar o primeiro admin
No Supabase, em **SQL Editor**, trocando pelo e-mail da conta:
```sql
insert into public.admins (user_id)
select id from auth.users where email = 'seu-email@exemplo.com'
on conflict do nothing;
```
Depois disso, dá para promover outras pessoas pelo próprio painel.

## Como a segurança funciona
- O login é o mesmo do site (Supabase Auth).
- Antes de abrir qualquer página, o servidor pergunta ao banco `is_admin()`. Quem não é admin é deslogado e vê "Acesso negado". Não é só esconder botões: a verificação é no servidor.
- O banco também protege por conta própria (RLS), então mesmo um erro no painel não expõe dados.
- Toda criação, edição e exclusão feita aqui fica registrada na tabela `audit_log`.
- A chave secreta só é usada no servidor, depois de conferir `is_admin()`, para o que a chave pública não consegue: reenviar confirmação, enviar link de nova senha, desativar e excluir contas.
