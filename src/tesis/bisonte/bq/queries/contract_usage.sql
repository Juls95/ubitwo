-- Bisonte · contract_usage · v1  (M5 contratos principales por día según llamadas a funciones, con llamadores distintos)
-- Parámetros: @start_date DATE, @end_date DATE (fin exclusivo), @top_n INT64
WITH per_contract AS (
  SELECT
    block_date,
    receipt_receiver_account_id       AS contract,
    COUNT(*)                          AS calls,
    COUNT(DISTINCT signer_account_id) AS distinct_callers
  FROM `bigquery-public-data.crypto_near_mainnet_us.receipt_actions`
  WHERE block_date >= @start_date
    AND block_date <  @end_date
    AND action_kind = 'FUNCTION_CALL'
  GROUP BY block_date, contract
)
SELECT FORMAT_DATE('%F', block_date) AS date, contract, calls, distinct_callers
FROM per_contract
QUALIFY ROW_NUMBER() OVER (PARTITION BY block_date ORDER BY calls DESC) <= @top_n
ORDER BY block_date, calls DESC;
