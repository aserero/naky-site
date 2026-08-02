-- B2B : seule la raison sociale est obligatoire → email optionnel.
-- (la contrainte unique reste : plusieurs NULL sont permis, pas deux fois le même email)
alter table public.clients alter column email drop not null;
