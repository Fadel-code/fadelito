-- ============================================================
-- Marketing e supervisão passam a poder editar eventos_lead
-- (usado para corrigir o nome da visita, que vem do WhatsApp com
-- apelido/abreviação). Antes só a própria unidade fazia UPDATE.
-- ============================================================

DROP POLICY IF EXISTS "eventos_lead_update" ON public.eventos_lead;
CREATE POLICY "eventos_lead_update"
  ON public.eventos_lead FOR UPDATE TO authenticated
  USING (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() IN ('marketing', 'supervisao')
  )
  WITH CHECK (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() IN ('marketing', 'supervisao')
  );
