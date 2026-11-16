import { PARAMS } from "../../../src/tesis/toro/params";
import { SCORING } from "../../../src/tesis/oso/score";

const NIVEL: Record<string, string> = { official: "oficial", core: "núcleo", ecosystem: "ecosistema", analyst: "analista" };

export function PaginaMetodologia() {
  return (
    <section className="page">
      <header className="page-head">
        <span className="eyebrow">Metodología</span>
        <h1>Cómo se obtiene y se combina cada dato</h1>
        <p>Qué fuentes se usan, qué parámetros se fijaron antes de ver resultados y qué no se puede medir.</p>
      </header>

      <h2>Noticias</h2>
      <ul>
        <li><strong>Origen:</strong> un bot escribe cada día una página en una base de datos de Notion con un bloque JSON (<code>*.digest.v1</code>): título, sesgo general, contexto y activos con su evidencia.</li>
        <li><strong>Sincronización:</strong> <code>pnpm noticias:sync</code> lee las páginas editadas en los últimos días, valida el JSON con zod, descarta lo que no cumple y guarda una fila por día en Supabase. Si el contenido no cambió, no reescribe nada.</li>
        <li><strong>Seguridad del contenido:</strong> lo que dicen las publicaciones es evidencia, nunca instrucciones. Solo se muestran enlaces https y el texto nunca se interpreta como HTML.</li>
        <li><strong>Postura de un activo:</strong> la escribe el bot; ubitwo la normaliza a alcista, bajista, neutral o mixta y cuenta el acuerdo entre cuentas.</li>
        <li><strong>Preguntas:</strong> la respuesta solo puede usar los resúmenes guardados. Si no hay modelo de IA configurado, ubitwo responde con los fragmentos más relevantes, sin inventar.</li>
      </ul>

      <h2>Tesis: fuentes</h2>
      <ul>
        <li><strong>Bisonte · BigQuery:</strong> tablas públicas de la cadena (<code>blocks</code>, <code>transactions</code>, <code>receipt_actions</code>). Cada consulta filtra por <code>block_date</code> y pasa por una ejecución en seco con límite de bytes.</li>
        <li><strong>Bisonte · Intents Explorer:</strong> solo intercambios 1Click con estado SUCCESS, una petición cada cinco segundos.</li>
        <li><strong>Oso · Notion:</strong> TickersInfo, X Creative Output y X Account Analyses. El token vive en <code>NOTION_TOKEN</code>; los ID de las tablas no son secretos.</li>
        <li><strong>Oso · xAI:</strong> búsqueda en X limitada a una lista fija de cuentas y a un día por consulta.</li>
      </ul>

      <h2>Cómo leer la tesis</h2>
      <ul>
        <li><strong>Régimen:</strong> dirección sin momento; compara la mediana de cuentas activas de treinta días contra la de noventa.</li>
        <li><strong>Confirmadores:</strong> una subida de sentimiento sin actividad es un espejismo.</li>
        <li><strong>Pico frente a cambio estructural:</strong> un salto que no persiste, o que se concentra en pocos firmantes, no cuenta como adopción.</li>
        <li><strong>Invalidación explícita:</strong> la tesis dice de antemano qué resultado la cambiaría.</li>
      </ul>

      <h2>Parámetros prerregistrados</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Parámetro</th><th>Valor</th></tr></thead>
          <tbody>{Object.entries(PARAMS).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>Puntaje de credibilidad de Oso</h2>
      <p className="muted">Se calcula en código, no lo decide el modelo. El resultado queda entre cero y uno.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Componente</th><th>Valor</th></tr></thead>
          <tbody>
            {Object.entries(SCORING.tier).map(([k, v]) => <tr key={k}><td>Nivel de la cuenta: {NIVEL[k] ?? k}</td><td>{v}</td></tr>)}
            <tr><td>Enlaza a una fuente primaria</td><td>+{SCORING.primarySourceBonus}</td></tr>
            <tr><td>Por cada cuenta independiente que corrobora (máx. {SCORING.corroborationMaxHandles})</td><td>+{SCORING.corroborationBonusPerHandle}</td></tr>
            <tr><td>Promoción</td><td>−{SCORING.promoPenalty}</td></tr>
            <tr><td>Cifra sin fuente</td><td>−{SCORING.unsourcedNumberPenalty}</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Límites</h2>
      <ul>
        <li>Las noticias reflejan lo que dicen las cuentas seguidas, no el mercado completo.</li>
        <li>Sin precio, capitalización, TVL ni comisiones en USD dentro de la tesis: no hay una fuente aprobada para ellos.</li>
        <li>Las cuentas no son personas; los relayers distorsionan el conteo.</li>
        <li>Una correlación con desfase no prueba causalidad.</li>
      </ul>
    </section>
  );
}
