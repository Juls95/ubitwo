-- Bisonte · freshness · v1
-- Último día con bloques. Lee solo las particiones de block_date dentro de la ventana.
-- Parámetros: @start_date DATE, @end_date DATE (fin exclusivo)
SELECT FORMAT_DATE('%F', MAX(block_date)) AS last_block_date
FROM `bigquery-public-data.crypto_near_mainnet_us.blocks`
WHERE block_date >= @start_date
  AND block_date <  @end_date;
