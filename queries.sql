-- ====================================================================
-- Requête SQL : Tri par ordre de rentabilité (dernier prix détecté)
-- ====================================================================

-- Option 1 : Pour un utilisateur spécifique (Recommandé)
-- Remplacez ':user_uuid' par l'UUID de l'utilisateur concerné.
WITH latest_profitability AS (
  SELECT *,
         ROW_NUMBER() OVER(
           PARTITION BY bien_id 
           ORDER BY recorded_at DESC, id DESC
         ) as rn
  FROM profitability_history
  WHERE user_uuid = :user_uuid
)
SELECT 
  bien_id,
  price,
  surface,
  bedrooms,
  dpe,
  rentability_brute,
  rentability_nette,
  cashflow_mensuel,
  score,
  verdict_signal,
  recorded_at
FROM latest_profitability
WHERE rn = 1
ORDER BY 
  rentability_nette DESC, 
  cashflow_mensuel DESC, 
  rentability_brute DESC, 
  price ASC;


-- Option 2 : Classement global de tous les biens (sans filtrer par utilisateur)
-- Utile si vous voulez voir le dernier état de chaque bien quel que soit l'utilisateur qui l'a scanné.
WITH latest_profitability AS (
  SELECT *,
         ROW_NUMBER() OVER(
           PARTITION BY bien_id 
           ORDER BY recorded_at DESC, id DESC
         ) as rn
  FROM profitability_history
)
SELECT 
  c.bien_id,
  b.source_url,
  c.user_uuid,
  c.price,
  c.surface,
  c.bedrooms,
  c.dpe,
  c.rentability_brute,
  c.rentability_nette,
  c.cashflow_mensuel,
  c.score,
  c.verdict_signal,
  c.recorded_at
FROM latest_profitability c
JOIN bien b ON b.id = c.bien_id
WHERE rn = 1
ORDER BY 
  rentability_nette DESC, 
  cashflow_mensuel DESC, 
  rentability_brute DESC, 
  price ASC;
