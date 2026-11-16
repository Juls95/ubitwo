-- ============================================================
-- ubitwo 0001 · resúmenes diarios de noticias
--
-- Un resumen por día y por espacio de trabajo. El contenido es JSON
-- (esquema ubitwo.digest.v1) porque cubre N activos con varios campos
-- cada uno y las propiedades de Notion son planas.
--
-- Acceso: solo el servidor de ubitwo y el job de sincronización, con la
-- service role (que omite RLS). RLS queda activado y SIN políticas para
-- anon/authenticated, así la clave pública no puede leer ni escribir nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.resumenes_diarios (
    id BIGSERIAL PRIMARY KEY,
    espacio_id TEXT NOT NULL DEFAULT 'principal'
        CHECK (espacio_id ~ '^[a-z0-9-]{1,40}$'),
    fecha DATE NOT NULL,
    notion_page_id TEXT,
    payload JSONB NOT NULL
        CHECK (jsonb_typeof(payload) = 'object'),
    tickers TEXT[] NOT NULL DEFAULT '{}',
    hash_contenido TEXT NOT NULL,
    propietario_email TEXT,
    creado TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Re-sincronizar la misma página actualiza la fila en vez de duplicarla.
    CONSTRAINT resumenes_diarios_uno_por_dia UNIQUE (espacio_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_resumenes_diarios_recientes
    ON public.resumenes_diarios (espacio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_resumenes_diarios_tickers
    ON public.resumenes_diarios USING GIN (tickers);

ALTER TABLE public.resumenes_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumenes_diarios FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.resumenes_diarios FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.resumenes_diarios_id_seq FROM anon, authenticated;

COMMENT ON TABLE public.resumenes_diarios IS
    'Resúmenes diarios de noticias de ubitwo. Solo accesible con la service role desde el servidor.';
