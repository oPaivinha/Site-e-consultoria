/*
  CONFIGURAÇÃO DO SITE
  Edite só este arquivo para trocar nome, preço, contatos e integrações.
  Nada aqui é segredo: este arquivo é público no site.
*/
window.SITE_CONFIG = {
  // Identidade
  brand: "Paiva Nutri",
  name: "Gabriel Paiva",
  // Campos vazios ficam escondidos no site. Preencha quando quiser mostrar.
  crn: "",          // Ex.: "CRN-3 12345" (aparece como "Nutricionista · CRN-3 12345")
  instagram: "",    // Ex.: "https://instagram.com/paivanutri"

  // Oferta
  // showPrice: false esconde o valor no site (mostra só o que o plano inclui)
  showPrice: false,
  priceMonthly: 150,
  months: 3,

  // WhatsApp profissional: só números, com 55 + DDD. Ex.: 5511999999999
  whatsapp: "",

  // Link do Cal.com / Calendly para agendar após o formulário (opcional)
  schedulingUrl: "",

  // Supabase (banco de dados e login). Copie de Supabase > Project Settings > API.
  // A chave "anon"/"publishable" é pública por natureza: pode ficar aqui.
  // Quem protege os dados é o RLS do banco. NUNCA coloque a chave service_role neste arquivo.
  // Vazios = modo demonstração: nada é enviado, os dados aparecem só no console do navegador.
  supabaseUrl: "",      // Ex.: "https://abcdefghijklmno.supabase.co"
  supabaseAnonKey: "",  // Ex.: "sb_publishable_..." ou "eyJhbGciOi..."

  // Versão do texto de consentimento (guarde junto com cada envio)
  consentVersion: "2026-10-v3"
};
