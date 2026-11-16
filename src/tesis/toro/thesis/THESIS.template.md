# NEAR investment thesis · ubitwo

{{block:mode_banner}}

Generated: {{label:generated_at}} · On-chain data through: {{label:last_block_date}} · Window: {{label:window_start}} to {{label:window_end}} · Mode: {{label:mode}}

Agents: **Bear** (desk and X reading), **Bison** (NEAR on-chain data, 1Click Swap, and price candles), **Bull** (synthesis). Every figure in this document comes from `metrics.json` or a labeled data file; none are written by hand, and each carries a provenance tag: computed, simulated, desk (a claim from a public account), or cited (an external document, unverified).

## 1. Thesis and stance

Real NEAR usage is shifting toward cross-chain execution (1Click Swap on NEAR Intents), and that volume leads general on-chain activity: active accounts and contract usage. Horizon: one to two years.

**Stance:** {{label:stance}}.

- **Direction (on-chain):** hypothesis {{label:hypothesis_verdict}}. Shift: {{label:shift_status}}. Lead: {{label:lead_status}}. Adoption regime: {{label:regime}}.
- **Timing (price):** technical bias {{label:technical_bias}} ({{metric:confluence_score}} of {{metric:confluence_total}} criteria met). Plan status: {{label:plan_status}}.
- **Context (Bitcoin):** weekly-average tripwire: {{label:btc_tripwire}}.

The regime gives direction, not timing. Direction comes from usage data; timing comes from price structure; Bitcoin's regime conditions both because NEAR moves {{metric:near_beta_90d}} times what BTC moves.

## 2. How this thesis is built

- **Fundamental lens**, taken from a corporate-style thesis: engagement, monetization, moat, threats, bull and bear cases. NEAR has no income statement, so each lens maps to a computable on-chain indicator and gaps are declared.
- **Macro lens**, taken from a Bitcoin research note: a technical floor, positioning, a fundamental narrative, sentiment, risks, and an explicit statement of what would change the view.
- **Technical lens**, from a range and nPOC framework: trend, range, Fibonacci levels, unfilled marks, relative strength, and multi-timeframe confluence.
- **Social lens**: what public desks say about NEAR in the author's Notion tables, treated as claims to verify.

## 3. Fundamentals: the usage engine

| Lens | NEAR indicator | Value | Provenance |
| --- | --- | --- | --- |
| Engagement growth | Median daily active accounts vs the prior thirty days | {{metric:daa_30d_change_pct}} | {{prov:daa_30d_change_pct}} |
| Engagement regime | Thirty-day median vs ninety-day median | {{metric:daa_30d_vs_90d_pct}} | {{prov:daa_30d_vs_90d_pct}} |
| Monetization proxy | 1Click Swap volume over thirty days | {{metric:intents_volume_30d_usd}} | {{prov:intents_volume_30d_usd}} |
| Usage intensity | 1Click swaps per thousand daily active accounts | {{metric:swaps_per_1k_daa}} | {{prov:swaps_per_1k_daa}} |
| Moat proxy | Intents contract share of contract calls | {{metric:intents_call_share_30d}} | {{prov:intents_call_share_30d}} |
| Cross-chain depth | Swaps across distinct chains | {{metric:intents_cross_chain_share_30d}} | {{prov:intents_cross_chain_share_30d}} |
| User quality | Share of transactions from the ten most active signers | {{metric:top10_share_median_30d}} | {{prov:top10_share_median_30d}} |
| Reliability | Successful transactions | {{metric:success_rate_30d}} | {{prov:success_rate_30d}} |

The pillars, one line each:

- **Pillar A, shift:** the Intents contract receives {{metric:intents_call_share_30d}} of contract calls ({{metric:intents_call_share_change_pp}} vs the prior window).
- **Pillar B, lead:** the correlation between 1Click swap growth and active-account growth peaks at a lag of {{metric:lag_best_days}} ({{metric:lag_best_r}}, {{label:lag_strength}} relationship).
- **Pillar C, activity quality:** meta-transactions are {{metric:meta_tx_share_30d}} of actions and the median accounts using them per day is {{metric:delegating_accounts_median_30d}}.

