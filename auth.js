// Login e banco de dados (Supabase), compartilhado por todas as páginas.
// Precisa vir depois de config.js e vendor/supabase.js.
// Expõe window.PN com o cliente (PN.sb) e utilidades de sessão, rotas e mensagens de erro.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var ready = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);

  // Raiz do site, descoberta pelo endereço deste arquivo. Funciona no GitHub Pages
  // (/Site-e-consultoria/) e em qualquer subpasta, inclusive em auth/callback.html.
  var script = document.currentScript;
  var root = new URL(".", script ? script.src : window.location.href);
  function url(path) { return new URL(path, root).href; }

  // Guarda o que veio no link do e-mail (#access_token=...&type=signup, ou #error=...) antes que o
  // cliente do Supabase leia e limpe o endereço.
  var linkParams = new URLSearchParams((window.location.hash || "").replace(/^#/, "") + "&" + window.location.search.replace(/^\?/, ""));

  var sb = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // "implicit" permite abrir o link de confirmação num aparelho diferente de onde a pessoa se cadastrou
      // (no fluxo PKCE o link só funciona no mesmo navegador).
      flowType: "implicit"
    }
  }) : null;

  function getSession() {
    if (!sb) return Promise.resolve(null);
    return sb.auth.getSession().then(function (r) { return r.data.session; });
  }

  // Página protegida: sem sessão, vai para o login e volta para cá depois.
  // Em modo demonstração (sem Supabase configurado) deixa ver a página.
  function requireLogin() {
    if (!sb) return Promise.resolve(null);
    return getSession().then(function (s) {
      if (s) return s;
      var here = window.location.pathname.split("/").pop() + window.location.search;
      window.location.replace(url("entrar.html") + "?next=" + encodeURIComponent(here));
      return new Promise(function () {}); // não continua enquanto redireciona
    });
  }

  // Telas de login e cadastro: quem já está logado vai para a área logada.
  function redirectIfLoggedIn() {
    return getSession().then(function (s) {
      if (s) {
        window.location.replace(safeNext() || url("perfil.html"));
        return new Promise(function () {});
      }
      return null;
    });
  }

  // ?next= só aceita páginas deste site (evita redirecionar para fora)
  function safeNext() {
    var n = new URLSearchParams(window.location.search).get("next");
    if (!n || !/^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(n)) return null;
    return url(n);
  }

  function signOut() {
    var done = function () { window.location.replace(url("entrar.html?saiu=1")); };
    if (!sb) return done();
    return sb.auth.signOut().then(done, done);
  }

  function loadProfile() {
    return getSession().then(function (s) {
      if (!s) return null;
      return sb.from("profiles").select("*").eq("id", s.user.id).maybeSingle().then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
    });
  }

  // Mensagens de erro em português. Os códigos vêm do Supabase Auth.
  function erro(e) {
    if (!e) return "";
    var code = e.code || "";
    var msg = String(e.message || e);
    var map = {
      invalid_credentials: "E-mail ou senha incorretos. Confira os dois ou crie sua conta pelo pré-formulário.",
      email_not_confirmed: "Seu e-mail ainda não foi confirmado. Abra o link que enviamos ou peça um novo abaixo.",
      user_already_exists: "Este e-mail já tem cadastro. Entre com sua senha ou use \"Esqueci minha senha\".",
      email_exists: "Este e-mail já tem cadastro. Entre com sua senha ou use \"Esqueci minha senha\".",
      weak_password: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.",
      same_password: "A nova senha precisa ser diferente da anterior.",
      over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.",
      over_request_rate_limit: "Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.",
      email_address_invalid: "Este e-mail não parece válido. Confira e tente de novo.",
      otp_expired: "Este link expirou ou já foi usado. Peça um novo.",
      session_not_found: "Sua sessão expirou. Entre de novo.",
      signup_disabled: "Novos cadastros estão desativados no momento."
    };
    if (map[code]) return map[code];
    if (/invalid login credentials/i.test(msg)) return map.invalid_credentials;
    if (/email not confirmed/i.test(msg)) return map.email_not_confirmed;
    if (/already registered/i.test(msg)) return map.user_already_exists;
    if (/rate limit/i.test(msg)) return map.over_request_rate_limit;
    if (/failed to fetch|network/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    return "Algo deu errado: " + msg;
  }

  // Cabeçalho: links com data-auth-link viram "Minha conta" quando a pessoa está logada.
  function updateNav() {
    var links = document.querySelectorAll("[data-auth-link]");
    if (!links.length) return;
    getSession().then(function (s) {
      links.forEach(function (a) {
        a.textContent = s ? "Minha conta" : "Entrar";
        a.href = url(s ? "perfil.html" : "entrar.html");
      });
    });
  }
  document.addEventListener("DOMContentLoaded", updateNav);

  window.PN = {
    ready: ready,
    sb: sb,
    linkParams: linkParams,
    url: url,
    getSession: getSession,
    requireLogin: requireLogin,
    redirectIfLoggedIn: redirectIfLoggedIn,
    safeNext: safeNext,
    signOut: signOut,
    loadProfile: loadProfile,
    erro: erro,
    // Endereços para onde os links dos e-mails levam (cadastre-os em Supabase > Authentication > URL Configuration)
    callbackUrl: url("auth/callback.html"),
    novaSenhaUrl: url("nova-senha.html"),
    validEmail: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim()); }
  };
})();
