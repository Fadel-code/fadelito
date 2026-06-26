import { createClient } from "@supabase/supabase-js";
import type { Profile, Registro, AuditLog, EventoLead } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile };
      registros: { Row: Registro };
      audit_log: { Row: AuditLog };
      eventos_lead: { Row: EventoLead };
    };
  };
};
