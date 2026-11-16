import { addDays, isoDay } from "../lib/dates";
import { ESQUEMA, type RegistroResumen } from "./esquema";
import { normalizar } from "./normalizar";

/**
 * Datos de demostración: cuentas y afirmaciones ficticias, en el mismo formato que escribe el bot en Notion.
 * Pasan por `normalizar` igual que los reales, así la demo prueba el camino completo. Nunca se mezclan con datos reales.
 */
const CUENTAS = ["@demo_macro", "@demo_cripto", "@demo_tecnico", "@demo_acciones", "@demo_onchain"];

type Entrada = { ticker: string; account: string; stance: string; claim: string; invalidation?: string };

const DIAS: { sesgo: string; contexto: string; entradas: Entrada[]; conflictos: string[] }[] = [
  {
    sesgo: "Alcista",
    contexto: "Apetito por riesgo tras datos de inflación más bajos de lo esperado; el dólar retrocede y las tecnológicas lideran.",
    entradas: [
      { ticker: "BTC", account: "@demo_cripto", stance: "bullish", claim: "Recupera su media semanal y los flujos de ETF vuelven a ser positivos.", invalidation: "Cierre semanal por debajo de la media de veinte semanas." },
      { ticker: "BTC", account: "@demo_macro", stance: "bullish", claim: "Un dólar más débil suele acompañar fases de expansión en cripto." },
      { ticker: "NVDA", account: "@demo_acciones", stance: "bullish", claim: "La guía de centros de datos supera el consenso por tercer trimestre seguido.", invalidation: "Margen bruto por debajo de lo prometido." },
      { ticker: "SOL", account: "@demo_onchain", stance: "neutral", claim: "La actividad en la red sube, pero las comisiones siguen planas." },
    ],
    conflictos: [],
  },
  {
    sesgo: "Mixto",
    contexto: "Mercado indeciso antes de la reunión de la Reserva Federal; rotación de tecnológicas hacia defensivas.",
    entradas: [
      { ticker: "BTC", account: "@demo_tecnico", stance: "bearish", claim: "Rechazo en la resistencia del rango; el RSI diario marca divergencia bajista.", invalidation: "Cierre diario por encima del máximo del rango." },
      { ticker: "BTC", account: "@demo_cripto", stance: "bullish", claim: "Las ballenas siguen acumulando según datos on-chain." },
      { ticker: "ETH", account: "@demo_onchain", stance: "bullish", claim: "El suministro en exchanges cae a mínimos de varios años." },
      { ticker: "TSLA", account: "@demo_acciones", stance: "bearish", claim: "Entregas por debajo de lo esperado y recortes de precio en Europa.", invalidation: "Margen automotriz estable en el próximo reporte." },
      { ticker: "CRIPTO TOP100", account: "@demo_macro", stance: "mixed", claim: "Las altcoins no acompañan a BTC: la dominancia sube." },
    ],
    conflictos: ["@demo_tecnico ve BTC bajista por estructura mientras @demo_cripto lo ve alcista por acumulación."],
  },
  {
    sesgo: "Bajista",
    contexto: "Salida de riesgo: rendimientos de los bonos al alza y liquidaciones en derivados cripto.",
    entradas: [
      { ticker: "BTC", account: "@demo_macro", stance: "bearish", claim: "Rendimientos a diez años en máximos del mes presionan a los activos de riesgo." },
      { ticker: "ETH", account: "@demo_tecnico", stance: "bearish", claim: "Pierde el soporte del rango y deja un nPOC abierto arriba.", invalidation: "Recuperar el soporte perdido en cierre diario." },
      { ticker: "NEAR", account: "@demo_onchain", stance: "bullish", claim: "Las cuentas activas diarias siguen creciendo pese a la caída del precio." },
      { ticker: "NVDA", account: "@demo_acciones", stance: "neutral", claim: "Toma de ganancias sin cambios en el caso fundamental." },
    ],
    conflictos: [],
  },
  {
    sesgo: "Neutral",
    contexto: "Sesión tranquila, volumen bajo; el mercado espera datos de empleo.",
    entradas: [
      { ticker: "SOL", account: "@demo_cripto", stance: "bullish", claim: "Nuevas aplicaciones de pagos lanzan sobre la red esta semana." },
      { ticker: "AAPL", account: "@demo_acciones", stance: "neutral", claim: "Sin catalizadores claros hasta el evento de producto." },
      { ticker: "BTC", account: "@demo_tecnico", stance: "neutral", claim: "Lateral dentro del rango; esperar ruptura con volumen." },
    ],
    conflictos: [],
  },
  {
    sesgo: "Alcista",
    contexto: "Datos de empleo sólidos sin presión salarial; los índices marcan máximos.",
    entradas: [
      { ticker: "NVDA", account: "@demo_acciones", stance: "bullish", claim: "Nuevos pedidos de chips para inteligencia artificial anunciados por hiperescaladores." },
      { ticker: "ETH", account: "@demo_onchain", stance: "bullish", claim: "Aumentan las entradas a productos cotizados de ETH." },
      { ticker: "NEAR", account: "@demo_cripto", stance: "bullish", claim: "El volumen de intents entre cadenas crece por cuarta semana." },
      { ticker: "NEAR", account: "@demo_tecnico", stance: "bearish", claim: "Sigue por debajo de la media lenta; falta confirmación técnica.", invalidation: "Cierre diario por encima de la media lenta." },
    ],
    conflictos: ["NEAR: fundamentales on-chain alcistas, estructura técnica todavía bajista."],
  },
];

export function crearDemo(hoy: Date = new Date()): RegistroResumen[] {
  const fin = isoDay(hoy);
  return DIAS.map((d, i) => {
    const fecha = addDays(fin, -(DIAS.length - 1 - i));
    const resumen = normalizar(
      {
        schema: ESQUEMA,
        date: fecha,
        accounts: CUENTAS,
        market_context: d.contexto,
        assets: d.entradas.map((e) => ({ ...e, url: `https://x.com/${e.account.slice(1)}` })),
        ticker_intel: [
          { ticker: "NEAR", what_it_does: "Cadena de capa uno enfocada en abstracción de cuentas e intents entre cadenas.", price: "", last_news: "", source: "https://near.org" },
          { ticker: "NVDA", what_it_does: "Diseña GPUs y plataformas de cómputo para centros de datos e inteligencia artificial.", price: "", last_news: "", source: "https://nvidia.com" },
        ],
        conflicts: d.conflictos,
        flags: ["demo"],
      },
      { titulo: `Resumen de demostración · ${fecha}`, sesgo: d.sesgo, estado: "Completado" },
    );
    return { fecha, notion_page_id: null, resumen, actualizado: `${fecha}T13:00:00.000Z` };
  });
}
