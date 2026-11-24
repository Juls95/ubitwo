import createDebug from "debug";
import { redactDeep } from "./redact";

export type Logger = {
  info: (message: string, context?: unknown) => void;
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
};

/** Todos los logs pasan por `debug` (actívalos con DEBUG=ubitwo:*). El contexto siempre se redacta. */
export function createLogger(namespace: string): Logger {
  const base = createDebug(`ubitwo:${namespace}`);
  const warn = createDebug(`ubitwo:${namespace}:aviso`);
  const error = createDebug(`ubitwo:${namespace}:error`);
  error.enabled = true;
  const fmt = (context: unknown) => (context === undefined ? "" : JSON.stringify(redactDeep(context)));
  return {
    info: (m, c) => base("%s %s", m, fmt(c)),
    warn: (m, c) => warn("%s %s", m, fmt(c)),
    error: (m, c) => error("%s %s", m, fmt(c)),
  };
}
