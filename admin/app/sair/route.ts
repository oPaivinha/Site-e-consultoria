import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

// Encerra o login. Usado pelo botão "Sair" (POST) e quando alguém sem acesso tenta abrir o painel (GET).
async function sair(request: NextRequest) {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  const url = new URL("/login", request.url);
  if (request.nextUrl.searchParams.get("motivo") === "negado") url.searchParams.set("erro", "negado");
  return NextResponse.redirect(url, { status: 303 });
}

export const GET = sair;
export const POST = sair;
