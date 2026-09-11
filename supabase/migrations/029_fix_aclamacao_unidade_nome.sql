-- Corrige o typo 'Aclimação' em profiles.unidade_nome pro nome canônico
-- 'Aclamação' (usado em UNIDADES do frontend e nas demais migrations).
-- Esse desvio fez o JOIN por nome da migration 027 não encontrar essa unidade,
-- deixando a Rematrícula 2027 sem nenhum aluno pra Aclamação -- useRematriculaProgresso()
-- conta 0 linhas em rematricula_alunos (=> null => item de menu fica escondido em Layout.tsx).

UPDATE public.profiles
SET unidade_nome = 'Aclamação'
WHERE unidade_nome = 'Aclimação' AND role = 'unidade';

-- Reaplica a lista de alunos da Aclamação (mesmos dados da migration 027), agora que
-- o nome bate. Idempotente: NOT EXISTS evita duplicar se já tiver rodado antes.
INSERT INTO public.rematricula_alunos (unidade_id, nome, turma)
SELECT p.id, v.nome, v.turma
FROM public.profiles p
JOIN (VALUES
  ('Aclamação', 'CAETANO MORAES DA SILVA', 'EI - Berçário'),
  ('Aclamação', 'JOÃO PAULO DE ALMEIDA BARBUTO', 'EI - Berçário'),
  ('Aclamação', 'MAITÊ SANT´ANNA WANDERMUREM AMARAL', 'EI - Berçário'),
  ('Aclamação', 'MAX PEZZUOL LIRA', 'EI - Berçário'),
  ('Aclamação', 'ALEX KEI TAKAKI AOYAGI', 'EI - Jardim'),
  ('Aclamação', 'ALICE LAVOR ERVATTI', 'EI - Jardim'),
  ('Aclamação', 'ANTONELLA PAGNAN NEVES', 'EI - Jardim'),
  ('Aclamação', 'ANTONELLA PARRA VENTRILHO POSSENTI', 'EI - Jardim'),
  ('Aclamação', 'BRUNA MUNIZ BONJOVANNI', 'EI - Jardim'),
  ('Aclamação', 'CLOVIS HONG', 'EI - Jardim'),
  ('Aclamação', 'FELIPE PIMENTEL DE CARVALHO', 'EI - Jardim'),
  ('Aclamação', 'GUSTAVO CHAOUKI CURI ASSI', 'EI - Jardim'),
  ('Aclamação', 'JASON JIA EN TSENG PAN', 'EI - Jardim'),
  ('Aclamação', 'JOAQUIM SILVEIRA ANDRADE', 'EI - Jardim'),
  ('Aclamação', 'LEONARDO LIN WU', 'EI - Jardim'),
  ('Aclamação', 'LUCAS ABREU PASCHOAL', 'EI - Jardim'),
  ('Aclamação', 'SOFIA DINIZ KALONKI', 'EI - Jardim'),
  ('Aclamação', 'VALENTINA REBELO VERALDI ROSSETTINI', 'EI - Jardim'),
  ('Aclamação', 'VICTORIA DESTRO BAPTISTUTA', 'EI - Jardim'),
  ('Aclamação', 'BERNARDO HEREDIA BASTOS', 'EI - Mat. I'),
  ('Aclamação', 'ALICE OLIVEIRA CARVALHO', 'EI - Mat. I'),
  ('Aclamação', 'AMANDA CURI ASSI', 'EI - Mat. I'),
  ('Aclamação', 'ANTONELLA CALZA BITENCOURT', 'EI - Mat. I'),
  ('Aclamação', 'ARTHUR CARVALHEIRO LECUONA', 'EI - Mat. I'),
  ('Aclamação', 'BERNARDO DUQUE DOS SANTOS', 'EI - Mat. I'),
  ('Aclamação', 'CÍCERO MARQUES DE CASTRO', 'EI - Mat. I'),
  ('Aclamação', 'DAVI MONTENEGRO MONTEIRO', 'EI - Mat. I'),
  ('Aclamação', 'ÍRIS BARRETO BARBOZA', 'EI - Mat. I'),
  ('Aclamação', 'JERRY PAN', 'EI - Mat. I'),
  ('Aclamação', 'LEONARDO BACHIEGGA OLIVEIRA DE SOUZA', 'EI - Mat. I'),
  ('Aclamação', 'MARIA ARAUJO SALUM ABDALLA', 'EI - Mat. I'),
  ('Aclamação', 'MARIA EDUARDA VOLPINI PADRÃO', 'EI - Mat. I'),
  ('Aclamação', 'MATTEO NELLI AZZOLINI UENO ANTUNES', 'EI - Mat. I'),
  ('Aclamação', 'MIGUEL FLÁVIO MENDES', 'EI - Mat. I'),
  ('Aclamação', 'YUZE LIN', 'EI - Mat. I'),
  ('Aclamação', 'ZOEY ZHOU', 'EI - Mat. I'),
  ('Aclamação', 'ARTHUR OKAJIMA GOMES', 'EI - Mat. II'),
  ('Aclamação', 'BENÍCIO CAMBIAGHI VEIGA QUEIROZ', 'EI - Mat. II'),
  ('Aclamação', 'BENJAMIN BORGHETTI KEHDE', 'EI - Mat. II'),
  ('Aclamação', 'EMILIA HELENA FERRAZ FINZI', 'EI - Mat. II'),
  ('Aclamação', 'ERIC GON HIROKAWA ZHOU', 'EI - Mat. II'),
  ('Aclamação', 'FELIPE LIMA ANTIQUERA', 'EI - Mat. II'),
  ('Aclamação', 'FREDERICO LITTIG CHIARATTI', 'EI - Mat. II'),
  ('Aclamação', 'GIOVANNA DE FREITAS DOLCE', 'EI - Mat. II'),
  ('Aclamação', 'HELENA MEDEIROS DOS SANTOS', 'EI - Mat. II'),
  ('Aclamação', 'ISABELA GONÇALVES CALDEIRA', 'EI - Mat. II'),
  ('Aclamação', 'ISABELA PRETTI DE OLIVEIRA', 'EI - Mat. II'),
  ('Aclamação', 'JASPER LIN', 'EI - Mat. II'),
  ('Aclamação', 'JOÃO PEDRO FARJADO DE MIRANDA', 'EI - Mat. II'),
  ('Aclamação', 'LAURA SANTOS KUTNEY', 'EI - Mat. II'),
  ('Aclamação', 'LEONARD LIU', 'EI - Mat. II'),
  ('Aclamação', 'LIZ PEZZUOL LIRA', 'EI - Mat. II'),
  ('Aclamação', 'MARCELO EIJI RISO DE SOUSA OCHIAI', 'EI - Mat. II'),
  ('Aclamação', 'MARIA EDUARDA LIBERATI GRISOLIA', 'EI - Mat. II'),
  ('Aclamação', 'MARTÍN MOTA GALÍPOLO', 'EI - Mat. II'),
  ('Aclamação', 'MIA HIKARI MORII NUNES', 'EI - Mat. II'),
  ('Aclamação', 'RAVI MORAES GOUVEIA XAVIER', 'EI - Mat. II'),
  ('Aclamação', 'EDUARDO MERLIM DIERINGS', 'EI - Mini'),
  ('Aclamação', 'IRIS CORTIZO CORRÊA', 'EI - Mini'),
  ('Aclamação', 'CECÍLIA POLOVANIUK TORRES GARCIA', 'EI - Mini'),
  ('Aclamação', 'ALICE GRIEBELER LAZZARI', 'EI - Pré'),
  ('Aclamação', 'GABRIELA HARUMI CAVALCANTI SATO', 'EI - Pré'),
  ('Aclamação', 'MANUELA MOLINAR BOCCALINI', 'EI - Pré'),
  ('Aclamação', 'MARIA LUIZA DE OLIVEIRA PEDRO', 'EI - Pré'),
  ('Aclamação', 'MARTIN VINICIUS FERRAZ FINZI', 'EI - Pré'),
  ('Aclamação', 'MIGUEL GUIMARÃES MARTINS PACIÊNCIA ESTANQUEIRO', 'EI - Pré'),
  ('Aclamação', 'OLIVIA MOURA TOMMASI', 'EI - Pré'),
  ('Aclamação', 'SIJIA LU', 'EI - Pré')
) AS v(unidade_nome, nome, turma) ON v.unidade_nome = p.unidade_nome
WHERE p.role = 'unidade'
  AND NOT EXISTS (
    SELECT 1 FROM public.rematricula_alunos r
    WHERE r.unidade_id = p.id AND r.nome = v.nome
  );
