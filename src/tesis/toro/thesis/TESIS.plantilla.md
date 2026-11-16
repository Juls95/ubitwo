# Tesis de inversión en NEAR · ubitwo

{{block:mode_banner}}

Generada: {{label:generated_at}} · Datos on-chain hasta: {{label:last_block_date}} · Ventana: {{label:window_start}} a {{label:window_end}} · Modo: {{label:mode}}

Agentes: **Oso** (lectura de mesas y de X), **Bisonte** (datos on-chain de NEAR, 1Click Swap y velas de precio), **Toro** (síntesis). Cada cifra de este documento sale de `metrics.json` o de un archivo de datos etiquetado; ninguna se escribe a mano y cada una lleva una etiqueta de procedencia: calculado, simulado, mesa (una afirmación de una cuenta pública) o citado (un documento externo, sin verificar).

## 1. Tesis y postura

El uso real de NEAR se está desplazando hacia la ejecución entre cadenas (1Click Swap sobre NEAR Intents), y ese volumen se adelanta a la actividad on-chain general: cuentas activas y uso de contratos. Horizonte: de uno a dos años.

**Postura:** {{label:stance}}.

- **Dirección (on-chain):** hipótesis {{label:hypothesis_verdict}}. Desplazamiento: {{label:shift_status}}. Adelanto: {{label:lead_status}}. Régimen de adopción: {{label:regime}}.
- **Momento (precio):** sesgo técnico {{label:technical_bias}} ({{metric:confluence_score}} de {{metric:confluence_total}} criterios cumplidos). Estado del plan: {{label:plan_status}}.
- **Contexto (Bitcoin):** alarma del promedio semanal: {{label:btc_tripwire}}.

El régimen da la dirección, no el momento. La dirección sale de los datos de uso; el momento sale de la estructura del precio; el régimen de Bitcoin condiciona ambos porque NEAR se mueve {{metric:near_beta_90d}} veces lo que se mueve BTC.

## 2. Cómo se construye esta tesis

- **Lente fundamental**, tomada de una tesis de estilo corporativo: interacción, monetización, foso competitivo, amenazas, casos alcista y bajista. NEAR no tiene estado de resultados, así que cada lente se traduce en un indicador on-chain calculable y se declaran los vacíos.
- **Lente macro**, tomada de una nota de investigación sobre Bitcoin: un piso técnico, posicionamiento, una narrativa fundamental, sentimiento, riesgos y una declaración explícita de qué cambiaría la visión.
- **Lente técnica**, de un marco de rango y nPOC: tendencia, rango, niveles de Fibonacci, marcas sin llenar, fuerza relativa y confluencia de múltiples temporalidades.
- **Lente social**: lo que dicen las mesas públicas sobre NEAR en las tablas de Notion del autor, tratado como afirmaciones por verificar.

## 3. Fundamentales: el motor de uso

| Lente | Indicador en NEAR | Valor | Procedencia |
| --- | --- | --- | --- |
| Crecimiento de la interacción | Mediana de cuentas activas diarias frente a los treinta días anteriores | {{metric:daa_30d_change_pct}} | {{prov:daa_30d_change_pct}} |
| Régimen de interacción | Mediana de treinta días frente a la mediana de noventa días | {{metric:daa_30d_vs_90d_pct}} | {{prov:daa_30d_vs_90d_pct}} |
| Indicador de monetización | Volumen de 1Click Swap en treinta días | {{metric:intents_volume_30d_usd}} | {{prov:intents_volume_30d_usd}} |
| Intensidad de uso | Swaps de 1Click por cada mil cuentas activas diarias | {{metric:swaps_per_1k_daa}} | {{prov:swaps_per_1k_daa}} |
| Indicador de foso | Participación del contrato de Intents en las llamadas a contratos | {{metric:intents_call_share_30d}} | {{prov:intents_call_share_30d}} |
| Profundidad entre cadenas | Swaps entre cadenas distintas | {{metric:intents_cross_chain_share_30d}} | {{prov:intents_cross_chain_share_30d}} |
| Calidad de los usuarios | Participación de las transacciones de los diez firmantes más activos | {{metric:top10_share_median_30d}} | {{prov:top10_share_median_30d}} |
| Confiabilidad | Transacciones exitosas | {{metric:success_rate_30d}} | {{prov:success_rate_30d}} |

