-- Seed dos 42 protocolos oficiais, convertidos de Assistente Fadelito/banco-de-dados/seed.sql

BEGIN;

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de mordida',
  'Pedagógico',
  'Cuidado e convivência',
  ARRAY['mordida','mordeu','morder','machucou','ferimento'],
  'revisao',
  'Acolha as crianças, interrompa a situação com calma e comunique a coordenação. A parte do documento que indica produtos ou pomadas permanece bloqueada até validação técnica.',
  ARRAY['Separe as crianças com tranquilidade e garanta supervisão próxima.','Faça o cuidado inicial permitido pela política de primeiros socorros da unidade.','Registre o contexto, o horário e os adultos presentes.','Avise a coordenação e comunique as famílias conforme o protocolo validado.','Reorganize a rotina e a supervisão para reduzir novas ocorrências.'],
  'Olá, [nome do responsável]. Quero informar com transparência que hoje ocorreu uma situação de mordida envolvendo a criança. A equipe interveio imediatamente, acolheu as crianças, realizou os cuidados permitidos e registrou o contexto. A coordenação está acompanhando o caso e reforçará as estratégias de supervisão e convivência. Permanecemos disponíveis para conversar e manteremos você informado sobre o acompanhamento.',
  'Não aplique medicamentos ou pomadas com base nesta demonstração. Siga apenas a orientação validada pela escola e pelos responsáveis técnicos.',
  true,
  '4.2-PROTOCOLO DE MORDIDA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de administração de medicamentos',
  'Pedagógico',
  'Saúde e segurança',
  ARRAY['medicamento','remédio','medicação','febre','dose','receita','antibiótico'],
  'revisao',
  'Este tema exige validação técnica e autorização formal. A demonstração não orienta dose, medicamento ou administração.',
  ARRAY['Acione imediatamente a coordenação da unidade.','Confirme a orientação registrada pelos responsáveis e a documentação exigida.','Não improvise medicamento, dose, horário ou forma de administração.','Registre a ocorrência e os contatos realizados.','Em sinais de gravidade, siga o fluxo de emergência da unidade.'],
  'Olá, [nome do responsável]. Escrevemos sobre a administração de medicamento à criança na escola. A coordenação está conferindo a autorização e a documentação necessárias antes de qualquer procedimento, seguindo o protocolo da Rede Fadelito, e nenhuma medicação é administrada sem essa validação formal. Pedimos que envie ou confirme a receita e as orientações atualizadas pelo canal institucional. Qualquer dúvida, estamos à disposição para conversar.',
  'Conteúdo médico em revisão. O Assistente Fadelito nunca deve substituir orientação profissional ou o atendimento de emergência.',
  true,
  '4.4-PROTOCOLO DE ADMINISTRAÇÃO DE REMÉDIOS.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de emergências',
  'Em comum',
  'Saúde e segurança',
  ARRAY['emergência','acidente','queda','corte','sangue','desmaio','socorro','bateu a cabeça'],
  'revisao',
  'Priorize a segurança da criança, acione o fluxo de emergência da unidade e comunique a direção. Em risco imediato, procure socorro profissional.',
  ARRAY['Mantenha a criança acompanhada e afaste riscos do local.','Acione a coordenação e a equipe treinada para primeiros socorros.','Classifique a situação conforme o protocolo validado da unidade.','Comunique os responsáveis e registre horários, sinais e providências.','Se houver risco imediato, acione o serviço de emergência aplicável.'],
  'Olá, [nome do responsável]. Precisamos informar que houve uma situação de emergência envolvendo a criança durante a rotina escolar. A equipe agiu imediatamente, prestou os primeiros cuidados e acionou a coordenação, seguindo o fluxo de emergência da unidade. Pedimos que entre em contato o quanto antes pelo canal institucional para alinharmos os próximos passos. Continuaremos acompanhando de perto e retornaremos com mais informações assim que possível.',
  'Esta demonstração não diagnostica nem substitui profissionais de saúde ou serviços de emergência.',
  true,
  '8-PROTOCOLO PARA EMERGENCIAS.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de adaptação',
  'Pedagógico',
  'Família e acolhimento',
  ARRAY['adaptação','chorando','choro','não quer entrar','chegada','família insegura'],
  'validado',
  'A adaptação deve respeitar o ritmo e as particularidades de cada criança e família, fortalecendo gradualmente o vínculo com o espaço, os educadores e o grupo.',
  ARRAY['Acolha a criança e a família com calma, sem apressar a despedida.','Identifique o que traz segurança para a criança naquele momento.','Apresente os espaços, o educador de referência e a rotina aos poucos.','Observe e registre sinais de evolução ou dificuldade.','Alinhe com a coordenação e a família os próximos passos.'],
  'Olá, [nome do responsável]. Gostaríamos de compartilhar como está o processo de adaptação da criança à rotina escolar. A equipe tem acompanhado de perto os sinais de segurança e conforto, apresentando aos poucos os espaços, os educadores e o grupo. Vamos alinhar com você os próximos passos para que essa fase siga tranquila. Estamos à disposição para conversar sempre que precisar.',
  '',
  true,
  '1.1-PROTOCOLO DE ADAPTAÇÃO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de fotos',
  'Pedagógico',
  'Comunicação e privacidade',
  ARRAY['foto','fotos','imagem','vídeo','câmera','câmeras','filmagem','monitoramento','divulgação','autorização','rede social'],
  'validado',
  'Antes de registrar, consultar ou divulgar imagens, confirme a finalidade, a autorização da família e as regras de acesso. Preserve a privacidade de cada criança e encaminhe solicitações sobre câmeras à direção.',
  ARRAY['Confirme o motivo da consulta ou do registro de imagem.','Confira as autorizações e as regras de acesso antes de visualizar, copiar ou divulgar qualquer material.','Preserve o arquivo original e restrinja o acesso às pessoas autorizadas.','Não compartilhe imagens por contas, aparelhos ou grupos pessoais.','Registre a solicitação e encaminhe decisões sobre câmeras e fornecimento de imagens à direção.','Comunique a família com fatos confirmados, sem prometer acesso ou entrega antes da validação.'],
  'Olá, [nome do responsável]. Recebemos sua solicitação relacionada a imagens da criança. Estamos conferindo as autorizações e as regras de acesso antes de qualquer visualização, cópia ou entrega de material, conforme a política de privacidade da Rede Fadelito. Retornaremos pelo canal institucional assim que a verificação estiver concluída, sem antecipar prazos ou conteúdo antes dessa confirmação. Agradecemos a compreensão.',
  '',
  true,
  '8.2-PROTOCOLO DE FOTOGRAFIAS COM ANEXO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de desfralde',
  'Pedagógico',
  'Desenvolvimento infantil',
  ARRAY['desfralde','fralda','banheiro','xixi','cocô','escape','pitoco','pituca','penico','roupa íntima'],
  'validado',
  'O desfralde é uma conquista de autonomia e deve começar somente quando a criança apresentar sinais de prontidão. Escola e família precisam combinar a mesma rotina, usar reforço positivo e respeitar o tempo individual, sem comparações ou punições.',
  ARRAY['Observe os sinais: incômodo com a fralda suja, aviso após fazer xixi ou cocô, pedido para usar o banheiro, períodos com a fralda seca e autonomia básica para lidar com a roupa.','Agende uma conversa com a família, faça a escuta inicial, explique como o processo funciona na escola e defina em conjunto a data de início.','Oriente o preparo de casa e escola: vaso ou adaptador seguro, apoio para os pés, roupas fáceis de retirar, trocas extras, lenços e sacos separados para peças sujas.','Conduza as idas ao banheiro em rotina positiva, com supervisão, privacidade e incentivo. Meninos e meninas iniciam sentados; nunca force, ridicularize ou puna.','Em caso de escape, acolha com naturalidade, faça a higiene e a troca imediatamente, armazene as peças conforme o procedimento da unidade e informe a família.','Registre diariamente a evolução e os escapes. Utilize o Projeto Pitoco e Pituca e o diário como apoio de vínculo e comunicação, conforme o planejamento da turma.','Reavalie com a coordenação e a família se houver sofrimento, resistência persistente, regressão ou falta de alinhamento entre os ambientes.'],
  'Olá, [nome do responsável]. Gostaríamos de alinhar o processo de desfralde da criança. Observamos sinais de prontidão e queremos construir uma rotina coerente entre a escola e a família, sempre respeitando o tempo individual, sem pressão ou comparação. Podemos combinar a data de início, as roupas e materiais necessários e a forma de registrar a evolução. Conte conosco para acompanhar cada etapa com acolhimento.',
  'O protocolo consultado é de 2020. Antes de aplicar horários rígidos ou procedimentos de higiene, confirme a versão vigente e as orientações atuais da direção pedagógica.',
  true,
  '10.0-PROTOCOLO DO DESFRALDE.docx + materiais Pitoco e Pituca');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de uso do parque',
  'Pedagógico',
  'Rotina pedagógica',
  ARRAY['parque','brinquedo','escorregador','pátio','recreio','supervisão'],
  'validado',
  'O parque é um momento de aprendizagem e autonomia assistida. A equipe deve organizar o espaço, manter supervisão ativa e considerar as necessidades do grupo.',
  ARRAY['Verifique o espaço e os brinquedos antes da entrada da turma.','Combine regras simples e adequadas à faixa etária.','Distribua os adultos para manter supervisão ativa.','Acompanhe interações e riscos sem impedir a exploração segura.','Interrompa o uso se o ambiente deixar de oferecer segurança.'],
  '',
  '',
  true,
  '5.2-PROTOCOLO USO DO PARQUE.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de alunos faltantes',
  'Em comum',
  'Família e acolhimento',
  ARRAY['faltou','faltas','ausente','não veio','aluno faltante','frequência'],
  'validado',
  'As ausências recorrentes devem ser acompanhadas para compreender suas causas, preservar a rotina da criança e manter uma comunicação acolhedora com a família.',
  ARRAY['Confirme a frequência e identifique o padrão de ausências.','Entre em contato com a família de maneira acolhedora.','Investigue se há dificuldade de adaptação, vínculo ou rotina.','Registre o contato e os combinados realizados.','Leve casos persistentes à coordenação.'],
  'Olá, [nome do responsável]. Notamos algumas ausências da criança nos últimos dias e gostaríamos de entender como podemos ajudar. Se houver alguma dificuldade de rotina, saúde ou adaptação, estamos à disposição para conversar e buscar juntos uma solução. Seu retorno nos ajuda a manter o acompanhamento pedagógico em dia.',
  '',
  true,
  '6.3PROTOCOLO ALUNOS FALTANTES.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de crise e conduta inadequada',
  'Pedagógico',
  'Proteção e conduta',
  ARRAY['gritou','puxou','apertou','castigo','maus-tratos','denúncia','funcionária','câmera'],
  'revisao',
  'Acolha o relato sem contestar ou antecipar conclusões, proteja a criança e acione imediatamente a direção responsável pelo fluxo de apuração.',
  ARRAY['Escute e registre o relato com palavras objetivas.','Confirme horário, local e pessoas possivelmente presentes.','Garanta a proteção imediata da criança.','Preserve registros e comunique a direção sem demora.','Mantenha confidencialidade e siga o procedimento formal de apuração.'],
  'Olá, [nome do responsável]. Precisamos conversar sobre uma situação reportada envolvendo a criança. A equipe acolheu o relato, registrou os fatos com cuidado e encaminhou o caso à direção para apuração formal, sem antecipar conclusões. Por se tratar de um tema de proteção infantil, seguiremos o fluxo institucional e retornaremos com informações assim que a apuração permitir. Permanecemos à disposição para dialogar diretamente com você.',
  'Tema de proteção infantil. A resposta original do documento precisa ser revisada antes de uso operacional.',
  true,
  '2.1-PROTOCOLO GESTAO DE CRISE - PAIS E FUNCIONARIOS.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de visita e pós-visita',
  'Em comum',
  'Família e acolhimento',
  ARRAY['visita','agendamento','família nova','matrícula'],
  'validado',
  'O atendimento deve ser acolhedor desde a portaria, com agendamento organizado e continuidade após a visita.',
  ARRAY['Confirme o agendamento, o nome dos responsáveis, a faixa etária e o horário pretendido.','Avise portaria, recepção, coordenação e financeiro para que o atendimento esteja preparado.','Receba a família pelo nome, escute suas necessidades e apresente somente informações confirmadas.','Conduza a visita com segurança, sem deixar visitantes desacompanhados nas áreas de crianças.','Registre o atendimento, as dúvidas e o próximo passo combinado com a família.','Faça o retorno pelo canal institucional dentro do prazo definido pela unidade.'],
  'Olá, [nome do responsável]. Foi um prazer receber sua visita à unidade. Registramos suas dúvidas e o que foi combinado durante o atendimento, e retornaremos pelo canal institucional dentro do prazo combinado. Se surgir alguma pergunta antes disso, estamos à disposição para ajudar.',
  '',
  true,
  '1-PROTOCOLO DE VISITA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de postura',
  'Pedagógico',
  'Proteção e conduta',
  ARRAY['postura','ética','uniforme','comportamento','colaborador'],
  'validado',
  'Reúne orientações de postura profissional, ética e conduta da equipe no ambiente escolar.',
  ARRAY['Confirme qual conduta ou situação precisa ser tratada e registre fatos objetivos.','Converse em ambiente reservado, com respeito e sem exposição pública do colaborador.','Reforce a expectativa de postura, ética, linguagem, apresentação e confidencialidade.','Defina a correção esperada, o responsável pelo acompanhamento e o prazo.','Escale reincidências ou situações graves para a direção e o RH, preservando os registros.'],
  '',
  '',
  true,
  '2.0-PROTOCOLO POSTURA E ÉTICA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo lista de alunos e capacidade',
  'Pedagógico',
  'Gestão da unidade',
  ARRAY['lista','capacidade','lotação','chamada','vagas'],
  'validado',
  'Orienta a atualização da lista de alunos e o controle de capacidade e vagas da unidade.',
  ARRAY['Atualize a lista oficial de alunos por turma e período.','Confira matrículas, cancelamentos, transições e crianças em adaptação.','Compare o total com a capacidade física e operacional validada da unidade.','Verifique se o número de profissionais mantém o atendimento seguro.','Antes de abrir nova vaga, obtenha a confirmação da coordenação responsável.','Registre divergências e corrija a base oficial antes de comunicar disponibilidade.'],
  '',
  '',
  true,
  '2.2-Protocolo Lista de alunos X Capacidade.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de planejamento',
  'Pedagógico',
  'Rotina pedagógica',
  ARRAY['planejamento','quinzena','atividade','entrega'],
  'validado',
  'Define o planejamento como norteador do trabalho pedagógico e organiza sua entrega e supervisão.',
  ARRAY['Consulte os objetivos da turma e observe as necessidades atuais do grupo.','Defina atividade, campo de experiência, objetivo, metodologia, materiais e local.','Planeje a dinâmica e o registro da aprendizagem, mantendo flexibilidade para o ritmo da turma.','Entregue o planejamento na data definida para supervisão da coordenação.','Ajuste o documento após a devolutiva e organize previamente os materiais.','Registre situações excepcionais e o que precisa ser retomado no próximo ciclo.'],
  '',
  '',
  true,
  '3.0-PROTOCOLO PLANEJAMENTO .docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de avaliação diagnóstica',
  'Pedagógico',
  'Rotina pedagógica',
  ARRAY['avaliação','diagnóstica','aprendizagem','dificuldade'],
  'validado',
  'Orienta o mapeamento de habilidades e dificuldades sem finalidade classificatória.',
  ARRAY['Defina quais habilidades serão observadas e em quais situações da rotina.','Observe cada criança em diferentes momentos, sem transformar a atividade em prova.','Registre evidências objetivas, evitando rótulos e comparações entre crianças.','Analise avanços, necessidades e estratégias pedagógicas possíveis.','Converse com a coordenação antes de comunicar dificuldades à família.','Use os resultados para ajustar o planejamento e acompanhe a evolução.'],
  'Olá, [nome do responsável]. Gostaríamos de conversar sobre observações feitas durante o acompanhamento pedagógico da criança. Nossa equipe registra evidências ao longo da rotina para entender avanços e necessidades, sempre em conjunto com a coordenação, sem rótulos ou comparações. Queremos alinhar com você as estratégias que podem apoiar o desenvolvimento nesta fase. Ficamos à disposição para marcar uma conversa.',
  '',
  true,
  '3.1-PROTOCOLO AVALIACAO DIAGNOSTICA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo da rotina do berçário',
  'Pedagógico',
  'Cuidado e convivência',
  ARRAY['berçário','bebê','sono','mamadeira','troca'],
  'revisao',
  'Organiza cuidados, sono, alimentação, higiene e segurança do berçário. Partes técnicas requerem revisão periódica.',
  ARRAY['Confira a escala, os registros individuais e as orientações vigentes de cada bebê.','Prepare o ambiente de sono, alimentação, troca e exploração com segurança.','Siga a rotina individual, mantendo supervisão contínua e higiene entre atendimentos.','Registre alimentação, sono, trocas, sinais observados e intercorrências.','Comunique imediatamente à coordenação qualquer sinal de mal-estar ou risco.','Faça a passagem de informações à família somente pelos canais institucionais.'],
  'Olá, [nome do responsável]. Compartilhamos as informações do dia do bebê na escola: alimentação, sono, trocas e observações da rotina, registradas pela equipe do berçário. Qualquer sinal de mal-estar é comunicado imediatamente à coordenação e, quando necessário, a você. Estamos à disposição pelo canal institucional para qualquer dúvida sobre os cuidados.',
  '',
  true,
  '3.2-PROTOCOLO DE ROTINA DO BERÇÁRIO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de cumprimento de rotina',
  'Pedagógico',
  'Rotina pedagógica',
  ARRAY['rotina','horário','organização','atividades'],
  'validado',
  'Reforça a organização temporal do dia e a previsibilidade como elementos de segurança e aprendizagem.',
  ARRAY['Revise a rotina diária e distribua responsabilidades antes do início do período.','Prepare ambientes e materiais com antecedência.','Mantenha os horários como referência, adaptando-os às necessidades reais das crianças.','Avise a coordenação quando uma intercorrência exigir mudança relevante.','Registre o que não foi realizado e reorganize o planejamento.','Ao final do dia, confirme pendências, comunicação às famílias e preparação do próximo período.'],
  '',
  '',
  true,
  '3.3-PROTOCOLO DE ROTINA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de agenda',
  'Pedagógico',
  'Comunicação e privacidade',
  ARRAY['agenda','ClassApp','recado','mensagem','comunicação'],
  'revisao',
  'Orienta a comunicação diária com as famílias. Menções a medicamentos devem seguir a política técnica atualizada.',
  ARRAY['Registre somente informações necessárias, objetivas e respeitosas sobre o dia da criança.','Revise nomes, horários e destinatários antes de enviar.','Use o canal institucional e nunca misture informações de crianças diferentes.','Em ocorrências sensíveis, converse primeiro com a coordenação.','Não inclua diagnóstico, dose ou orientação médica sem fluxo formal validado.','Confirme mensagens pendentes e arquive os registros conforme a política da unidade.'],
  'Olá, [nome do responsável]. Segue o registro do dia da criança na escola, com as informações necessárias sobre a rotina. Qualquer ocorrência mais sensível é conversada primeiro com a coordenação antes de chegar até você, e assuntos de saúde seguem sempre o fluxo formal validado. Estamos à disposição pelo canal institucional para esclarecer qualquer ponto da agenda.',
  '',
  true,
  '3.4-PROTOCOLO AGENDA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de relatórios',
  'Pedagógico',
  'Rotina pedagógica',
  ARRAY['relatório','desenvolvimento','parecer','registro'],
  'validado',
  'Define dimensões cognitivas, sociais e de desenvolvimento que devem orientar os relatórios.',
  ARRAY['Reúna registros do período e exemplos concretos de aprendizagem e convivência.','Organize o texto por dimensões de desenvolvimento previstas para a turma.','Descreva avanços e desafios sem rótulos, diagnósticos ou comparações.','Indique estratégias pedagógicas já realizadas e próximos objetivos.','Submeta o relatório à revisão da coordenação.','Só compartilhe a versão validada pelo canal institucional.'],
  'Olá, [nome do responsável]. Segue o relatório de desenvolvimento da criança referente ao período, já revisado pela coordenação. Nele você encontra avanços, desafios observados e os próximos objetivos pedagógicos, sem rótulos ou comparações com outras crianças. Estamos à disposição para conversar sobre qualquer ponto do relatório.',
  '',
  true,
  '4.0-PROTOCOLO DE RELATÓRIO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo dos objetivos das turmas',
  'Pedagógico',
  'Desenvolvimento infantil',
  ARRAY['objetivos','turma','maternal','faixa etária'],
  'validado',
  'Organiza os objetivos gerais e específicos por turma e etapa de desenvolvimento.',
  ARRAY['Confirme a turma, a faixa etária e o documento de objetivos vigente.','Selecione objetivos adequados ao momento do grupo e às necessidades individuais.','Relacione cada objetivo ao planejamento e às experiências propostas.','Observe evidências ao longo da rotina e registre a evolução.','Revise periodicamente as estratégias com a coordenação.','Comunique às famílias de forma clara, sem prometer resultados padronizados.'],
  'Olá, [nome do responsável]. Gostaríamos de compartilhar os objetivos pedagógicos definidos para a turma da criança nesta etapa. Eles orientam o planejamento e as experiências propostas no dia a dia, considerando o ritmo do grupo e as necessidades individuais, sem promessas de resultados padronizados. Estamos à disposição para conversar sobre o desenvolvimento da criança.',
  '',
  true,
  '4.1-PROTOCOLO DOS OBJETIVOS DA TURMA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de alfabetização',
  'Pedagógico',
  'Desenvolvimento infantil',
  ARRAY['alfabetização','leitura','escrita','fônico'],
  'validado',
  'Apresenta os princípios e o método adotado pelo Fadelito para alfabetização.',
  ARRAY['Confirme os objetivos previstos para a etapa e o material adotado pela rede.','Planeje experiências de linguagem oral, consciência fonológica, leitura e escrita.','Apresente propostas lúdicas e graduais, respeitando diferentes ritmos.','Observe estratégias e hipóteses das crianças, sem constrangimento ou comparação.','Registre avanços e ajuste as intervenções com a coordenação.','Converse com a família usando evidências pedagógicas e orientações validadas.'],
  'Olá, [nome do responsável]. Gostaríamos de compartilhar como está o processo de alfabetização da criança, com base nas evidências pedagógicas observadas pela equipe. As propostas respeitam o ritmo individual, sem comparações ou constrangimento, e são ajustadas com a coordenação sempre que necessário. Ficamos à disposição para conversar sobre o método e a evolução até aqui.',
  '',
  true,
  '5.0-PROTOCOLO DE ALFABETIZAÇÃO .docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo Baby Learning',
  'Pedagógico',
  'Desenvolvimento infantil',
  ARRAY['baby learning','bebê','desenvolvimento','estímulo'],
  'revisao',
  'Apresenta o programa multidisciplinar de desenvolvimento dos bebês. Credenciais e contatos devem ser atualizados.',
  ARRAY['Consulte a versão atual do programa e os objetivos previstos para o grupo.','Prepare o espaço e os materiais adequados à idade e ao desenvolvimento dos bebês.','Realize as propostas com supervisão próxima e respeito aos sinais individuais.','Interrompa qualquer atividade diante de desconforto ou risco.','Registre a resposta dos bebês e compartilhe com a coordenação.','Ajuste a continuidade somente após validação da equipe pedagógica.'],
  'Olá, [nome do responsável]. Gostaríamos de compartilhar como o bebê tem respondido às propostas do programa Baby Learning nesta etapa. A equipe conduz as atividades com supervisão próxima, respeitando os sinais individuais e interrompendo qualquer proposta diante de desconforto. Os resultados observados são compartilhados com a coordenação antes de qualquer ajuste na continuidade. Estamos à disposição para conversar sobre o desenvolvimento do bebê no programa.',
  '',
  true,
  '5.1-PROTOCOLO BABY LEARNING.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de férias da Rede Fadelito',
  'Pedagógico',
  'Gestão da unidade',
  ARRAY['férias','escala','ausência','equipe'],
  'validado',
  'Orienta o cronograma e a cobertura da equipe durante os períodos de férias.',
  ARRAY['Levante ausências previstas e necessidades mínimas de cobertura por setor.','Monte a escala sem comprometer segurança, supervisão e atendimento às famílias.','Valide datas e substituições com a liderança responsável.','Comunique individualmente os períodos aprovados e registre a ciência.','Prepare a passagem de tarefas, acessos e pendências antes do afastamento.','Revise a escala diante de mudanças e mantenha uma versão oficial atualizada.'],
  '',
  '',
  true,
  '6.0-PROTOCOLO DE FERIAS PEDAGOGICO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de transição para o minimaternal',
  'Pedagógico',
  'Desenvolvimento infantil',
  ARRAY['transição','minimaternal','mini maternal','mudança de turma'],
  'validado',
  'Organiza a preparação da criança e da família para a mudança de turma e rotina.',
  ARRAY['Avalie com a coordenação os sinais de prontidão para a mudança de turma.','Planeje aproximações graduais com o novo ambiente, educadores e rotina.','Compartilhe informações relevantes entre as equipes, preservando a privacidade.','Comunique à família os objetivos e como a transição acontecerá.','Observe a criança nos primeiros dias e registre sua adaptação.','Reavalie o ritmo e ofereça apoio adicional quando necessário.'],
  'Olá, [nome do responsável]. Gostaríamos de conversar sobre a transição da criança para o minimaternal. A coordenação já avaliou os sinais de prontidão e vamos planejar juntos uma aproximação gradual ao novo ambiente, aos novos educadores e à nova rotina. Acompanharemos de perto os primeiros dias e ajustaremos o ritmo conforme a necessidade da criança. Estamos à disposição para alinhar os próximos passos com você.',
  '',
  true,
  '6.1-PROTOCOLO DE TRANSIÇAO DO BERÇARIO PARA O MINI.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de manutenção de aluno',
  'Em comum',
  'Família e acolhimento',
  ARRAY['manutenção','retenção','insatisfação','responsável'],
  'validado',
  'Reforça o contato próximo com as famílias e a agilidade no retorno a dúvidas ou insatisfações.',
  ARRAY['Mantenha presença ativa nos horários de entrada e saída e escute as famílias.','Identifique rapidamente sinais de insatisfação, afastamento ou risco de cancelamento.','Registre a demanda e dê retorno inicial pelo canal institucional.','Defina responsável, solução possível e prazo realista para conclusão.','Acompanhe o combinado até o fechamento e confirme a satisfação da família.','Leve padrões recorrentes à reunião de gestão para correção de causa.'],
  'Olá, [nome do responsável]. Recebemos sua manifestação e queremos entender melhor como podemos ajudar. Registramos a demanda e já definimos um responsável e um prazo para retornarmos com uma solução pelo canal institucional. Sua satisfação é importante para nós e vamos acompanhar o combinado até a conclusão.',
  '',
  true,
  '6.2- PROTOCOLO DE MANUTENÇÃO DE ALUNOS.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de faltas e atrasos da equipe',
  'Pedagógico',
  'Gestão da unidade',
  ARRAY['atraso','falta de funcionário','colaborador','escala'],
  'validado',
  'Orienta a comunicação de ausências e a reorganização da equipe para preservar a segurança dos alunos.',
  ARRAY['Receba a comunicação e registre horário, motivo e função afetada.','Reorganize a cobertura imediatamente, preservando a proporção e a segurança das turmas.','Informe a liderança e o setor responsável conforme o fluxo vigente.','Não discuta detalhes pessoais do colaborador com a equipe ou famílias.','Atualize ponto, escala e documentos pelos canais oficiais.','Analise reincidências com RH e direção, sem tomar decisões trabalhistas pela demonstração.'],
  '',
  '',
  true,
  '7.0-PROTOCOLO FALTAS E ATRASOS.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de festa de aniversário',
  'Pedagógico',
  'Família e acolhimento',
  ARRAY['aniversário','festa','bolo','comemoração'],
  'validado',
  'Orienta a organização das comemorações de aniversário na escola.',
  ARRAY['Confirme com a família a data, o formato permitido e as restrições da unidade.','Verifique autorizações, alergias e regras alimentares antes de aceitar itens.','Organize horário e espaço sem prejudicar a rotina pedagógica.','Evite exposição de crianças sem autorização de imagem.','Acompanhe a distribuição dos itens e preserve a higiene.','Registre a realização e devolva pertences conforme o combinado.'],
  'Olá, [nome do responsável]. Vamos combinar os detalhes da comemoração de aniversário da criança na escola: data, formato permitido e restrições da unidade. Pedimos que confirme alergias e regras alimentares antes do envio de qualquer item, e lembramos que a exposição de imagens segue apenas as autorizações já registradas. Ficamos à disposição para alinhar horário e espaço com você.',
  '',
  true,
  '8.3-PROTOCOLO DE ANIVERSÁRIO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de organização da mochila',
  'Pedagógico',
  'Cuidado e convivência',
  ARRAY['mochila','pertences','roupa','organização'],
  'validado',
  'Orienta o cuidado, a identificação e a organização dos pertences das crianças.',
  ARRAY['Confira a identificação da mochila e dos pertences.','Separe itens limpos, usados, alimentação e materiais de higiene conforme a rotina.','Registre faltas, trocas ou itens que precisam ser repostos.','Nunca coloque materiais potencialmente contaminados junto a itens limpos.','Revise a mochila antes da saída para evitar trocas entre crianças.','Comunique a família de forma objetiva pelo canal institucional.'],
  'Olá, [nome do responsável]. Ao organizar a mochila da criança, identificamos uma pendência de item, troca ou reposição para a rotina. Pedimos a gentileza de conferir e providenciar o necessário antes da próxima aula. Qualquer dúvida sobre o que falta, estamos à disposição pelo canal institucional.',
  '',
  true,
  '9.0-PROTOCOLO DE ORGANIZAÇAO DE MOCHILA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo para escovação',
  'Pedagógico',
  'Cuidado e convivência',
  ARRAY['escovação','dente','escova','higiene bucal'],
  'revisao',
  'Organiza a rotina de higiene bucal. A técnica e as recomendações de saúde devem ser validadas periodicamente.',
  ARRAY['Confirme a identificação individual de escova e demais materiais.','Organize pequenos grupos e supervisão suficiente para evitar trocas.','Higienize as mãos e prepare o espaço conforme a orientação vigente.','Conduza a escovação de forma educativa, sem forçar a criança.','Guarde os itens separados e em condições de higiene.','Interrompa e consulte a coordenação diante de sangramento, dor ou outra intercorrência.'],
  '',
  '',
  true,
  '9.1-PROTOCOLO DE ESCOVAÇAO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de reunião pedagógica',
  'Pedagógico',
  'Gestão da unidade',
  ARRAY['reunião','pedagógica','alinhamento','equipe'],
  'validado',
  'Define objetivos de alinhamento, planejamento, solução de problemas e formação da equipe.',
  ARRAY['Defina previamente o tema pedagógico, os objetivos e quem conduzirá o encontro.','Reúna registros ou situações concretas que ajudem a discussão.','Mantenha a pauta focada em prática pedagógica, formação e protocolos.','Distribua tempo para estudo, troca de experiências e encaminhamentos.','Registre decisões, responsáveis e prazos.','Acompanhe os combinados na reunião seguinte.'],
  '',
  '',
  true,
  '9.3-EVOLUIR 2019.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de webinar',
  'Em comum',
  'Gestão da unidade',
  ARRAY['webinar','treinamento','formação','vídeo'],
  'validado',
  'Organiza encontros curtos de formação e discussão dos protocolos da rede.',
  ARRAY['Organize um calendário de temas alinhado aos eventos e prioridades da rede.','Defina expositor, objetivo e material de apoio para cada encontro.','Reserve tempo curto para exposição e discussão prática.','Registre presença, dúvidas e decisões que precisam de validação.','Disponibilize a gravação ou síntese pelos canais institucionais.','Confirme como o conteúdo será multiplicado nas unidades.'],
  '',
  '',
  true,
  '10-PROTOCOLO WEBINAR.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de prevenção contra Covid-19',
  'Em comum',
  'Saúde e segurança',
  ARRAY['covid','coronavírus','álcool','máscara'],
  'revisao',
  'Documento histórico. Não deve orientar decisões atuais antes de revisão técnica e atualização formal.',
  ARRAY['Não aplique automaticamente as regras do documento histórico.','Consulte a política sanitária vigente e as orientações atuais da direção.','Mantenha as práticas permanentes de higiene e não compartilhamento de itens pessoais.','Diante de sintomas, siga o protocolo atual de saúde e comunicação com a família.','Registre a ocorrência sem divulgar diagnóstico ou dados pessoais.','Substitua este conteúdo quando a rede aprovar uma versão atualizada.'],
  '',
  'Conteúdo possivelmente desatualizado. Consulte a política sanitária vigente da escola.',
  true,
  '-PROTOCOLO DE CUIDADOS DE PREVENÇÃO CONTRA O COVID.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Planejamento pedagógico — estrutura detalhada',
  'Pedagógico',
  'Rotina pedagógica',
  ARRAY['planejamento','campos de experiência','metodologia','materiais','quinzena'],
  'validado',
  'Detalha a estrutura do planejamento quinzenal: objetivos, campos de experiência, dinâmica, registro, materiais, local e comunicação do dia.',
  ARRAY['Consulte os objetivos da turma e as observações atuais do grupo.','Preencha atividade dirigida, campo de experiência, objetivo, metodologia, materiais e local.','Descreva a dinâmica que despertará o interesse e o registro que finalizará a experiência.','Organize também atividades lúdicas, extras e observações do recado do dia.','Entregue no calendário definido e aguarde a supervisão da coordenação.','Corrija a versão e solicite materiais com antecedência.'],
  '',
  '',
  true,
  'PROTOCOLO PLANEJAMENTO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de rematrícula — fonte inconsistente',
  'Pedagógico',
  'Gestão da unidade',
  ARRAY['rematrícula','renovação','contrato','vaga'],
  'revisao',
  'O arquivo identificado como rematrícula contém, na prática, um trecho sobre escovação. Ele foi catalogado para correção, mas não oferece orientação segura de rematrícula.',
  ARRAY['Não utilize esse arquivo para orientar uma rematrícula.','Confirme com a direção qual é a versão correta e vigente do protocolo.','Localize o documento oficial de renovação, prazos, valores e responsáveis.','Substitua a fonte inconsistente no repositório oficial.','Somente após validação, publique o novo roteiro no Assistente Fadelito.'],
  '',
  'Inconsistência documental: título e conteúdo não correspondem.',
  true,
  '10.3-PROTOCOLO DE REMATRÍCULA.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de treinamento Engage Pedagógico',
  'Pedagógico',
  'Gestão da unidade',
  ARRAY['engage','treinamento','trilha','integração','curso'],
  'revisao',
  'Organiza o acesso e a sequência de trilhas de integração e formação pedagógica na plataforma Engage, conforme a função do colaborador.',
  ARRAY['Confirme se a plataforma, os módulos e o roteiro da função continuam vigentes.','Solicite o cadastro institucional do colaborador e oriente a criação de senha pessoal segura.','Defina a pessoa responsável por acompanhar o treinamento local.','Siga a ordem de trilhas prevista para a função, sem pular etapas essenciais.','Registre conclusão, pontuação e dificuldades encontradas.','Quando a pontuação mínima não for atingida, ofereça apoio e refaça a etapa conforme a regra atual.'],
  '',
  'O documento contém uma senha provisória antiga. Ela não deve ser exibida nem reutilizada; confirme o procedimento atual de acesso.',
  true,
  '9.2-PROTOCOLO DO ENGAGE PEDAGÓGICO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de contratação',
  'Em comum',
  'Proteção e conduta',
  ARRAY['contratação','rh','candidato','teste','integração','admissão'],
  'revisao',
  'Organiza responsabilidades de seleção, teste, feedback, integração e treinamento de novos colaboradores. As regras de remuneração e jornada precisam de validação atual do RH.',
  ARRAY['Confirme com o RH a vaga, o perfil, a jornada, a remuneração e o responsável pela avaliação.','Receba o candidato, explique a etapa e preserve seus dados pessoais.','Aplique somente testes e critérios previamente aprovados pelo RH.','Registre a avaliação com fatos objetivos e dê retorno respeitoso no prazo combinado.','Não confirme contratação, diária ou condição trabalhista sem autorização formal.','Após aprovação, siga o checklist vigente de documentos, integração, acessos e treinamento.'],
  '',
  'Conteúdo trabalhista e de privacidade em revisão. A decisão final é do RH e da direção.',
  true,
  '10.1-PROTOCOLO RH-CONTRATAÇÃO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de almoço Colaborador Mais',
  'Administrativo',
  'Gestão da unidade',
  ARRAY['colaborador mais','almoço','premiação','reconhecimento','mérito'],
  'revisao',
  'Descreve um programa de reconhecimento mensal de colaboradores, com critérios de desempenho, comunicação do resultado e organização da confraternização.',
  ARRAY['Confirme com RH se o programa, o calendário e os critérios continuam ativos.','Avalie apenas critérios documentados, objetivos e aplicáveis a todas as pessoas elegíveis.','Registre a justificativa da indicação sem expor informações pessoais indevidas.','Envie a indicação ao canal institucional dentro do prazo vigente.','Comunique o resultado de forma respeitosa e motivadora para toda a equipe.','Organize convite, certificado, logística e cobertura da unidade com os responsáveis atuais.'],
  '',
  'Critérios, contatos e meses do evento são históricos e precisam ser atualizados.',
  true,
  'PROTOCOLO DE ALMOÇO COLABORADOR MAIS.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de lago e aquário',
  'Administrativo',
  'Saúde e segurança',
  ARRAY['aquário','lago','peixe','ração','limpeza','filtro'],
  'revisao',
  'Define responsabilidades de aparência, alimentação, limpeza e manutenção dos aquários e lagos das unidades, preservando segurança, bem-estar animal e boa conservação.',
  ARRAY['Inspecione diariamente água, iluminação, odor, equipamentos e comportamento dos animais.','Mantenha crianças afastadas de equipamentos, produtos e áreas de manutenção.','Alimente somente com produto e quantidade definidos pelo responsável técnico atual.','Registre necessidade de limpeza, falha de filtro, vazamento ou animal doente.','Isole a área diante de risco e acione manutenção ou serviço especializado.','Confirme a rotina periódica e o responsável de cada unidade.'],
  '',
  'Valide frequência, alimentação e cuidados com profissional especializado; o documento é de 2020.',
  true,
  'PROTOCOLO DE LAGO E AQUARIO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de relógio de ponto',
  'Administrativo',
  'Gestão da unidade',
  ARRAY['ponto','relógio','horas extras','atraso','falta','digital','espelho'],
  'revisao',
  'Organiza o registro diário de jornada, cadastro, fechamento do ponto e tratamento de ocorrências pela área administrativa.',
  ARRAY['Confirme o cadastro, horário e vínculo do colaborador no sistema vigente.','Oriente as marcações obrigatórias e a guarda dos comprovantes conforme a política atual.','Registre falhas técnicas e use somente o procedimento manual aprovado.','No fechamento, confira marcações, ausências e autorizações com documentos oficiais.','Encaminhe divergências e horas extras para validação da liderança e do RH.','Proteja dados biométricos e relatórios de jornada com acesso restrito.'],
  '',
  'Regras de atestados, horas extras e descontos exigem revisão jurídica e do RH.',
  true,
  'PROTOCOLO DE RELOGIO DE PONTO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo do jantar Melhor Escola do Mês',
  'Administrativo',
  'Gestão da unidade',
  ARRAY['melhor escola','jantar','premiação','matrícula','cancelamento','resultado'],
  'revisao',
  'Documento histórico de reconhecimento de unidades com base em matrículas, cancelamentos e lotação, incluindo divulgação e opções de premiação.',
  ARRAY['Confirme com a direção se a campanha e os critérios continuam vigentes.','Extraia os indicadores do período a partir da base oficial.','Aplique apenas a fórmula e as regras formalmente aprovadas para o ciclo atual.','Submeta o resultado para conferência antes de anunciar vencedores.','Comunique o resultado e as condições da premiação pelos canais institucionais.','Organize evento, orçamento, fornecedores e cobertura da unidade com responsáveis definidos.'],
  '',
  'Fórmula, prazos e opções de prêmio do documento podem estar desatualizados.',
  true,
  'PROTOCOLO DO JANTAR MELHOR ESCOLA DO MÊS.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de manutenção predial',
  'Administrativo',
  'Saúde e segurança',
  ARRAY['manutenção','pintura','vazamento','lâmpada','torneira','ferramenta','escada'],
  'validado',
  'Orienta a conservação dos ambientes e a execução segura de serviços, com isolamento da área, controle de ferramentas e uso responsável de materiais.',
  ARRAY['Registre a necessidade, o local, a urgência e o risco observado.','Isole a área antes do serviço e mantenha crianças afastadas.','Organize ferramentas, escadas, extensões e pequenos materiais sem deixá-los acessíveis.','Use materiais aprovados, sem improvisações elétricas ou estruturais.','Faça vistoria e limpeza completa ao concluir o serviço.','Libere o ambiente somente após confirmar segurança e funcionamento.'],
  '',
  '',
  true,
  'PROTOCOLO MANUTENÇAO X.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Protocolo de rescisão de estágio',
  'Administrativo',
  'Proteção e conduta',
  ARRAY['rescisão','estágio','desligamento','uniforme','acesso','documentos'],
  'revisao',
  'Apresenta um checklist administrativo para encerramento de estágio, cálculos, documentos, devolução de itens, retirada de acessos e arquivamento.',
  ARRAY['Acione o RH e confirme a data, o motivo e o instrumento de encerramento.','Confira contrato, ponto e documentos usando somente a base oficial e acesso restrito.','Calcule valores e descontos exclusivamente no modelo validado por RH e contabilidade.','Providencie vias, assinaturas, comprovantes e pagamento conforme o fluxo aprovado.','Recolha uniformes e patrimônios e revogue acessos a sistemas e grupos institucionais.','Arquive a documentação na pasta correta, respeitando proteção e retenção de dados.'],
  '',
  'O arquivo contém dados pessoais e exemplos antigos. Eles não são exibidos no aplicativo. Cálculos e regras precisam de validação do RH/contabilidade.',
  true,
  'PROTOCOLO TERMO DE RESCISÃO.docx');

INSERT INTO public.protocolos
  (titulo, area, categoria, palavras_chave, status, resumo, acoes, mensagem_familia, atencao, publicado, fonte)
VALUES
  ('Pais aniversariantes — fonte inconsistente',
  'Administrativo',
  'Família e acolhimento',
  ARRAY['pais aniversariantes','carta','aniversário dos pais','visita','whatsapp'],
  'revisao',
  'O arquivo chamado “Pais aniversariantes” contém orientações de recepção, cadastro e retorno após visita. Foi mantido para revisão documental, sem assumir que esse seja o protocolo correto.',
  ARRAY['Não utilize o conteúdo como rotina de aniversário antes da validação.','Confirme com marketing ou direção qual é a finalidade atual do documento.','Localize o modelo correto de mensagem e a base autorizada de aniversariantes.','Revise canais, prazos, consentimento e proteção de dados pessoais.','Renomeie ou substitua o arquivo no repositório oficial.','Publique o novo roteiro somente depois da aprovação.'],
  '',
  'Inconsistência documental: título e conteúdo não correspondem; há contatos e mensagens históricas que precisam ser revistos.',
  true,
  'PAIS ANIVERSARIANTES.docx');

COMMIT;
