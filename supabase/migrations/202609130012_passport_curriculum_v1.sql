-- KIVRYN Passport V1 launch curriculum.
-- Preserves progress on the original generic Studio language lessons while
-- replacing them in active catalogs with a compact A0-C1 readiness path.

update public.studio_lessons l
set active = false, updated_at = now()
from public.studio_tracks t
where l.track_id = t.id
  and t.category = 'language'
  and l.slug in ('first-steps', 'guided-practice');

with localized(track_slug, difficulty, title, example_text, listening_text) as (
  values
    ('english','A0','A0 · Foundations','Hello, I’m Bruno. Nice to meet you. Can I have some water, please?','Hi, my name is Bruno. Nice to meet you. Excuse me, I need some help, please.'),
    ('english','A1','A1 · Travel basics','Where is gate twenty-four? I have a reservation under Brandão.','Excuse me, where is the check-in desk for this flight? Hello, I have a reservation. What time is breakfast?'),
    ('english','A2','A2 · Everyday navigation','I’d like the grilled fish, and could I have the sauce on the side? Go straight for two blocks, then turn left at the pharmacy.','Could you tell me if this dish contains nuts? Which line should I take to get to the city center?'),
    ('english','B1','B1 · Problems & social conversation','My suitcase hasn’t arrived yet. Could you tell me what I should do next? I’ve been working on an AI project lately. What kind of projects are you interested in?','My train was cancelled, so I need to know what alternative routes are available. That sounds interesting. How did you get started with it?'),
    ('english','B2','B2 · Work & opinions','I’ve reviewed the proposal, and I’d like to clarify two assumptions before we move forward. I see why that option is attractive, but I’m concerned about the long-term cost. Could we compare both approaches?','Could we revisit the deadline? I want to make sure the scope and resources are aligned. I agree with the goal; I’m not convinced this is the best method to achieve it.'),
    ('english','C1','C1 · Nuance & register','While the evidence is promising, it would be premature to treat the result as conclusive. Would you mind if we revisited that point? I may have interpreted your earlier comment differently.','The proposal is compelling in principle, although its practical impact will depend on how consistently it is implemented. I appreciate your perspective. Perhaps we could frame the issue in a way that reflects both concerns.'),
    ('spanish','A0','A0 · Fundamentos','Hola, me llamo Bruno. Mucho gusto. ¿Me puede dar un poco de agua, por favor?','Hola, soy Bruno. Encantado de conocerte. Disculpe, necesito ayuda, por favor.'),
    ('spanish','A1','A1 · Viajes básicos','¿Dónde está la puerta veinticuatro? Tengo una reserva a nombre de Brandão.','Disculpe, ¿dónde está el mostrador de facturación de este vuelo? Hola, tengo una reserva. ¿A qué hora es el desayuno?'),
    ('spanish','A2','A2 · Situaciones cotidianas','Quisiera el pescado a la plancha y la salsa aparte, por favor. Siga recto dos manzanas y luego gire a la izquierda en la farmacia.','¿Podría decirme si este plato contiene frutos secos? ¿Qué línea debo tomar para llegar al centro de la ciudad?'),
    ('spanish','B1','B1 · Problemas y conversación social','Mi maleta todavía no ha llegado. ¿Podría decirme qué debo hacer ahora? Últimamente estoy trabajando en un proyecto de inteligencia artificial. ¿Qué tipo de proyectos te interesan?','Mi tren fue cancelado, así que necesito saber qué rutas alternativas hay. Suena interesante. ¿Cómo empezaste con eso?'),
    ('spanish','B2','B2 · Trabajo y opiniones','He revisado la propuesta y me gustaría aclarar dos supuestos antes de seguir adelante. Entiendo por qué esa opción resulta atractiva, pero me preocupa el coste a largo plazo. ¿Podemos comparar ambos enfoques?','¿Podríamos revisar el plazo? Quiero asegurarme de que el alcance y los recursos estén alineados. Estoy de acuerdo con el objetivo, pero no estoy convencido de que este sea el mejor método para alcanzarlo.'),
    ('spanish','C1','C1 · Matiz y registro','Aunque la evidencia es prometedora, sería prematuro considerar el resultado concluyente. ¿Le importaría que volviéramos a ese punto? Puede que haya interpretado su comentario anterior de otra manera.','La propuesta es convincente en principio, aunque su impacto práctico dependerá de la constancia con la que se aplique. Aprecio su perspectiva. Quizá podríamos plantear el asunto de una forma que refleje ambas preocupaciones.'),
    ('portuguese','A0','A0 · Fundamentos','Olá, eu sou o Bruno. Prazer em conhecer você. Você pode me trazer um pouco de água, por favor?','Oi, meu nome é Bruno. Prazer em conhecer você. Com licença, eu preciso de ajuda, por favor.'),
    ('portuguese','A1','A1 · Viagem básica','Onde fica o portão vinte e quatro? Tenho uma reserva no nome Brandão.','Com licença, onde fica o balcão de check-in deste voo? Olá, tenho uma reserva. Que horas é o café da manhã?'),
    ('portuguese','A2','A2 · Situações cotidianas','Eu gostaria do peixe grelhado e do molho à parte, por favor. Siga em frente por dois quarteirões e vire à esquerda na farmácia.','Você poderia me dizer se este prato contém castanhas? Qual linha eu devo pegar para chegar ao centro da cidade?'),
    ('portuguese','B1','B1 · Problemas e conversa social','Minha mala ainda não chegou. Você poderia me dizer o que devo fazer agora? Ultimamente estou trabalhando em um projeto de inteligência artificial. Em que tipo de projeto você tem interesse?','Meu trem foi cancelado, então preciso saber quais rotas alternativas estão disponíveis. Parece interessante. Como você começou a trabalhar com isso?'),
    ('portuguese','B2','B2 · Trabalho e opiniões','Revisei a proposta e gostaria de esclarecer duas premissas antes de seguirmos em frente. Entendo por que essa opção parece atraente, mas me preocupa o custo no longo prazo. Podemos comparar as duas abordagens?','Podemos rever o prazo? Quero garantir que o escopo e os recursos estejam alinhados. Concordo com o objetivo, mas não tenho certeza de que este seja o melhor método para alcançá-lo.'),
    ('portuguese','C1','C1 · Nuance e registro','Embora as evidências sejam promissoras, seria prematuro tratar o resultado como conclusivo. Você se importaria se retomássemos aquele ponto? Talvez eu tenha interpretado seu comentário anterior de outra forma.','A proposta é convincente em princípio, embora o impacto prático dependa de quão consistentemente ela seja implementada. Agradeço sua perspectiva. Talvez possamos formular a questão de uma maneira que considere as duas preocupações.'),
    ('french','A0','A0 · Fondamentaux','Bonjour, je m’appelle Bruno. Enchanté. Est-ce que je peux avoir un peu d’eau, s’il vous plaît ?','Bonjour, je suis Bruno. Ravi de vous rencontrer. Excusez-moi, j’ai besoin d’aide, s’il vous plaît.'),
    ('french','A1','A1 · Bases du voyage','Où se trouve la porte vingt-quatre ? J’ai une réservation au nom de Brandão.','Excusez-moi, où se trouve le comptoir d’enregistrement pour ce vol ? Bonjour, j’ai une réservation. À quelle heure est le petit-déjeuner ?'),
    ('french','A2','A2 · Situations quotidiennes','Je voudrais le poisson grillé, avec la sauce à part, s’il vous plaît. Continuez tout droit pendant deux pâtés de maisons, puis tournez à gauche à la pharmacie.','Pourriez-vous me dire si ce plat contient des fruits à coque ? Quelle ligne dois-je prendre pour aller au centre-ville ?'),
    ('french','B1','B1 · Problèmes et conversation sociale','Ma valise n’est pas encore arrivée. Pourriez-vous me dire ce que je dois faire maintenant ? Ces derniers temps, je travaille sur un projet d’intelligence artificielle. Quels types de projets vous intéressent ?','Mon train a été annulé, donc j’ai besoin de connaître les itinéraires alternatifs disponibles. C’est intéressant. Comment avez-vous commencé dans ce domaine ?'),
    ('french','B2','B2 · Travail et opinions','J’ai examiné la proposition et j’aimerais clarifier deux hypothèses avant d’aller plus loin. Je comprends pourquoi cette option est intéressante, mais le coût à long terme me préoccupe. Pourrions-nous comparer les deux approches ?','Pourrions-nous revoir le délai ? Je veux m’assurer que le périmètre et les ressources sont bien alignés. Je suis d’accord avec l’objectif, mais je ne suis pas convaincu que ce soit la meilleure méthode pour l’atteindre.'),
    ('french','C1','C1 · Nuance et registre','Même si les éléments sont prometteurs, il serait prématuré de considérer le résultat comme concluant. Cela vous dérangerait-il que nous revenions sur ce point ? J’ai peut-être interprété votre remarque précédente différemment.','La proposition est convaincante en principe, même si son impact pratique dépendra de la régularité de sa mise en œuvre. J’apprécie votre point de vue. Nous pourrions peut-être formuler la question de manière à refléter les deux préoccupations.')
),
curriculum as (
  select
    track_slug,
    difficulty,
    title,
    example_text,
    listening_text,
    case difficulty
      when 'A0' then 'a0-foundations'
      when 'A1' then 'a1-travel-basics'
      when 'A2' then 'a2-everyday-navigation'
      when 'B1' then 'b1-problem-social'
      when 'B2' then 'b2-work-opinions'
      else 'c1-nuance-register'
    end as lesson_slug,
    case difficulty when 'A0' then 10 when 'A1' then 11 when 'A2' then 12 when 'B1' then 13 when 'B2' then 14 else 15 end as order_index,
    case difficulty when 'A0' then 12 when 'A1' then 14 when 'A2' then 15 when 'B1' then 16 when 'B2' then 18 else 20 end as estimated_minutes,
    case difficulty when 'A1' then 'Travel' when 'A2' then 'Travel' else 'Conversation' end as lesson_type,
    case difficulty
      when 'A0' then 'Cumprimentos, apresentações e pedidos essenciais para começar a se comunicar.'
      when 'A1' then 'Aeroporto, check-in, hotel e necessidades básicas de viagem.'
      when 'A2' then 'Restaurante, direções e transporte em situações cotidianas.'
      when 'B1' then 'Resolver problemas e sustentar conversas sociais com contexto.'
      when 'B2' then 'Comunicação profissional, opiniões, discordância e negociação.'
      else 'Nuance, precisão, registro e adaptação cultural em situações complexas.'
    end as description,
    case difficulty
      when 'A0' then 'Use frases curtas para se apresentar e fazer pedidos educados.'
      when 'A1' then 'Faça perguntas simples e claras em aeroporto e hotel.'
      when 'A2' then 'Combine preferências, pedidos e orientações em interações cotidianas.'
      when 'B1' then 'Explique problemas com contexto e use perguntas de continuidade.'
      when 'B2' then 'Estruture sua posição, reconheça outro ponto de vista e proponha caminhos.'
      else 'Use qualificadores, contraste e registro adequado para comunicar nuance.'
    end as explanation_pt,
    case difficulty
      when 'A0' then 'Use short sentences to introduce yourself and make polite requests.'
      when 'A1' then 'Ask simple, clear questions at airports and hotels.'
      when 'A2' then 'Combine preferences, requests and directions in everyday interactions.'
      when 'B1' then 'Explain problems with context and use follow-up questions.'
      when 'B2' then 'Structure your position, acknowledge another view and propose a way forward.'
      else 'Use qualifiers, contrast and appropriate register to communicate nuance.'
    end as explanation_en,
    case difficulty
      when 'A0' then 'Escreva duas apresentações e três pedidos úteis.'
      when 'A1' then 'Escreva uma pergunta de aeroporto e duas perguntas de hotel.'
      when 'A2' then 'Escreva um pedido de restaurante e uma rota com três etapas.'
      when 'B1' then 'Descreva um problema de viagem e continue uma conversa com uma pergunta.'
      when 'B2' then 'Transforme um pedido vago em mensagem clara e escreva uma discordância respeitosa.'
      else 'Reescreva uma afirmação absoluta com nuance e adapte uma mensagem ao registro formal.'
    end as exercise_pt,
    case difficulty
      when 'A0' then 'Write two introductions and three useful requests.'
      when 'A1' then 'Write one airport question and two hotel questions.'
      when 'A2' then 'Write a restaurant order and a three-step route.'
      when 'B1' then 'Describe a travel problem and continue a conversation with a follow-up question.'
      when 'B2' then 'Turn a vague request into a clear message and write a respectful disagreement.'
      else 'Rewrite an absolute claim with nuance and adapt a message to a formal register.'
    end as exercise_en,
    case difficulty
      when 'A0' then 'Simule um primeiro contato durante uma viagem.'
      when 'A1' then 'Simule aeroporto e hotel sem inventar preço ou disponibilidade real.'
      when 'A2' then 'Simule um pedido completo e depois explique como chegar a um local fictício.'
      when 'B1' then 'Resolva um problema fictício e mantenha quatro turnos de conversa social.'
      when 'B2' then 'Apresente um projeto e negocie uma decisão fictícia com contraproposta.'
      else 'Explique uma decisão complexa e adapte a mesma ideia a contextos casual e profissional.'
    end as task_pt,
    case difficulty
      when 'A0' then 'Simulate a first interaction while traveling.'
      when 'A1' then 'Simulate airport and hotel interactions without inventing real prices or availability.'
      when 'A2' then 'Simulate a complete order, then explain how to reach a fictional place.'
      when 'B1' then 'Solve a fictional problem and keep a four-turn social conversation.'
      when 'B2' then 'Present a project and negotiate a fictional decision with a counterproposal.'
      else 'Explain a complex decision and adapt the same idea to casual and professional contexts.'
    end as task_en
  from localized
)
insert into public.studio_lessons(
  track_id, slug, title, description, content, lesson_type, difficulty,
  order_index, estimated_minutes, premium, active, updated_at
)
select
  t.id,
  c.lesson_slug,
  c.title,
  c.description,
  jsonb_build_object(
    'explanation', c.explanation_en,
    'explanationPt', c.explanation_pt,
    'explanationEn', c.explanation_en,
    'example', c.example_text,
    'listening', c.listening_text,
    'exercise', c.exercise_en,
    'exercisePt', c.exercise_pt,
    'exerciseEn', c.exercise_en,
    'practicalTask', c.task_en,
    'practicalTaskPt', c.task_pt,
    'practicalTaskEn', c.task_en
  ),
  c.lesson_type,
  c.difficulty,
  c.order_index,
  c.estimated_minutes,
  false,
  true,
  now()
from curriculum c
join public.studio_tracks t
  on t.slug = c.track_slug
 and t.category = 'language'
on conflict (track_id, slug) do update
set title = excluded.title,
    description = excluded.description,
    content = excluded.content,
    lesson_type = excluded.lesson_type,
    difficulty = excluded.difficulty,
    order_index = excluded.order_index,
    estimated_minutes = excluded.estimated_minutes,
    premium = false,
    active = true,
    updated_at = now();

update public.studio_tracks
set description = case slug
  when 'english' then 'Practical English from survival basics to advanced international communication.'
  when 'spanish' then 'Practical Spanish from survival basics to advanced international communication.'
  when 'portuguese' then 'Practical Portuguese from survival basics to advanced international communication.'
  when 'french' then 'Practical French from survival basics to advanced international communication.'
  else description
end,
updated_at = now()
where category = 'language'
  and slug in ('english', 'spanish', 'portuguese', 'french');
