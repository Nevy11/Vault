export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          kyc_tag: string
          pin_hash: string | null
          is_suspended: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          kyc_tag: string
          pin_hash?: string | null
          is_suspended?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          kyc_tag?: string
          pin_hash?: string | null
          is_suspended?: boolean
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string | null
          amount: number
          type: 'transfer' | 'deposit' | 'withdrawal'
          method: 'vault' | 'bank' | 'mpesa'
          status: 'pending' | 'completed' | 'failed'
          description: string | null
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id?: string | null
          amount: number
          type: 'transfer' | 'deposit' | 'withdrawal'
          method: 'vault' | 'bank' | 'mpesa'
          status?: 'pending' | 'completed' | 'failed'
          description?: string | null
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string | null
          amount?: number
          type?: 'transfer' | 'deposit' | 'withdrawal'
          method?: 'vault' | 'bank' | 'mpesa'
          status?: 'pending' | 'completed' | 'failed'
          description?: string | null
          reference?: string | null
          created_at?: string
        }
      }
      wallets: {
        Row: {
          user_id: string
          balance: number
          currency: string
          updated_at: string
        }
        Insert: {
          user_id: string
          balance?: number
          currency?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          balance?: number
          currency?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      vault_transfer: {
        Args: {
          p_sender_id: string
          p_recipient_tag: string
          p_amount: number
          p_category?: string
          p_note?: string
        }
        Returns: {
          success: boolean
          message: string
          new_balance: number
          reference: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