Los pilares, en una línea cada uno:

- **Pilar A, desplazamiento:** el contrato de Intents recibe {{metric:intents_call_share_30d}} de las llamadas a contratos ({{metric:intents_call_share_change_pp}} frente a la ventana anterior).
- **Pilar B, adelanto:** la correlación entre el crecimiento de swaps de 1Click y el de cuentas activas es máxima con un rezago de {{metric:lag_best_days}} ({{metric:lag_best_r}}, relación {{label:lag_strength}}).
- **Pilar C, calidad de la actividad:** las metatransacciones son {{metric:meta_tx_share_30d}} de las acciones y la mediana de cuentas que las usan cada día es {{metric:delegating_accounts_median_30d}}.

**Qué enseña la tesis corporativa de referencia y dónde se detiene.** Esa tesis se apoya en que la interacción se convierta en usuarios que pagan: reporta una proporción de pago de {{metric:ref_duol_paid_share_pct}}, un crecimiento de usuarios activos diarios de {{metric:ref_duol_dau_growth_pct}} y un margen bruto de {{metric:ref_duol_gross_margin_pct}} ({{prov:ref_duol_paid_share_pct}}, sin verificar). NEAR no tiene un equivalente auditado de conversión a pago ni de margen bruto. El indicador calculable más cercano son los swaps por cada mil cuentas, que es un cociente de intensidad y no una tasa de conversión. Tampoco se puede calcular la retención, porque las direcciones no se cruzan entre conjuntos de datos.

## 4. Régimen macro: la lente de Bitcoin

NEAR es un activo de beta alta, así que Bitcoin marca el régimen. En {{param:beta_lookback_days}} días, NEAR tiene una beta de {{metric:near_beta_90d}} frente a BTC y una correlación de {{metric:near_btc_corr_90d}} ({{prov:near_beta_90d}}).

| Concepto | Valor | Procedencia |
| --- | --- | --- |
| Último cierre de BTC | {{metric:btc_close}} | {{prov:btc_close}} |
| Promedio semanal ({{param:btc_wma_weeks}} semanas) | {{metric:btc_wma}} | {{prov:btc_wma}} |
| Cierre frente al promedio semanal | {{metric:btc_vs_wma_pct}} | {{prov:btc_vs_wma_pct}} |
| Cierres semanales consecutivos por debajo | {{metric:btc_weeks_below_wma}} | {{prov:btc_weeks_below_wma}} |
| Caída desde el máximo de cierre de cincuenta y dos semanas | {{metric:btc_drawdown_pct}} | {{prov:btc_drawdown_pct}} |
| Estado de la alarma | {{label:btc_tripwire}} | {{prov:btc_wma}} |

**Lógica de la alarma.** La nota de referencia sobre Bitcoin dice que su visión cambia si un cierre semanal por debajo del promedio semanal no se recupera en aproximadamente un mes. Aquí esa regla se prueba sobre la serie de precios con una ventana de recuperación de {{param:tripwire_regain_weeks}} semanas, y el estado es: {{label:btc_tripwire}}.