**What the reference corporate thesis teaches and where it stops.** That thesis rests on engagement converting into paying users: it reports a paid share of {{metric:ref_duol_paid_share_pct}}, daily active user growth of {{metric:ref_duol_dau_growth_pct}}, and a gross margin of {{metric:ref_duol_gross_margin_pct}} ({{prov:ref_duol_paid_share_pct}}, unverified). NEAR has no audited paid-conversion or gross-margin equivalent. The closest computable proxy is swaps per thousand accounts, an intensity ratio rather than a conversion rate. Retention also cannot be computed because addresses are not joined across datasets.

## 4. Macro regime: the Bitcoin lens

NEAR is a high-beta asset, so Bitcoin sets the regime. Over {{param:beta_lookback_days}} days, NEAR has a beta of {{metric:near_beta_90d}} vs BTC and a correlation of {{metric:near_btc_corr_90d}} ({{prov:near_beta_90d}}).

| Concept | Value | Provenance |
| --- | --- | --- |
| Latest BTC close | {{metric:btc_close}} | {{prov:btc_close}} |
| Weekly average ({{param:btc_wma_weeks}} weeks) | {{metric:btc_wma}} | {{prov:btc_wma}} |
| Close vs weekly average | {{metric:btc_vs_wma_pct}} | {{prov:btc_vs_wma_pct}} |
| Consecutive weekly closes below | {{metric:btc_weeks_below_wma}} | {{prov:btc_weeks_below_wma}} |
| Drawdown from the fifty-two-week closing high | {{metric:btc_drawdown_pct}} | {{prov:btc_drawdown_pct}} |
| Tripwire status | {{label:btc_tripwire}} | {{prov:btc_wma}} |

**Tripwire logic.** The Bitcoin reference note says its view changes if a weekly close below the weekly average is not recovered in roughly a month. Here that rule is tested on the price series with a recovery window of {{param:tripwire_regain_weeks}} weeks, and the state is: {{label:btc_tripwire}}.

**Contrast with desk notes.** A summary in the author's Notion cites BTC near {{metric:desk_btc_nov11_usd}} on November eleventh, which sits {{metric:desk_btc_vs_ref_tripwire_pct}} vs the reference note's {{metric:ref_btc_tripwire_usd}} level ({{prov:ref_btc_tripwire_usd}}). The rule refers to weekly closes and the desk cite is an intraday level, so this is context, not a trigger. The reference note also frames Bitcoin in monetary debasement, with federal debt of {{metric:ref_us_debt_trn}} trillion dollars and a ten-year yield of {{metric:ref_us_10y_pct}}, and places the cycle on day {{metric:ref_btc_cycle_day}} after the halving. Those are cited as note context, not as evidence about NEAR.

**How alts behaved in the latest selloff.** On the October selloff day, desks cite NEAR at {{metric:desk_near_move_oct25_pct}} and BTC at {{metric:desk_btc_move_oct25_pct}}, about {{metric:desk_alt_beta_ratio}} times stronger, with BTC dominance at {{metric:desk_btc_dominance_oct25_pct}}. TickersInfo records NEAR price prints of {{metric:desk_near_print_oct15}} and {{metric:desk_near_print_oct25}}, a change of {{metric:desk_near_print_change_pct}} between them.

## 5. Technical read: range, nPOC, and confluence

Price data origin: {{label:src_price}}. The framework follows a range and nPOC method: a negative point of control is a price level a fast move left unfilled, and it acts as a magnet until a candle closes at or through it.

