/*
  PLANOS DO SITE
  Edite só este arquivo para mudar os planos que aparecem na página inicial.
  - Com um plano só, o site mostra um card. Com dois ou mais, aparecem abas para escolher.
  - O valor só aparece quando "showPrice" está true no config.js. Com false, o card diz
    que o valor aparece na etapa de pagamento.
  - O valor COBRADO não vem daqui: fica na tabela "precos" do banco (painel > Pagamentos).
    Ao mudar um preço, mude nos dois lugares.
  - "destaque: true" coloca o selo "Mais escolhido" no plano.

  Para acrescentar um plano, copie um bloco { ... } inteiro, cole depois da vírgula e mude os textos.
*/
window.PLANOS = [
  {
    id: "mensal",
    nome: "Mensal",
    meses: 1,
    valorMensal: 190,          // R$ por mês (só aparece com showPrice: true)
    resumo: "Um mês para começar com uma estratégia feita para você e ver como ela se encaixa na sua rotina.",
    inclui: [
      "Consulta completa por videochamada",
      "Plano alimentar individualizado em até 5 dias",
      "Check-in a cada 15 dias",
      "Ajustes do plano conforme a sua evolução"
    ],
    detalhes: [
      "Plano alimentar com orientações e substituições, pensado para a sua rotina.",
      "Dois check-ins no mês para acompanhar adesão, intestino, hidratação e deslizes.",
      "Ao fim do mês, você pode renovar ou passar para o plano anual.",
      "Pagamento por Pix ou cartão."
    ]
  },
  {
    id: "trimestral",
    nome: "Trimestral",
    meses: 3,
    valorMensal: 170,          // R$ por mês (só aparece com showPrice: true)
    resumo: "Três meses para criar hábitos com calma e ajustar a estratégia conforme você evolui.",
    inclui: [
      "Consulta completa por videochamada",
      "Plano alimentar individualizado em até 5 dias",
      "Check-in a cada 15 dias",
      "Retorno mensal",
      "Ajustes do plano conforme a sua evolução"
    ],
    detalhes: [
      "Plano alimentar com orientações e substituições, pensado para a sua rotina.",
      "Check-ins quinzenais nos três meses para acompanhar adesão, intestino, hidratação e deslizes.",
      "Retorno mensal para rever a estratégia e ajustar o que for preciso.",
      "Pagamento por Pix ou cartão."
    ]
  },
  {
    id: "anual",
    nome: "Anual",
    meses: 12,
    valorMensal: 150,          // R$ por mês (só aparece com showPrice: true)
    destaque: true,
    resumo: "Um ano de acompanhamento contínuo para ajustar com calma e manter os resultados.",
    inclui: [
      "Consulta completa por videochamada",
      "Plano alimentar individualizado em até 5 dias",
      "Check-in a cada 15 dias",
      "Retorno mensal",
      "Ajustes do plano conforme a sua evolução"
    ],
    detalhes: [
      "Plano alimentar com orientações e substituições, pensado para a sua rotina.",
      "Check-ins quinzenais durante o ano todo para acompanhar adesão, intestino, hidratação e deslizes.",
      "Retorno mensal para rever a estratégia e ajustar o que for preciso.",
      "Pagamento por Pix ou cartão."
    ]
  }
];
