// Página inicial: monta os planos (a partir de planos.js), controla as perguntas
// frequentes e cuida das animações. Tudo em JavaScript leve, sem bibliotecas.
// Quem pediu "menos movimento" no sistema (prefers-reduced-motion) vê tudo parado.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function reais(n) {
    return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // ---------------- Planos ----------------
  function cardPlano(p) {
    var preco;
    if (cfg.showPrice && p.valorMensal) {
      preco =
        '<div class="plan__price">' +
          '<span class="plan__currency">R$</span>' +
          '<span class="plan__value">' + esc(Number(p.valorMensal).toLocaleString("pt-BR")) + '</span>' +
          '<span class="plan__period">/mês</span>' +
          (p.meses > 1 ? '<p class="plan__note">' + p.meses + " meses · " + esc(reais(p.valorMensal * p.meses)) + " no total</p>" : "") +
        "</div>";
    } else {
      preco = '<p class="plan__price-hidden">O valor aparece na etapa de pagamento, depois da anamnese.</p>';
    }
    var inclui = (p.inclui || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("");
    var detalhes = (p.detalhes || []).map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("");
    return (
      '<article class="plan' + (p.destaque ? " plan--featured" : "") + '">' +
        '<div class="plan__head">' +
          '<h3 class="plan__name">' + esc(p.nome) + "</h3>" +
          (p.destaque ? '<span class="plan__badge">Mais escolhido</span>' : "") +
        "</div>" +
        '<p class="plan__duration">' + (p.meses === 1 ? "1 mês" : p.meses + " meses") + " de acompanhamento</p>" +
        preco +
        (p.resumo ? '<p class="plan__summary">' + esc(p.resumo) + "</p>" : "") +
        '<ul class="plan__list">' + inclui + "</ul>" +
        (detalhes
          ? '<details class="plan__more"><summary>O que está incluso</summary><div class="faq__a"><ul class="plan__details">' + detalhes + "</ul></div></details>"
          : "") +
        '<p class="plan__pay">Pagamento por Pix ou cartão.</p>' +
        '<a href="formulario.html?plano=' + encodeURIComponent(p.id) + '" class="btn btn--block">Quero começar</a>' +
      "</article>"
    );
  }

  function montarPlanos() {
    var app = document.getElementById("planosApp");
    var planos = window.PLANOS || [];
    if (!app || !planos.length) return;

    // Um plano só: mostra o card, sem abas.
    if (planos.length === 1) {
      app.innerHTML = '<div class="plans__single">' + cardPlano(planos[0]) + "</div>";
      return;
    }

    // Dois ou mais: abas com um indicador que desliza até a aba escolhida.
    var inicial = 0;
    planos.forEach(function (p, i) { if (p.destaque) inicial = i; });
    var abas = planos.map(function (p, i) {
      return '<button type="button" role="tab" class="tabs__tab" id="aba-' + esc(p.id) + '" aria-controls="painel-' + esc(p.id) +
        '" aria-selected="' + (i === inicial) + '" tabindex="' + (i === inicial ? 0 : -1) + '">' + esc(p.nome) + "</button>";
    }).join("");
    var paineis = planos.map(function (p, i) {
      return '<div role="tabpanel" class="tabs__panel" id="painel-' + esc(p.id) + '" aria-labelledby="aba-' + esc(p.id) + '"' +
        (i === inicial ? "" : " hidden") + ">" + cardPlano(p) + "</div>";
    }).join("");
    app.innerHTML =
      '<div class="tabs">' +
        '<div class="tabs__list" role="tablist" aria-label="Planos">' + abas + '<span class="tabs__indicator" aria-hidden="true"></span></div>' +
        paineis +
      "</div>";

    var tabs = app.querySelectorAll(".tabs__tab");
    var indicador = app.querySelector(".tabs__indicator");
    function moverIndicador(tab) {
      indicador.style.width = tab.offsetWidth + "px";
      indicador.style.transform = "translateX(" + tab.offsetLeft + "px)";
    }
    function escolher(i, foco) {
      tabs.forEach(function (t, j) {
        var ativo = i === j;
        t.setAttribute("aria-selected", ativo);
        t.tabIndex = ativo ? 0 : -1;
        var painel = document.getElementById(t.getAttribute("aria-controls"));
        painel.hidden = !ativo;
        if (ativo) painel.classList.add("is-entering");
      });
      moverIndicador(tabs[i]);
      if (foco) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { escolher(i); });
      // Setas do teclado trocam de aba
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") escolher((i + 1) % tabs.length, true);
        if (e.key === "ArrowLeft") escolher((i - 1 + tabs.length) % tabs.length, true);
      });
    });
    app.addEventListener("animationend", function (e) { e.target.classList.remove("is-entering"); });
    moverIndicador(tabs[inicial]);
    window.addEventListener("resize", function () {
      var ativo = app.querySelector('.tabs__tab[aria-selected="true"]');
      if (ativo) moverIndicador(ativo);
    });
  }

  // ---------------- Acordeão (FAQ e "O que está incluso") ----------------
  // Abre e fecha com suavidade. No FAQ, abrir uma pergunta fecha a anterior.
  function animarAltura(el, de, para, fim) {
    if (semMovimento || !el.animate) { fim(); return; }
    var a = el.animate([{ height: de + "px" }, { height: para + "px" }], { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)" });
    a.onfinish = fim;
  }
  function prepararAcordeao(det, grupo) {
    var resumo = det.querySelector("summary");
    var corpo = det.querySelector(".faq__a");
    if (!resumo || !corpo) return;
    resumo.addEventListener("click", function (e) {
      e.preventDefault();
      if (det.open) fechar(det);
      else {
        if (grupo) grupo.forEach(function (outro) { if (outro !== det && outro.open) fechar(outro); });
        abrir(det);
      }
    });
    function abrir(d) {
      d.open = true;
      var c = d.querySelector(".faq__a");
      c.style.overflow = "hidden";
      animarAltura(c, 0, c.scrollHeight, function () { c.style.overflow = ""; });
    }
    function fechar(d) {
      var c = d.querySelector(".faq__a");
      c.style.overflow = "hidden";
      animarAltura(c, c.scrollHeight, 0, function () { d.open = false; c.style.overflow = ""; });
    }
  }
  function montarAcordeoes() {
    var faq = Array.prototype.slice.call(document.querySelectorAll("#faqList details"));
    faq.forEach(function (d) { prepararAcordeao(d, faq); });
    document.querySelectorAll(".plan__more").forEach(function (d) { prepararAcordeao(d, null); });
  }

  // ---------------- Revelação ao rolar ----------------
  function revelar() {
    var itens = document.querySelectorAll("[data-reveal]");
    if (semMovimento || !("IntersectionObserver" in window)) {
      itens.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    itens.forEach(function (el) { io.observe(el); });
  }

  // ---------------- Contadores do topo ----------------
  function contadores() {
    var nums = document.querySelectorAll("[data-count]");
    if (semMovimento || !("IntersectionObserver" in window)) return;
    nums.forEach(function (el) { el.textContent = "0"; });
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, alvo = Number(el.getAttribute("data-count")), t0 = null, dur = 1100;
        function passo(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          var suave = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(alvo * suave);
          if (p < 1) requestAnimationFrame(passo);
        }
        requestAnimationFrame(passo);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  // ---------------- Linha do tempo que se preenche com a rolagem ----------------
  function linhaDoTempo() {
    var tl = document.getElementById("timeline");
    if (!tl) return;
    if (semMovimento) { tl.style.setProperty("--progresso", 1); return; }
    var agendado = false;
    function atualizar() {
      agendado = false;
      var r = tl.getBoundingClientRect();
      var meio = window.innerHeight * 0.6;
      var p = (meio - r.top) / r.height;
      p = Math.max(0, Math.min(1, p));
      tl.style.setProperty("--progresso", p.toFixed(3));
      tl.querySelectorAll(".timeline__item").forEach(function (item) {
        var ir = item.getBoundingClientRect();
        item.classList.toggle("is-reached", ir.top + 18 < meio);
      });
    }
    window.addEventListener("scroll", function () {
      if (!agendado) { agendado = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    window.addEventListener("resize", atualizar);
    atualizar();
  }

  montarPlanos();
  montarAcordeoes();
  revelar();
  contadores();
  linhaDoTempo();
})();
