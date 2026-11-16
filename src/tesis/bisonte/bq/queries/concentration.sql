-- Bisonte · concentration · v1  (M7 transacciones de los 10 firmantes más activos frente al total, por día)
-- Parámetros: @start_date DATE, @end_date DATE (fin exclusivo)
WITH per_signer AS (
  SELECT block_date, signer_account_id, COUNT(*) AS n
  FROM `bigquery-public-data.crypto_near_mainnet_us.transactions`
  WHERE block_date >= @start_date
    AND block_date <  @end_date
  GROUP BY block_date, signer_account_id
),
ranked AS (
  SELECT block_date, n, ROW_NUMBER() OVER (PARTITION BY block_date ORDER BY n DESC) AS rk
  FROM per_signer
)
SELECT
  FORMAT_DATE('%F', block_date) AS date,
  SUM(IF(rk <= 10, n, 0))       AS top10_transactions,
  SUM(n)                        AS total_transactions
FROM ranked
GROUP BY block_date
ORDER BY block_date;
