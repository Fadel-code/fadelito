-- ============================================================
-- Fadelito — Migration 052: unidades Rio Preto e São Bernardo
--
-- Unidade aqui = login (auth.users + auth.identities) + profiles com role 'unidade'.
-- Mesmo padrão do seed-users.js: e-mail <nome>@fadelito.com.br, senha Fadelito2026!
-- (trocar no primeiro acesso), e-mail já confirmado.
--
--  Rio Preto     → rio.preto@fadelito.com.br     (R. Fuad Jorge Goraiebe, 285 - Pinheiros, São José do Rio Preto - SP, 15091-340)
--  São Bernardo  → sao.bernardo@fadelito.com.br  (R. Aparecida, 183 - Baeta Neves, São Bernardo do Campo - SP, 09751-330)
--
-- unidade_nome precisa bater com UNIDADES (frontend/src/types/index.ts) e com units.name
-- da agenda (o SSO casa por nome). Supervisora fica sem atribuição — definir na aba
-- Configuração do Ranking.
--
-- Idempotente: pula e-mail que já existe. Colar inteiro no SQL Editor do Supabase.
-- ============================================================

BEGIN;

DO $$
DECLARE
  u record;
  novo_id uuid;
BEGIN
  FOR u IN SELECT * FROM (VALUES
    ('Rio Preto',    'rio.preto@fadelito.com.br'),
    ('São Bernardo', 'sao.bernardo@fadelito.com.br')
  ) AS t(unidade_nome, email)
  LOOP
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = u.email) THEN
      RAISE NOTICE 'Já existe, pulei: %', u.email;
      CONTINUE;
    END IF;

    novo_id := gen_random_uuid();

    -- tokens como '' (não NULL): NULL quebra o login com "Database error querying schema"
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      u.email, extensions.crypt('Fadelito2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('unidade_nome', u.unidade_nome), now(), now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), novo_id, novo_id::text, 'email',
      jsonb_build_object('sub', novo_id::text, 'email', u.email, 'email_verified', true),
      now(), now(), now()
    );

    INSERT INTO public.profiles (id, role, unidade_nome, email, ativo)
    VALUES (novo_id, 'unidade', u.unidade_nome, u.email, true);

    RAISE NOTICE 'Criada: % → %', u.unidade_nome, u.email;
  END LOOP;
END $$;

COMMIT;

-- Conferência:
-- SELECT p.unidade_nome, p.email, p.ativo, au.email_confirmed_at IS NOT NULL AS confirmado
-- FROM public.profiles p JOIN auth.users au ON au.id = p.id
-- WHERE p.unidade_nome IN ('Rio Preto', 'São Bernardo');
