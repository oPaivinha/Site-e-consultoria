"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";

export function FormularioLogin({ avisoInicial }: { avisoInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, { erro: avisoInicial });

  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-perigo-claro px-4 py-3 text-sm text-perigo">
          {estado.erro}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.email}
          className="w-full rounded-lg border border-linha bg-white px-3 py-2.5 outline-none focus:border-verde focus:ring-2 focus:ring-verde-claro"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Senha</span>
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-linha bg-white px-3 py-2.5 outline-none focus:border-verde focus:ring-2 focus:ring-verde-claro"
        />
      </label>
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-full bg-verde px-5 py-3 font-medium text-white transition hover:bg-verde-escuro disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