**Contraste con las notas de las mesas.** Un resumen en el Notion del autor cita a BTC cerca de {{metric:desk_btc_nov11_usd}} el once de noviembre, lo que queda {{metric:desk_btc_vs_ref_tripwire_pct}} frente al nivel de {{metric:ref_btc_tripwire_usd}} de la nota de referencia ({{prov:ref_btc_tripwire_usd}}). La regla se refiere a cierres semanales y la cita de la mesa es un nivel intradía, así que esto es contexto y no un disparador. La nota de referencia también enmarca a Bitcoin en la devaluación monetaria, con una deuda federal de {{metric:ref_us_debt_trn}} billones de dólares y un rendimiento a diez años de {{metric:ref_us_10y_pct}}, y sitúa el ciclo en el día {{metric:ref_btc_cycle_day}} después del halving. Se citan como contexto de la nota, no como evidencia sobre NEAR.

**Cómo se comportaron las altcoins en la última caída.** El día de la venta masiva de octubre, las mesas citan a NEAR en {{metric:desk_near_move_oct25_pct}} y a BTC en {{metric:desk_btc_move_oct25_pct}}, unas {{metric:desk_alt_beta_ratio}} veces más fuerte, con la dominancia de BTC en {{metric:desk_btc_dominance_oct25_pct}}. TickersInfo registra marcas de precio de NEAR de {{metric:desk_near_print_oct15}} y {{metric:desk_near_print_oct25}}, un cambio de {{metric:desk_near_print_change_pct}} entre ambas.

## 5. Lectura técnica: rango, nPOC y confluencia

Origen de los datos de precio: {{label:src_price}}. El marco sigue un método de rango y nPOC: un punto de control negativo es un nivel de precio que un movimiento rápido dejó sin llenar, y actúa como imán hasta que una vela cierra en él o lo atraviesa.

| Concepto | Valor |
| --- | --- |
| Último cierre | {{metric:near_close}} |
| Promedios diarios rápido y lento | {{metric:near_sma_fast}} y {{metric:near_sma_slow}} |
| Cierre frente al promedio lento | {{metric:near_vs_sma_slow_pct}} |
| Tendencia | {{label:near_trend}}; semanal: {{label:near_weekly_trend}} |
| RSI | {{metric:near_rsi}} |
| Rango (últimos {{param:range_lookback_days}} días) | mínimo {{metric:range_low}}, mediana {{metric:range_median}}, máximo {{metric:range_high}} |
| Posición dentro del rango | {{metric:range_position_pct}} (zona: {{label:range_zone}}) |
| Niveles de Fibonacci | {{metric:fib_382}}, {{metric:fib_618}}, {{metric:fib_786}}; el más cercano es {{label:fib_nearest}}, a {{metric:fib_nearest_pct}} |
| Niveles nPOC abiertos | {{metric:npoc_open_lower}} por debajo del cierre y {{metric:npoc_open_upper}} por encima |
| nPOC inferior más cercano | {{metric:npoc_lower_level}}; distancia por debajo del cierre: {{metric:npoc_lower_distance_pct}} |
| nPOC superior más cercano | {{metric:npoc_upper_level}}; distancia por encima del cierre: {{metric:npoc_upper_distance_pct}} |
| Fuerza relativa frente a BTC | {{metric:rs_vs_btc_30d_pp}} en {{param:rs_lookback_days}} días |

**Confluencia de múltiples temporalidades.** Un nPOC inferior es una zona de entrada en largo y un nPOC superior es una zona de toma de ganancias; la confianza sube cuando coinciden la tendencia diaria, la tendencia semanal, la zona del rango y la cercanía a un nPOC.

{{block:confluence}}

Puntaje: {{metric:confluence_score}} de {{metric:confluence_total}}. Para ser constructivo se necesitan al menos {{param:confluence_constructive_min}} y es defensivo con {{param:confluence_defensive_max}} o menos, así que el sesgo técnico es **{{label:technical_bias}}**.

