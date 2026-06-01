-- Vérification et ajout des policies RLS manquantes pour la page publique

-- 1. Lecture publique des formulaires publiés (normalement déjà présent)
DROP POLICY IF EXISTS "Public can read published forms" ON forms;
CREATE POLICY "Public can read published forms"
ON forms FOR SELECT
USING (status = 'published');

-- 2. Lecture publique des champs des formulaires publiés (normalement déjà présent)
DROP POLICY IF EXISTS "Public can read fields of published forms" ON fields;
CREATE POLICY "Public can read fields of published forms"
ON fields FOR SELECT
USING (
  form_id IN (
    SELECT id FROM forms WHERE status = 'published'
  )
);

-- 3. Lecture publique des logic_rules des formulaires publiés
DROP POLICY IF EXISTS "Public can read logic_rules of published forms" ON logic_rules;
CREATE POLICY "Public can read logic_rules of published forms"
ON logic_rules FOR SELECT
USING (
  form_id IN (
    SELECT id FROM forms WHERE status = 'published'
  )
);

-- 4. Insertion publique des soumissions (normalement déjà présent)
DROP POLICY IF EXISTS "Anyone can submit to published forms" ON submissions;
CREATE POLICY "Anyone can submit to published forms"
ON submissions FOR INSERT
WITH CHECK (
  form_id IN (
    SELECT id FROM forms WHERE status = 'published'
  )
);

-- 5. Vérification que les tables ont RLS activé
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE logic_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;