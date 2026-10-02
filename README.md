# Site da consultoria de nutrição

Site estático (HTML, CSS e JavaScript puro, sem build). Abra `index.html` no navegador para ver.

- `index.html`: página inicial
- `formulario.html`: pré-formulário com triagem
- `anamnese.html`: anamnese nutricional
- `checkin.html`: check-in quinzenal do paciente
- `privacidade.html`: política de privacidade (rascunho, revisar antes de usar)
- `entrar.html`, `esqueci-senha.html`, `nova-senha.html`, `auth/callback.html`: login e senha
- `perfil.html`: "Meu perfil" do paciente
- `config.js`: nome, contatos, preço e integrações. É o único arquivo que precisa ser editado.

Os dados e o login ficam no Supabase. Passo a passo para configurar: [supabase/LEIA-ME.md](supabase/LEIA-ME.md).
Enquanto `supabaseUrl` e `supabaseAnonKey` estiverem vazios em `config.js`, os formulários funcionam em modo demonstração e não enviam nada.

Detalhes da estrutura e das decisões em [ESTRUTURA.md](ESTRUTURA.md).
