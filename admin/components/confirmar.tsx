"use client";

// Botão de formulário que pede confirmação antes de enviar (para ações destrutivas).
export function BotaoConfirmar({ pergunta, className, children }: { pergunta: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(pergunta)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