| Concept | Value |
| --- | --- |
| Latest close | {{metric:near_close}} |
| Fast and slow daily averages | {{metric:near_sma_fast}} and {{metric:near_sma_slow}} |
| Close vs slow average | {{metric:near_vs_sma_slow_pct}} |
| Trend | {{label:near_trend}}; weekly: {{label:near_weekly_trend}} |
| RSI | {{metric:near_rsi}} |
| Range (last {{param:range_lookback_days}} days) | low {{metric:range_low}}, median {{metric:range_median}}, high {{metric:range_high}} |
| Position within the range | {{metric:range_position_pct}} (zone: {{label:range_zone}}) |
| Fibonacci levels | {{metric:fib_382}}, {{metric:fib_618}}, {{metric:fib_786}}; nearest is {{label:fib_nearest}}, at {{metric:fib_nearest_pct}} |
| Open nPOC levels | {{metric:npoc_open_lower}} below the close and {{metric:npoc_open_upper}} above |
| Nearest lower nPOC | {{metric:npoc_lower_level}}; distance below the close: {{metric:npoc_lower_distance_pct}} |
| Nearest upper nPOC | {{metric:npoc_upper_level}}; distance above the close: {{metric:npoc_upper_distance_pct}} |
| Relative strength vs BTC | {{metric:rs_vs_btc_30d_pp}} over {{param:rs_lookback_days}} days |

**Multi-timeframe confluence.** A lower nPOC is a long-entry zone and an upper nPOC is a take-profit zone; confidence rises when daily trend, weekly trend, range zone, and proximity to an nPOC line up.

{{block:confluence}}

Score: {{metric:confluence_score}} of {{metric:confluence_total}}. Constructive needs at least {{param:confluence_constructive_min}} and defensive is {{param:confluence_defensive_max}} or fewer, so the technical bias is **{{label:technical_bias}}**.

**Illustrative risk template, not a recommendation.** Status: {{label:plan_status}}. A limit order at the nearest lower nPOC ({{metric:plan_entry}}), a stop {{param:stop_beyond_npoc_pct}}% beyond ({{metric:plan_stop}}), a first target at the range median ({{metric:plan_t1}}) and a second at {{metric:plan_t2}} give a reward-to-risk of {{metric:plan_rr}} to the first target. Risking {{param:risk_per_trade_pct}}% of a sample account of {{metric:plan_account_usd}} ({{metric:plan_risk_usd}}) sizes a position of {{metric:plan_size_units}} NEAR. Framework rules: move the stop to break-even after traveling halfway to the first target, and take profits in parts.

## 6. What the desks say

The author's Notion has three tables. {{metric:notion_rows_total}} rows mention NEAR ({{metric:notion_rows_tickers}} in TickersInfo, {{metric:notion_rows_creative}} in X Creative Output and {{metric:notion_rows_analyses}} in X Account Analyses), from {{metric:desk_count}} public desks; {{metric:notion_false_positives}} false matches on the English word "near" were discarded. Rows by labeled sentiment: positive, {{metric:notion_sent_positive}}; neutral, {{metric:notion_sent_neutral}}; negative, {{metric:notion_sent_negative}}; mixed, {{metric:notion_sent_mixed}}. Those labels belong to each row and are not Bear's sentiment index.

Themes in the rows:

{{block:notion_themes}}

Curated observations ({{metric:desk_observations_count}}), paraphrased. They are claims from public accounts: Bison has verified none.

{{block:desk_observations}}

## 7. Confirmations and mirages

A rally without confirmation is a mirage. Bull crosses Bear sentiment with Bison activity each week:

{{block:divergences}}

Active-account jumps (spike vs structural change; threshold: {{param:spike_multiple}} times the prior median, persistence of {{param:spike_persistence_days}} days):

{{block:spikes}}

## 8. Evidence for

{{block:evidence_for}}

## 9. Evidence against

{{block:evidence_against}}

## 10. Conditional scenarios

