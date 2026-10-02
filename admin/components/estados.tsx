// Mensagens padrão de "carregando", "vazio" e "erro" usadas em todas as telas.

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-linha bg-superficie p-6 text-suave" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-verde-claro border-t-verde" />
      {texto}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-linha bg-superficie p-8 text-center">
      <p className="font-medium">{titulo}</p>
      {children && <div className="mt-1 text-sm text-suave">{children}</div>}
    </div>
  );
}

export function Erro({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-perigo-claro p-4 text-perigo">
      {children}
    </p>
  );
}