**Plantilla de riesgo ilustrativa, no es una recomendación.** Estado: {{label:plan_status}}. Una orden límite en el nPOC inferior más cercano ({{metric:plan_entry}}), un stop {{param:stop_beyond_npoc_pct}}% más allá ({{metric:plan_stop}}), un primer objetivo en la mediana del rango ({{metric:plan_t1}}) y un segundo en {{metric:plan_t2}} dan una relación beneficio-riesgo de {{metric:plan_rr}} hasta el primer objetivo. Arriesgar {{param:risk_per_trade_pct}}% de una cuenta de ejemplo de {{metric:plan_account_usd}} ({{metric:plan_risk_usd}}) da una posición de {{metric:plan_size_units}} NEAR. Reglas del marco: mover el stop al punto de equilibrio tras recorrer la mitad del camino al primer objetivo, y tomar ganancias por partes.

## 6. Qué dicen las mesas

El Notion del autor tiene tres tablas. {{metric:notion_rows_total}} filas mencionan NEAR ({{metric:notion_rows_tickers}} en TickersInfo, {{metric:notion_rows_creative}} en X Creative Output y {{metric:notion_rows_analyses}} en X Account Analyses), de {{metric:desk_count}} mesas públicas; se descartaron {{metric:notion_false_positives}} coincidencias falsas con la palabra inglesa «near». Filas por sentimiento etiquetado: positivo, {{metric:notion_sent_positive}}; neutral, {{metric:notion_sent_neutral}}; negativo, {{metric:notion_sent_negative}}; mixto, {{metric:notion_sent_mixed}}. Estas etiquetas pertenecen a cada fila y no son el índice de sentimiento de Oso.

Temas en las filas:

{{block:notion_themes}}

Observaciones curadas ({{metric:desk_observations_count}}), parafraseadas. Son afirmaciones de cuentas públicas: Bisonte no ha verificado ninguna.

{{block:desk_observations}}

## 7. Confirmaciones y espejismos

Un repunte sin confirmación es un espejismo. Toro cruza cada semana el sentimiento de Oso con la actividad de Bisonte:

{{block:divergences}}

Saltos de cuentas activas (pico frente a cambio estructural; umbral: {{param:spike_multiple}} veces la mediana previa, persistencia de {{param:spike_persistence_days}} días):

{{block:spikes}}

## 8. Evidencia a favor

{{block:evidence_for}}

## 9. Evidencia en contra

{{block:evidence_against}}

## 10. Escenarios condicionales

- **Alcista:** la participación de Intents sigue subiendo, la correlación con rezago se mantiene por encima de {{param:lag_min_r}}, el precio se sostiene sobre el nPOC inferior más cercano y la alarma de BTC se recupera dentro de su ventana. Dirección y momento se alinean.
- **Base:** el uso sigue creciendo, pero el precio se queda entre los promedios y la mediana del rango. Esperar un cierre de vuelta por encima del promedio lento o un retroceso al nPOC inferior con una confluencia de {{param:confluence_constructive_min}} o más.
- **Bajista:** BTC pierde su promedio semanal durante {{param:tripwire_regain_weeks}} semanas, NEAR cierra por debajo del nPOC inferior (la marca queda entonces llenada y la zona de entrada en largo desaparece) y el volumen de 1Click crece sin que las cuentas activas respondan en {{param:lag_max_days}} días. En ese caso el volumen es circular y la tesis se debilita.
- Si un salto llega con más de {{param:spike_concentration_pct}}% de las transacciones en diez firmantes, se trata como pico y no mueve la tesis.

## 11. Qué me haría cambiar de opinión

Umbrales fijados antes de ver los datos reales:

- La mejor correlación con rezago se queda por debajo de {{param:lag_min_r}}, o la correlación inversa es mayor, durante {{param:invalidation_quarters}} trimestres consecutivos.
- La participación del contrato de Intents en las llamadas cae en dos ventanas consecutivas de {{param:window_days}} días.
- El régimen de adopción es de contracción durante {{param:invalidation_quarters}} trimestres consecutivos.
- Las semanas de espejismo superan a las de confirmación en un trimestre.
- Un cierre semanal de BTC por debajo de su promedio de {{param:btc_wma_weeks}} semanas que no se recupera en {{param:tripwire_regain_weeks}} semanas lleva la postura a defensiva hasta que se recupere.
- NEAR cierra por debajo de su nivel nPOC inferior en un cierre diario mientras el puntaje de confluencia está en {{param:confluence_defensive_max}} o menos.
- Un segundo incidente de seguridad en NEAR Intents, o cualquier evidencia de que la cadena o el token se vieron afectados por uno.

