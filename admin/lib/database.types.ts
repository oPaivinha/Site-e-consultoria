// Tipos gerados automaticamente a partir do banco (Supabase > generate_typescript_types).
// Não edite à mão: quando o banco mudar, gere de novo (veja o README).
// Observação: acompanhamentos.observacoes e checkins.avisos_para_nutri são colunas antigas, vazias e
// ocultas por permissão de coluna; o painel nunca as lê.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      acompanhamentos: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          inicio_acompanhamento: string | null
          lembretes_enviados: number
          observacoes: string | null
          pausado: boolean
          profile_id: string
          proximo_checkin: string | null
          ultima_resposta: string | null
          ultimo_envio: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          inicio_acompanhamento?: string | null
          lembretes_enviados?: number
          observacoes?: string | null
          pausado?: boolean
          profile_id: string
          proximo_checkin?: string | null
          ultima_resposta?: string | null
          ultimo_envio?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          inicio_acompanhamento?: string | null
          lembretes_enviados?: number
          observacoes?: string | null
          pausado?: boolean
          profile_id?: string
          proximo_checkin?: string | null
          ultima_resposta?: string | null
          ultimo_envio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acompanhamentos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anamneses: {
        Row: {
          agua: string | null
          avisado_em: string | null
          bristol: number | null
          consentimento: boolean
          consentimento_em: string | null
          created_at: string
          deleted_at: string | null
          enviado_em: string | null
          id: number
          importado_de: string | null
          profile_id: string
          respostas: Json
          versao_consentimento: string | null
        }
        Insert: {
          agua?: string | null
          avisado_em?: string | null
          bristol?: number | null
          consentimento?: boolean
          consentimento_em?: string | null
          created_at?: string
          deleted_at?: string | null
          enviado_em?: string | null
          id?: never
          importado_de?: string | null
          profile_id: string
          respostas?: Json
          versao_consentimento?: string | null
        }
        Update: {
          agua?: string | null
          avisado_em?: string | null
          bristol?: number | null
          consentimento?: boolean
          consentimento_em?: string | null
          created_at?: string
          deleted_at?: string | null
          enviado_em?: string | null
          id?: never
          importado_de?: string | null
          profile_id?: string
          respostas?: Json
          versao_consentimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          admin_email: string | null
          admin_id: string | null
          antes: Json | null
          depois: Json | null
          em: string
          id: number
          registro_id: string | null
          tabela: string
        }
        Insert: {
          acao: string
          admin_email?: string | null
          admin_id?: string | null
          antes?: Json | null
          depois?: Json | null
          em?: string
          id?: never
          registro_id?: string | null
          tabela: string
        }
        Update: {
          acao?: string
          admin_email?: string | null
          admin_id?: string | null
          antes?: Json | null
          depois?: Json | null
          em?: string
          id?: never
          registro_id?: string | null
          tabela?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          adesao: number
          agua: string | null
          alerta: string[]
          avisado_em: string | null
          avisos_para_nutri: string | null
          bristol: number | null
          created_at: string
          deleted_at: string | null
          deslize_motivo: string[]
          deslizes: string | null
          energia: string | null
          enviado_em: string | null
          fome: string | null
          freq_evacuacao: string | null
          id: number
          importado_de: string | null
          peso_kg: number | null
          profile_id: string
          quer_contato: boolean
          recado: string | null
          refeicoes_dificeis: string[]
          sintomas_gi: string[]
        }
        Insert: {
          adesao: number
          agua?: string | null
          alerta?: string[]
          avisado_em?: string | null
          avisos_para_nutri?: string | null
          bristol?: number | null
          created_at?: string
          deleted_at?: string | null
          deslize_motivo?: string[]
          deslizes?: string | null
          energia?: string | null
          enviado_em?: string | null
          fome?: string | null
          freq_evacuacao?: string | null
          id?: never
          importado_de?: string | null
          peso_kg?: number | null
          profile_id: string
          quer_contato?: boolean
          recado?: string | null
          refeicoes_dificeis?: string[]
          sintomas_gi?: string[]
        }
        Update: {
          adesao?: number
          agua?: string | null
          alerta?: string[]
          avisado_em?: string | null
          avisos_para_nutri?: string | null
          bristol?: number | null
          created_at?: string
          deleted_at?: string | null
          deslize_motivo?: string[]
          deslizes?: string | null
          energia?: string | null
          enviado_em?: string | null
          fome?: string | null
          freq_evacuacao?: string | null
          id?: never
          importado_de?: string | null
          peso_kg?: number | null
          profile_id?: string
          quer_contato?: boolean
          recado?: string | null
          refeicoes_dificeis?: string[]
          sintomas_gi?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "checkins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      liberacoes_pagamento: {
        Row: {
          liberado_em: string
          liberado_por: string | null
          profile_id: string
        }
        Insert: {
          liberado_em?: string
          liberado_por?: string | null
          profile_id: string
        }
        Update: {
          liberado_em?: string
          liberado_por?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberacoes_pagamento_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_internas: {
        Row: {
          checkin_id: number | null
          created_at: string
          deleted_at: string | null
          id: number
          profile_id: string
          texto: string
          updated_at: string
        }
        Insert: {
          checkin_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          profile_id: string
          texto: string
          updated_at?: string
        }
        Update: {
          checkin_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          profile_id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_internas_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: true
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_internas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          id: number
          metodo: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          pago_em: string | null
          parcelas: number | null
          plano: string
          profile_id: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: never
          metodo?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pago_em?: string | null
          parcelas?: number | null
          plano: string
          profile_id: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: never
          metodo?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pago_em?: string | null
          parcelas?: number | null
          plano?: string
          profile_id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_plano_fkey"
            columns: ["plano"]
            isOneToOne: false
            referencedRelation: "precos"
            referencedColumns: ["plano"]
          },
          {
            foreignKeyName: "pagamentos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_formularios: {
        Row: {
          alertas: string[]
          altura_cm: number | null
          avisado_em: string | null
          consentimento: boolean
          consentimento_em: string | null
          created_at: string
          deleted_at: string | null
          enviado_em: string | null
          id: number
          importado_de: string | null
          modalidade: string | null
          objetivo: string | null
          origem: string | null
          peso_kg: number | null
          profile_id: string
          responsavel: Json | null
          revisar: boolean
          saude: Json
          scoff_sim: number | null
          tentativas: string | null
          treino_freq: string | null
          versao_consentimento: string | null
        }
        Insert: {
          alertas?: string[]
          altura_cm?: number | null
          avisado_em?: string | null
          consentimento?: boolean
          consentimento_em?: string | null
          created_at?: string
          deleted_at?: string | null
          enviado_em?: string | null
          id?: never
          importado_de?: string | null
          modalidade?: string | null
          objetivo?: string | null
          origem?: string | null
          peso_kg?: number | null
          profile_id: string
          responsavel?: Json | null
          revisar?: boolean
          saude?: Json
          scoff_sim?: number | null
          tentativas?: string | null
          treino_freq?: string | null
          versao_consentimento?: string | null
        }
        Update: {
          alertas?: string[]
          altura_cm?: number | null
          avisado_em?: string | null
          consentimento?: boolean
          consentimento_em?: string | null
          created_at?: string
          deleted_at?: string | null
          enviado_em?: string | null
          id?: never
          importado_de?: string | null
          modalidade?: string | null
          objetivo?: string | null
          origem?: string | null
          peso_kg?: number | null
          profile_id?: string
          responsavel?: Json | null
          revisar?: boolean
          saude?: Json
          scoff_sim?: number | null
          tentativas?: string | null
          treino_freq?: string | null
          versao_consentimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_formularios_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      precos: {
        Row: {
          ativo: boolean
          nome: string
          parcelas_max: number
          plano: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          nome: string
          parcelas_max?: number
          plano: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          nome?: string
          parcelas_max?: number
          plano?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aceita_checkin: boolean
          canal: string
          consentimento_em: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          email_paciente: string | null
          id: string
          menor: boolean
          nascimento: string | null
          nome: string
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_parentesco: string | null
          responsavel_whatsapp: string | null
          sexo: string | null
          updated_at: string
          versao_consentimento: string | null
          whatsapp: string | null
        }
        Insert: {
          aceita_checkin?: boolean
          canal?: string
          consentimento_em?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_paciente?: string | null
          id: string
          menor?: boolean
          nascimento?: string | null
          nome?: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_whatsapp?: string | null
          sexo?: string | null
          updated_at?: string
          versao_consentimento?: string | null
          whatsapp?: string | null
        }
        Update: {
          aceita_checkin?: boolean
          canal?: string
          consentimento_em?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_paciente?: string | null
          id?: string
          menor?: boolean
          nascimento?: string | null
          nome?: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_whatsapp?: string | null
          sexo?: string | null
          updated_at?: string
          versao_consentimento?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_cadastros_por_dia: {
        Args: { p_dias?: number }
        Returns: {
          dia: string
          total: number
        }[]
      }
      admin_conta: { Args: { p_id: string }; Returns: Json }
      admin_pacientes: {
        Args: {
          p_alerta?: boolean
          p_ate?: string
          p_busca?: string
          p_confirmado?: boolean
          p_desc?: boolean
          p_desde?: string
          p_limite?: number
          p_menor?: boolean
          p_objetivo?: string
          p_offset?: number
          p_ordem?: string
          p_status?: string
        }
        Returns: {
          admin: boolean
          alertas: string[]
          bloqueado_ate: string
          created_at: string
          deleted_at: string
          email: string
          email_confirmado_em: string
          id: string
          menor: boolean
          nome: string
          objetivo: string
          proximo_checkin: string
          revisar: boolean
          status: string
          total: number
          ultimo_login: string
          whatsapp: string
        }[]
      }
      admin_resumo: { Args: never; Returns: Json }
      admin_usuarios: {
        Args: {
          p_ate?: string
          p_busca?: string
          p_confirmado?: boolean
          p_desc?: boolean
          p_desde?: string
          p_limite?: number
          p_menor?: boolean
          p_offset?: number
          p_ordem?: string
          p_status?: string
        }
        Returns: {
          admin: boolean
          bloqueado_ate: string
          created_at: string
          deleted_at: string
          email: string
          email_confirmado_em: string
          id: string
          menor: boolean
          nome: string
          status: string
          total: number
          ultimo_login: string
          whatsapp: string
        }[]
      }
      exige_admin: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      json_text_array: { Args: { j: Json }; Returns: string[] }
      try_bool: { Args: { v: string }; Returns: boolean }
      try_date: { Args: { v: string }; Returns: string }
      try_numeric: { Args: { v: string }; Returns: number }
      try_timestamptz: { Args: { v: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Atalho: o tipo de uma linha de uma tabela. Ex.: Linha<"checkins">.
export type Linha<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