- **Bullish:** Intents share keeps rising, lag correlation stays above {{param:lag_min_r}}, price holds above the nearest lower nPOC, and the BTC tripwire recovers inside its window. Direction and timing align.
- **Base:** usage keeps growing, but price sits between the averages and the range median. Wait for a close back above the slow average or a pullback to the lower nPOC with confluence of {{param:confluence_constructive_min}} or more.
- **Bearish:** BTC loses its weekly average for {{param:tripwire_regain_weeks}} weeks, NEAR closes below the lower nPOC (the mark is then filled and the long-entry zone disappears), and 1Click volume grows without active accounts responding within {{param:lag_max_days}} days. In that case volume is circular and the thesis weakens.
- If a jump arrives with more than {{param:spike_concentration_pct}}% of transactions in ten signers, treat it as a spike and do not move the thesis.

## 11. What would change my mind

Thresholds fixed before seeing live data:

- The best lag correlation stays below {{param:lag_min_r}}, or the reverse correlation is higher, for {{param:invalidation_quarters}} consecutive quarters.
- Intents contract share of calls falls in two consecutive {{param:window_days}}-day windows.
- The adoption regime is contraction for {{param:invalidation_quarters}} consecutive quarters.
- Mirage weeks outnumber confirmation weeks in a quarter.
- A BTC weekly close below its {{param:btc_wma_weeks}}-week average that does not recover in {{param:tripwire_regain_weeks}} weeks moves the stance defensive until recovery.
- NEAR closes below its lower nPOC level on a daily close while the confluence score is {{param:confluence_defensive_max}} or less.
- A second security incident on NEAR Intents, or any evidence that the chain or token was affected by one.

## 12. Metrics that cannot be computed from these sources

- NEAR market cap and valuation multiples: no approved source for them.
- TVL and fees in USD: require prices and protocol data that are not in BigQuery or the Explorer.
- Total NEAR Intents volume: the Explorer only exposes 1Click Swap.
- Unique people and retention: an account is not a person, and addresses are not joined across datasets.
- 1Click volume concentration by user: only daily aggregates are stored.
- Intraday nPOC marks: only daily candles are used, so marks are approximated at the midpoint of fast candle bodies.
- Anything a desk cites: those figures are claims until Bison measures them.

## 13. Provenance of each input

| Input | Use | Status |
| --- | --- | --- |
| NEAR BigQuery dataset | Activity, contracts, concentration, meta-transactions | {{label:src_chain}} |
| Intents Explorer, 1Click Swap | Volume, swaps, cross-chain share | {{label:src_chain}} |
| Daily NEAR and BTC candles | Technical layer and BTC regime | {{label:src_price}} |
| Notion tables (TickersInfo, X Creative Output, X Account Analyses) | Desk reading | {{label:src_notion}} |
| Curated desk figures | Contrasts and claims | {{label:src_desk}} |
| X search via xAI | Weekly sentiment index | {{label:src_x}} |
| Corporate-style reference thesis | Fundamental lens only | cited, unverified, not reproduced |
| Bitcoin research note dated {{label:ref_btc_date}} | Macro lens and tripwire contrast | cited, unverified, not reproduced |

## 14. Methodology and disclosures

- Sources: `bigquery-public-data.crypto_near_mainnet_us` (queries filtered by `block_date`, in `src/tesis/bisonte/bq/queries`), the Intents Explorer API (1Click Swap, SUCCESS status), daily candles from a price source configured outside this repository, Notion tables read with a token that lives only in the environment, and X search via xAI `x_search` over a fixed account list.
- Bear discards posts that xAI did not cite, from accounts outside the list, or from another date; it discarded {{metric:oso_discard_share}} of proposed posts. Figures cited in posts or desk notes are never used as measured data.
- The technical framework (range, nPOC, Fibonacci levels, multi-timeframe confluence, risk sizing) comes from methodological notes provided by the author and is implemented in `src/tesis/toro/technical.ts`. The nPOC method is approximated with daily candles.
- External documents are paraphrased and attributed as lenses. The Bitcoin note forbids redistribution, so none of its text is reproduced. Its figures were relayed by the author and have not been verified.
- Parameters live in `src/tesis/toro/params.ts` and `src/tesis/oso/score.ts`; every change must be logged.
- Not financial advice. The risk template is an illustration of position sizing. The author declares no position. Parts of the code and text were generated with AI assistance.
