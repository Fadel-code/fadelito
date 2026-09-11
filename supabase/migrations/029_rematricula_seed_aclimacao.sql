-- A migration 027 semeou a lista da Aclimação usando 'Aclamação' (typo que também
-- estava em UNIDADES do frontend e em supabase/seed-users.js, já corrigidos). O nome
-- certo da unidade é 'Aclimação' (bairro real de SP) -- é o valor que já está em
-- profiles.unidade_nome em produção. Como o JOIN da 027 buscava 'Aclamação', não
-- encontrou essa unidade e não inseriu nenhum aluno pra ela -- rematricula_alunos
-- ficou vazia, useRematriculaProgresso() retorna null, e o item de menu fica
-- escondido em Layout.tsx (só aparece com dados).
--
-- Reaplica a lista de alunos da Aclimação (mesmos dados da migration 027), agora
-- casando pelo nome certo. Idempotente: NOT EXISTS evita duplicar se já tiver rodado.
INSERT INTO public.rematricula_alunos (unidade_id, nome, turma)
SELECT p.id, v.nome, v.turma
FROM public.profiles p
JOIN (VALUES
  ('Aclimação', 'CAETANO MORAES DA SILVA', 'EI - Berçário'),
  ('Aclimação', 'JOÃO PAULO DE ALMEIDA BARBUTO', 'EI - Berçário'),
  ('Aclimação', 'MAITÊ SANT´ANNA WANDERMUREM AMARAL', 'EI - Berçário'),
  ('Aclimação', 'MAX PEZZUOL LIRA', 'EI - Berçário'),
  ('Aclimação', 'ALEX KEI TAKAKI AOYAGI', 'EI - Jardim'),
  ('Aclimação', 'ALICE LAVOR ERVATTI', 'EI - Jardim'),
  ('Aclimação', 'ANTONELLA PAGNAN NEVES', 'EI - Jardim'),
  ('Aclimação', 'ANTONELLA PARRA VENTRILHO POSSENTI', 'EI - Jardim'),
  ('Aclimação', 'BRUNA MUNIZ BONJOVANNI', 'EI - Jardim'),
  ('Aclimação', 'CLOVIS HONG', 'EI - Jardim'),
  ('Aclimação', 'FELIPE PIMENTEL DE CARVALHO', 'EI - Jardim'),
  ('Aclimação', 'GUSTAVO CHAOUKI CURI ASSI', 'EI - Jardim'),
  ('Aclimação', 'JASON JIA EN TSENG PAN', 'EI - Jardim'),
  ('Aclimação', 'JOAQUIM SILVEIRA ANDRADE', 'EI - Jardim'),
  ('Aclimação', 'LEONARDO LIN WU', 'EI - Jardim'),
  ('Aclimação', 'LUCAS ABREU PASCHOAL', 'EI - Jardim'),
  ('Aclimação', 'SOFIA DINIZ KALONKI', 'EI - Jardim'),
  ('Aclimação', 'VALENTINA REBELO VERALDI ROSSETTINI', 'EI - Jardim'),
  ('Aclimação', 'VICTORIA DESTRO BAPTISTUTA', 'EI - Jardim'),
  ('Aclimação', 'BERNARDO HEREDIA BASTOS', 'EI - Mat. I'),
  ('Aclimação', 'ALICE OLIVEIRA CARVALHO', 'EI - Mat. I'),
  ('Aclimação', 'AMANDA CURI ASSI', 'EI - Mat. I'),
  ('Aclimação', 'ANTONELLA CALZA BITENCOURT', 'EI - Mat. I'),
  ('Aclimação', 'ARTHUR CARVALHEIRO LECUONA', 'EI - Mat. I'),
  ('Aclimação', 'BERNARDO DUQUE DOS SANTOS', 'EI - Mat. I'),
  ('Aclimação', 'CÍCERO MARQUES DE CASTRO', 'EI - Mat. I'),
  ('Aclimação', 'DAVI MONTENEGRO MONTEIRO', 'EI - Mat. I'),
  ('Aclimação', 'ÍRIS BARRETO BARBOZA', 'EI - Mat. I'),
  ('Aclimação', 'JERRY PAN', 'EI - Mat. I'),
  ('Aclimação', 'LEONARDO BACHIEGGA OLIVEIRA DE SOUZA', 'EI - Mat. I'),
  ('Aclimação', 'MARIA ARAUJO SALUM ABDALLA', 'EI - Mat. I'),
  ('Aclimação', 'MARIA EDUARDA VOLPINI PADRÃO', 'EI - Mat. I'),
  ('Aclimação', 'MATTEO NELLI AZZOLINI UENO ANTUNES', 'EI - Mat. I'),
  ('Aclimação', 'MIGUEL FLÁVIO MENDES', 'EI - Mat. I'),
  ('Aclimação', 'YUZE LIN', 'EI - Mat. I'),
  ('Aclimação', 'ZOEY ZHOU', 'EI - Mat. I'),
  ('Aclimação', 'ARTHUR OKAJIMA GOMES', 'EI - Mat. II'),
  ('Aclimação', 'BENÍCIO CAMBIAGHI VEIGA QUEIROZ', 'EI - Mat. II'),
  ('Aclimação', 'BENJAMIN BORGHETTI KEHDE', 'EI - Mat. II'),
  ('Aclimação', 'EMILIA HELENA FERRAZ FINZI', 'EI - Mat. II'),
  ('Aclimação', 'ERIC GON HIROKAWA ZHOU', 'EI - Mat. II'),
  ('Aclimação', 'FELIPE LIMA ANTIQUERA', 'EI - Mat. II'),
  ('Aclimação', 'FREDERICO LITTIG CHIARATTI', 'EI - Mat. II'),
  ('Aclimação', 'GIOVANNA DE FREITAS DOLCE', 'EI - Mat. II'),
  ('Aclimação', 'HELENA MEDEIROS DOS SANTOS', 'EI - Mat. II'),
  ('Aclimação', 'ISABELA GONÇALVES CALDEIRA', 'EI - Mat. II'),
  ('Aclimação', 'ISABELA PRETTI DE OLIVEIRA', 'EI - Mat. II'),
  ('Aclimação', 'JASPER LIN', 'EI - Mat. II'),
  ('Aclimação', 'JOÃO PEDRO FARJADO DE MIRANDA', 'EI - Mat. II'),
  ('Aclimação', 'LAURA SANTOS KUTNEY', 'EI - Mat. II'),
  ('Aclimação', 'LEONARD LIU', 'EI - Mat. II'),
  ('Aclimação', 'LIZ PEZZUOL LIRA', 'EI - Mat. II'),
  ('Aclimação', 'MARCELO EIJI RISO DE SOUSA OCHIAI', 'EI - Mat. II'),
  ('Aclimação', 'MARIA EDUARDA LIBERATI GRISOLIA', 'EI - Mat. II'),
  ('Aclimação', 'MARTÍN MOTA GALÍPOLO', 'EI - Mat. II'),
  ('Aclimação', 'MIA HIKARI MORII NUNES', 'EI - Mat. II'),
  ('Aclimação', 'RAVI MORAES GOUVEIA XAVIER', 'EI - Mat. II'),
  ('Aclimação', 'EDUARDO MERLIM DIERINGS', 'EI - Mini'),
  ('Aclimação', 'IRIS CORTIZO CORRÊA', 'EI - Mini'),
  ('Aclimação', 'CECÍLIA POLOVANIUK TORRES GARCIA', 'EI - Mini'),
  ('Aclimação', 'ALICE GRIEBELER LAZZARI', 'EI - Pré'),
  ('Aclimação', 'GABRIELA HARUMI CAVALCANTI SATO', 'EI - Pré'),
  ('Aclimação', 'MANUELA MOLINAR BOCCALINI', 'EI - Pré'),
  ('Aclimação', 'MARIA LUIZA DE OLIVEIRA PEDRO', 'EI - Pré'),
  ('Aclimação', 'MARTIN VINICIUS FERRAZ FINZI', 'EI - Pré'),
  ('Aclimação', 'MIGUEL GUIMARÃES MARTINS PACIÊNCIA ESTANQUEIRO', 'EI - Pré'),
  ('Aclimação', 'OLIVIA MOURA TOMMASI', 'EI - Pré'),
  ('Aclimação', 'SIJIA LU', 'EI - Pré')
) AS v(unidade_nome, nome, turma) ON v.unidade_nome = p.unidade_nome
WHERE p.role = 'unidade'
  AND NOT EXISTS (
    SELECT 1 FROM public.rematricula_alunos r
    WHERE r.unidade_id = p.id AND r.nome = v.nome
  );
