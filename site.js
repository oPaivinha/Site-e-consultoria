// Aplica as configurações de config.js nos textos do site.
(function () {
  var c = window.SITE_CONFIG || {};
  function setAll(selector, text) {
    if (!text) return;
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = text; });
  }
  setAll("[data-brand]", c.brand);
  setAll("[data-name]", c.name);
  setAll("[data-crn]", c.crn ? "Nutricionista · " + c.crn : "Nutricionista");
  if (c.showPrice === false) {
    document.querySelectorAll("[data-price-block]").forEach(function (el) { el.hidden = true; });
  }
  setAll("[data-price]", c.priceMonthly);
  if (c.priceMonthly && c.months) {
    setAll("[data-total]", "R$ " + (c.priceMonthly * c.months).toLocaleString("pt-BR"));
  }
  document.querySelectorAll("[data-instagram]").forEach(function (a) {
    if (c.instagram) { a.href = c.instagram; a.hidden = false; }
    else a.hidden = true;
  });
  if (c.brand) {
    document.title = c.brand + " | Nutrição online para emagrecer e ganhar massa magra";
  }

  // Menu do celular: o botão com as três linhas abre e fecha a lista de links.
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var aberto = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
      toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    });
    // Clicar num link fecha o menu.
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
      }
    });
  }
})();
