// Lê as variáveis de ambiente. Se faltar alguma, o erro diz exatamente qual.
function exigir(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Falta a variável de ambiente ${nome} (veja .env.example).`);
  return v;
}

export const supabaseUrl = () => exigir("SUPABASE_URL");
export const supabaseAnonKey = () => exigir("SUPABASE_ANON_KEY");
