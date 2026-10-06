# Checklist final: Supabase + painel

Marque conforme for fazendo. O passo a passo detalhado de cada item está no [LEIA-ME.md](LEIA-ME.md).

## Feito
- [x] **Criar o projeto e copiar URL e chave anon.** Projeto `paiva-nutri`. A URL e a chave publishable já estão no `config.js` do site e na Vercel do painel.
- [x] **Rodar as migrações em ordem.** `0001_inicial.sql`, depois `0002_painel_admin.sql`, depois `0003_admin_pacientes.sql`. Todas já estão aplicadas no banco. (A thread de pagamentos aplicou a `0004_pagamentos.sql` por conta dela.)
- [x] **Primeiro admin.** Sua conta (gpaivan@hotmail.com) já está na tabela `admins`.
- [x] **Chave secreta só no painel.** `SUPABASE_SERVICE_ROLE_KEY` está na Vercel do projeto do painel e em nenhum outro lugar.

## Conferir no Supabase (Authentication)
- [ ] **Confirm email ligado.** Sign In / Providers > Email > Confirm email ativado e senha mínima `8`.
- [ ] **URL Configuration.**
  - Site URL: `https://paivanutri.vercel.app/`
  - Redirect URLs (as quatro):
    - `https://paivanutri.vercel.app/**` (site no ar)
    - `https://site-e-consultoria.vercel.app/**` (painel no ar)
    - `http://localhost:3000/**` (painel no seu computador)
    - `http://localhost:8000/**` (site no seu computador, se usar)
- [ ] **E-mails em português.** Emails > Templates. Os modelos prontos estão no fim do LEIA-ME (confirmar cadastro, convite, redefinir senha, trocar e-mail).

## Antes de atender pacientes reais
- [ ] **SMTP próprio (recomendado).** Gmail com senha de app, conforme o passo 4 do LEIA-ME. Sem isso, o Supabase só entrega e-mail para você e manda poucos por hora. Isso inclui os convites da importação de CSV.
- [ ] Recriar o projeto na região de São Paulo (opcional, mais rápido e com os dados no Brasil).
- [ ] Revisão da política de privacidade por um advogado.