## 12. Métricas que no se pueden calcular con estas fuentes

- Capitalización de mercado de NEAR y múltiplos de valuación: no hay una fuente aprobada para ellos.
- TVL y comisiones en USD: requieren precios y datos de protocolo que no están en BigQuery ni en el Explorer.
- Volumen total de NEAR Intents: el Explorer solo expone 1Click Swap.
- Personas únicas y retención: una cuenta no es una persona, y las direcciones no se cruzan entre conjuntos de datos.
- Concentración del volumen de 1Click por usuario: solo se guardan agregados diarios.
- Marcas nPOC intradía: solo se usan velas diarias, así que las marcas se aproximan a la mitad del cuerpo de las velas rápidas.
- Todo lo que cita una mesa: esas cifras son afirmaciones hasta que Bisonte las mida.

## 13. Procedencia de cada insumo

| Insumo | Uso | Estado |
| --- | --- | --- |
| Conjunto de datos de NEAR en BigQuery | Actividad, contratos, concentración, metatransacciones | {{label:src_chain}} |
| Intents Explorer, 1Click Swap | Volumen, swaps, participación entre cadenas | {{label:src_chain}} |
| Velas diarias de NEAR y BTC | Capa técnica y régimen de BTC | {{label:src_price}} |
| Tablas de Notion (TickersInfo, X Creative Output, X Account Analyses) | Lectura de mesas | {{label:src_notion}} |
| Cifras curadas de las mesas | Contrastes y afirmaciones | {{label:src_desk}} |
| Búsqueda en X mediante xAI | Índice semanal de sentimiento | {{label:src_x}} |
| Tesis de referencia de estilo corporativo | Solo lente fundamental | citado, sin verificar, no reproducido |
| Nota de investigación sobre Bitcoin con fecha {{label:ref_btc_date}} | Lente macro y contraste de la alarma | citado, sin verificar, no reproducido |

## 14. Metodología y declaraciones

- Fuentes: `bigquery-public-data.crypto_near_mainnet_us` (consultas filtradas por `block_date`, en `src/tesis/bisonte/bq/queries`), la API de Intents Explorer (1Click Swap, estado SUCCESS), velas diarias de una fuente de precios configurada fuera de este repositorio, tablas de Notion leídas con un token que solo vive en el entorno, y búsqueda en X mediante `x_search` de xAI sobre una lista fija de cuentas.
- Oso descarta publicaciones que xAI no citó, de cuentas fuera de la lista o de otra fecha; descartó {{metric:oso_discard_share}} de las publicaciones propuestas. Las cifras citadas en publicaciones o en notas de mesas nunca se usan como datos medidos.
- El marco técnico (rango, nPOC, niveles de Fibonacci, confluencia de múltiples temporalidades, dimensionamiento del riesgo) proviene de notas metodológicas aportadas por el autor y está implementado en `src/tesis/toro/technical.ts`. El método nPOC se aproxima con velas diarias.
- Los documentos externos se parafrasean y se atribuyen como lentes. La nota sobre Bitcoin prohíbe su redistribución, así que no se reproduce nada de su texto. Sus cifras las transmitió el autor y no se han verificado.
- Los parámetros viven en `src/tesis/toro/params.ts` y `src/tesis/oso/score.ts`; todo cambio debe quedar registrado.
- No es asesoría financiera. La plantilla de riesgo es una ilustración del dimensionamiento de posiciones. El autor declara no tener posición. Partes del código y del texto se generaron con ayuda de IA.
