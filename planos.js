/*
  PLANOS DO SITE
  Edite só este arquivo para mudar os planos que aparecem na página inicial.
  - Com um plano só, o site mostra um card. Com dois ou mais, aparecem abas para escolher.
  - O valor só aparece quando "showPrice" está true no config.js. Com false, o card diz
    que os valores são apresentados na primeira conversa.
  - "destaque: true" coloca o selo "Mais escolhido" no plano.

  Para acrescentar um plano, copie um bloco { ... } inteiro, cole depois da vírgula e mude os textos.
*/
window.PLANOS = [
  {
    id: "trimestral",
    nome: "Trimestral",
    meses: 3,
    valorMensal: 150,          // R$ por mês (só aparece com showPrice: true)
    destaque: true,
    resumo: "Três meses para construir a estratégia, ajustar com calma e ver a evolução.",
    inclui: [
      "Consulta completa por videochamada",
      "Plano alimentar individualizado em até 5 dias",
      "Check-in a cada 15 dias",
      "Retorno mensal",
      "Ajustes do plano conforme a sua evolução"
    ],
    detalhes: [
      "Plano alimentar com orientações e substituições, pensado para a sua rotina.",
      "Check-ins quinzenais para acompanhar adesão, intestino, hidratação e deslizes.",
      "Retorno mensal para rever a estratégia e ajustar o que for preciso.",
      "Pagamento por Pix ou cartão."
    ]
  }
];
