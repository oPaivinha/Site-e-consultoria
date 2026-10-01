/*
  CONFIGURAÇÃO DO SITE
  Edite só este arquivo para trocar nome, preço, contatos e integrações.
  Nada aqui é segredo: este arquivo é público no site.
*/
window.SITE_CONFIG = {
  // Identidade (provisório: troque quando definir o nome e o @)
  brand: "NutriForma",
  name: "Gabriel Paiva",
  crn: "Nutricionista · CRN-X 00000",
  instagram: "https://instagram.com/seu_arroba",

  // Oferta
  // showPrice: false esconde o valor no site (mostra só o que o plano inclui)
  showPrice: false,
  priceMonthly: 150,
  months: 3,

  // WhatsApp profissional: só números, com 55 + DDD. Ex.: 5511999999999
  whatsapp: "",

  // Link do Cal.com / Calendly para agendar após o formulário (opcional)
  schedulingUrl: "",

  // Endereço do webhook (n8n/Make) que recebe o formulário.
  // Vazio = modo demonstração: nada é enviado, os dados aparecem só no console do navegador.
  webhookUrl: "",

  // Versão do texto de consentimento (guarde junto com cada envio)
  consentVersion: "2026-10-v2"
};
