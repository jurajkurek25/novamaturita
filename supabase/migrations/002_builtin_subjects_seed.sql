-- Builtin subjects are seeded per-user via trigger when profile is created.
-- We store a "template" in a separate table and copy on signup.

create table public.builtin_subject_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  language text not null,
  topics jsonb not null default '[]'
);

insert into public.builtin_subject_templates (name, description, language, topics) values
(
  'Slovenský jazyk a literatúra',
  'Ústna maturita zo slovenského jazyka a literatúry',
  'sk',
  '[
    {"title": "1. Literatúra národného obrodenia", "content": "Osvietenstvo, klasicizmus, romantizmus na Slovensku. Ján Kollár, Ján Hollý, Pavol Jozef Šafárik. Bernolákovská kodifikácia."},
    {"title": "2. Romantizmus v slovenskej literatúre", "content": "Štúrovská generácia. Ľudovít Štúr a kodifikácia spisovnej slovenčiny. Janko Kráľ, Samo Chalupka, Andrej Sládkovič (Marína, Detvan)."},
    {"title": "3. Realizmus v slovenskej próze", "content": "Svetozár Hurban Vajanský, Pavol Országh Hviezdoslav, Martin Kukučín (Dom v stráni, Keď báčik z Chochoľova umrie)."},
    {"title": "4. Slovenská moderna a symbolizmus", "content": "Ivan Krasko (Nox et solitudo, Verše). Janko Jesenský. Príklon k impresionizmu a symbolizmu."},
    {"title": "5. Medzivojnová literatúra", "content": "DAV, katolícka moderna, naturizmus. Milo Urban (Živý bič), Dobroslav Chrobák, František Švantner."},
    {"title": "6. Slovenská literatúra po roku 1945", "content": "Socialistický realizmus, lyrizovaná próza. Alfonz Bednár, Ladislav Mňačko, Dominik Tatarka."},
    {"title": "7. Svetová literatúra – antika", "content": "Homér (Ilias, Odysea), grécka tragédia (Sofokles, Euripides). Rímska literatúra – Vergílius, Ovídius."},
    {"title": "8. Renesancia a humanizmus", "content": "Dante, Petrarca, Boccaccio. William Shakespeare – tragédie, komédie, sonety. Cervantes."},
    {"title": "9. Klasicizmus a osvietenstvo vo svetovej literatúre", "content": "Moliére, Voltaire, Goethe (Faust), Schiller."},
    {"title": "10. Romantizmus vo svetovej literatúre", "content": "Byron, Puškin, Victor Hugo (Bedári, Notre-Dame de Paris), H.C. Andersen."},
    {"title": "11. Realizmus vo svetovej literatúre", "content": "Balzac, Flaubert, Dostojevskij (Zločin a trest), Tolstoj (Anna Karenina, Vojna a mier), Čechov."},
    {"title": "12. Moderná svetová literatúra 20. storočia", "content": "Kafka, Hemingway, Remarque (Na západe nič nového), Camus, Sartre, Orwell (1984, Farma zverat)."},
    {"title": "13. Slovenská poézia 2. polovice 20. storočia", "content": "Miroslav Válek, Milan Rúfus, Ján Stacho. Tematika existencializmu, každodennosti."},
    {"title": "14. Jazykové štýly a slohové postupy", "content": "Funkčné štýly: hovorový, umelecký, publicistický, odborný, administratívny. Slohové postupy a útvary."},
    {"title": "15. Syntax a morfológia slovenského jazyka", "content": "Vetné členy, druhy viet, súvetia. Slovné druhy – ohybné a neohybné. Skloňovanie, časovanie."}
  ]'::jsonb
),
(
  'Anglický jazyk',
  'Ústna maturita z anglického jazyka – úroveň B2',
  'en',
  '[
    {"title": "1. My family and relationships", "content": "Family structure, relationships, roles. Describing family members, talking about relationships, friendships. Vocabulary: family members, adjectives for personality."},
    {"title": "2. Education and school life", "content": "School system in Slovakia vs. UK/USA, types of schools, university life. Discussing advantages and disadvantages of different education systems."},
    {"title": "3. Work and career", "content": "Jobs, professions, workplace. Job interviews, career choices, work-life balance. Vocabulary: job titles, work conditions, skills."},
    {"title": "4. Health and lifestyle", "content": "Healthy vs. unhealthy lifestyle, diet, exercise, mental health. Medical situations, visiting a doctor. Common health problems and advice."},
    {"title": "5. Travel and tourism", "content": "Types of travel, transport, accommodation. Describing places, holiday experiences. Vocabulary: travel, booking, directions."},
    {"title": "6. Technology and the internet", "content": "Impact of technology on daily life, social media, online safety. Advantages and disadvantages of modern technology."},
    {"title": "7. Environment and nature", "content": "Environmental problems (climate change, pollution), solutions, recycling. Natural disasters, weather, geography."},
    {"title": "8. Food and eating habits", "content": "Slovak and world cuisine, healthy eating, food shopping. Describing food, restaurant situations, recipes."},
    {"title": "9. Culture, arts and entertainment", "content": "Music, film, theatre, books. Describing cultural events, expressing opinions about art. Slovak vs. global culture."},
    {"title": "10. Sports and free time", "content": "Popular sports, hobbies, leisure activities. Benefits of sport, discussing personal interests and activities."},
    {"title": "11. City and country life", "content": "Living in a city vs. countryside, housing, neighbourhood. Describing places, comparing environments."},
    {"title": "12. Shopping and services", "content": "Types of shops, online vs. in-store shopping, money and banking. Vocabulary: prices, payment, services."},
    {"title": "13. Social issues and values", "content": "Poverty, inequality, volunteering, human rights. Expressing opinions on social topics, discussing solutions."},
    {"title": "14. Media and communication", "content": "Types of media (TV, newspapers, internet), advertising. Critical thinking about media, discussing news."},
    {"title": "15. Slovakia and the world", "content": "Slovak history, traditions, geography. Comparing Slovakia with English-speaking countries, cultural differences."}
  ]'::jsonb
);

-- Function to provision builtin subjects for a new user
create or replace function public.provision_builtin_subjects(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_template record;
  v_subject_id uuid;
  v_topic jsonb;
  v_idx integer;
begin
  for v_template in select * from public.builtin_subject_templates loop
    insert into public.subjects (user_id, name, description, is_builtin, language)
    values (p_user_id, v_template.name, v_template.description, true, v_template.language)
    returning id into v_subject_id;

    v_idx := 0;
    for v_topic in select * from jsonb_array_elements(v_template.topics) loop
      insert into public.topics (subject_id, title, content, order_index)
      values (
        v_subject_id,
        v_topic->>'title',
        v_topic->>'content',
        v_idx
      );
      v_idx := v_idx + 1;
    end loop;
  end loop;
end;
$$;

-- Update the handle_new_user trigger to also provision subjects
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 10);

  insert into public.credit_transactions (user_id, amount, type, description)
  values (new.id, 10, 'bonus', 'Uvítací bonus pri registrácii');

  perform public.provision_builtin_subjects(new.id);

  return new;
end;
$$;
