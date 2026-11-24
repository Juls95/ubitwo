import { useEffect, useRef, useState } from "react";
import { ErrorApi } from "./api";

export type Datos<T> = { datos: T | null; error: ErrorApi | null; cargando: boolean; recargar: () => void };

type Resultado<T> = { clave: string; datos: T | null; error: ErrorApi | null };

/**
 * Async load with typed loading/error state. `deps` decides when to refetch;
 * a late response from a previous key is ignored.
 */
export function useDatos<T>(cargar: () => Promise<T>, deps: readonly unknown[] = []): Datos<T> {
  const [vuelta, setVuelta] = useState(0);
  const [res, setRes] = useState<Resultado<T> | null>(null);
  const ultimaCarga = useRef(cargar);
  useEffect(() => {
    ultimaCarga.current = cargar;
  });
  const clave = `${JSON.stringify(deps)}#${vuelta}`;

  useEffect(() => {
    let vivo = true;
    ultimaCarga.current().then(
      (datos) => {
        if (vivo) setRes({ clave, datos, error: null });
      },
      (e: unknown) => {
        if (vivo) setRes({ clave, datos: null, error: e instanceof ErrorApi ? e : new ErrorApi(0, e instanceof Error ? e.message : String(e)) });
      },
    );
    return () => {
      vivo = false;
    };
  }, [clave]);

  const vigente = res?.clave === clave;
  return {
    datos: vigente ? res.datos : null,
    error: vigente ? res.error : null,
    cargando: !vigente,
    recargar: () => setVuelta((v) => v + 1),
  };
}
