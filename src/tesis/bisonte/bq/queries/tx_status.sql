-- Bisonte · tx_status · v1  (M3 tasa de éxito; se conservan los valores crudos de status para que la correspondencia con éxito sea explícita en el código)
-- Parámetros: @start_date DATE, @end_date DATE (fin exclusivo)
SELECT
  FORMAT_DATE('%F', block_date) AS date,
  CAST(status AS STRING)        AS status,
  COUNT(*)                      AS transactions
FROM `bigquery-public-data.crypto_near_mainnet_us.transactions`
WHERE block_date >= @start_date
  AND block_date <  @end_date
GROUP BY block_date, status
ORDER BY block_date, status;
