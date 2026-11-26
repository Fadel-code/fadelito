-- ============================================================
-- Fadelito — Migration 053: segurança de profiles + redefinição de senha
-- Rodar no SQL Editor do Supabase (não pela aba Migrations).
--
-- 1. A policy de UPDATE deixava a própria unidade alterar o seu perfil
--    inteiro — inclusive role e ativo (virar 'marketing' via API).
--    Nenhuma tela da unidade edita o próprio perfil: UPDATE fica só
--    com marketing/supervisão.
-- 2. Não existia policy de INSERT em profiles: "Novo usuário" em
--    Usuários criava o login no Auth e falhava ao gravar o perfil.
-- 3. "Redefinir senha" chamava a API admin do Auth com a service-role
--    key no navegador (que não vai no build de produção, então quebrava;
--    e num build local vazaria a chave). Agora é uma função no banco
--    que só o Marketing executa.
-- ============================================================

DROP POLICY IF EXISTS "profiles_update_own_or_marketing" ON public.profiles;
CREATE POLICY "profiles_update_own_or_marketing"
  ON public.profiles FOR UPDATE TO authenticated
  USING (get_my_role() IN ('marketing', 'supervisao'))
  WITH CHECK (get_my_role() IN ('marketing', 'supervisao'));

DROP POLICY IF EXISTS "profiles_insert_marketing" ON public.profiles;
CREATE POLICY "profiles_insert_marketing"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'marketing' AND role = 'unidade');

CREATE OR REPLACE FUNCTION public.admin_definir_senha(p_user_id uuid, p_senha text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  IF get_my_role() IS DISTINCT FROM 'marketing' THEN
    RAISE EXCEPTION 'Apenas o Marketing pode redefinir senhas';
  END IF;
  IF length(coalesce(p_senha, '')) < 8 THEN
    RAISE EXCEPTION 'Senha deve ter pelo menos 8 caracteres';
  END IF;

  UPDATE auth.users
     SET encrypted_password = crypt(p_senha, gen_salt('bf')),
         updated_at = now()
   WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  UPDATE public.profiles SET senha_temp = p_senha WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_definir_senha(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_senha(uuid, text) TO authenticated;
