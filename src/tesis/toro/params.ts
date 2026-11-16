/**
 * Parámetros de análisis prerregistrados. Se fijaron antes de mirar los datos reales y se renderizan en TESIS.md
 * mediante marcadores {{param:*}}; todo cambio debe registrarse en la bitácora semanal de cambios.
 */
export const PARAMS = {
  regime_band_pct: 5,
  spike_multiple: 2,
  spike_persistence_days: 7,
  spike_persistence_multiple: 1.3,
  spike_concentration_pct: 40,
  lag_max_days: 14,
  lag_smoothing_days: 7,
  lag_min_r: 0.3,
  divergence_onchain_band_pct: 1,
  divergence_sentiment_band: 0.05,
  invalidation_quarters: 2,
  window_days: 30,
  // Capa técnica (precio). Prerregistrada igual que los parámetros on-chain.
  sma_fast_days: 50,
  sma_slow_days: 200,
  weekly_sma_weeks: 20,
  rsi_days: 14,
  atr_days: 14,
  npoc_impulse_atr: 2,
  npoc_body_share_pct: 60,
  npoc_proximity_pct: 8,
  range_lookback_days: 90,
  rs_lookback_days: 30,
  beta_lookback_days: 90,
  btc_wma_weeks: 50,
  tripwire_regain_weeks: 4,
  confluence_constructive_min: 5,
  confluence_defensive_max: 2,
  stop_beyond_npoc_pct: 2.5,
  risk_per_trade_pct: 1,
  example_account_usd: 10000,
} as const;

export type ParamId = keyof typeof PARAMS;

/** Estados de transacción que cuentan como éxito. Deben revisarse contra los valores reales de `transactions.status` antes de usarse en vivo. */
export const SUCCESS_STATUS_PREFIX = "SUCCESS";
