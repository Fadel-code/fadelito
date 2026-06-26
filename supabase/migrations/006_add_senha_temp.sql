-- Armazena a última senha definida pelo admin no Dashboard.
-- Não substitui o hash do Auth; serve apenas para que marketing
-- consulte a senha atual de cada usuário sem precisar de e-mail.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS senha_temp text;
