import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/** Hace cumplir docs/politica-de-dependencias.md: cada `it` cita la regla que protege. */
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const pkg = JSON.parse(read("package.json")) as {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

describe("política de dependencias", () => {
  it("regla 1: solo versiones exactas", () => {
    const loose = Object.entries(allDeps).filter(([, v]) => !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v));
    expect(loose).toEqual([]);
  });

  it("regla 10: sin dependencias por git, URL o ruta local", () => {
    const remote = Object.entries(allDeps).filter(([, v]) => /^(git|https?:|file:|link:|github:|\.|\/)/.test(v));
    expect(remote).toEqual([]);
  });

  it("regla 2: pnpm no resuelve versiones con menos de 7 días", () => {
    const ws = parse(read("pnpm-workspace.yaml")) as { minimumReleaseAge?: number; onlyBuiltDependencies?: string[] };
    expect(ws.minimumReleaseAge).toBeGreaterThanOrEqual(10080);
    expect(ws.onlyBuiltDependencies ?? []).toEqual([]);
  });

  it("reglas 4, 6 y 9: .npmrc exacto, sin scripts de instalación y con un solo registro", () => {
    const npmrc = read(".npmrc");
    expect(npmrc).toMatch(/^save-exact=true$/m);
    expect(npmrc).toMatch(/^ignore-scripts=true$/m);
    expect(npmrc).not.toMatch(/registry\s*=/);
  });

  it("regla 6: pnpm es el único gestor", () => {
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    expect(existsSync(join(root, "package-lock.json"))).toBe(false);
    expect(existsSync(join(root, "yarn.lock"))).toBe(false);
  });

  it("regla 11: las GitHub Actions se fijan por SHA", () => {
    const dir = join(root, ".github/workflows");
    const uses = readdirSync(dir)
      .flatMap((f) => readFileSync(join(dir, f), "utf8").split("\n"))
      .map((l) => /^\s*-?\s*uses:\s*(\S+)/.exec(l)?.[1])
      .filter((u): u is string => Boolean(u));
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.filter((u) => !/@[0-9a-f]{40}$/.test(u))).toEqual([]);
  });

  it("regla 16: los archivos de credenciales están en .cursorignore", () => {
    const ignore = read(".cursorignore").split("\n");
    for (const p of [".env", ".env.*", "gcp-*.json"]) expect(ignore).toContain(p);
  });

  it("reglas 18 y 19: CI ejecuta gitleaks y la auditoría", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toMatch(/gitleaks\/gitleaks-action@/);
    expect(ci).toMatch(/pnpm audit --prod/);
    expect(ci).toMatch(/pnpm install --frozen-lockfile/);
  });

  it("regla 20: Dependabot espera 7 días antes de proponer una versión", () => {
    const dep = parse(read(".github/dependabot.yml")) as { updates: { cooldown?: { "default-days"?: number } }[] };
    expect(dep.updates.length).toBeGreaterThan(0);
    for (const u of dep.updates) expect(u.cooldown?.["default-days"]).toBeGreaterThanOrEqual(7);
  });

  it("los secretos nunca se versionan", () => {
    const gitignore = read(".gitignore").split("\n");
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain(".env.*");
  });

  it("render.yaml: secretos con sync: false e instalación con lockfile congelado", () => {
    type Var = { key: string; value?: string; sync?: boolean; generateValue?: boolean };
    const bp = parse(read("render.yaml")) as { services: { name: string; buildCommand: string; envVars: Var[] }[] };
    const secreto = /(TOKEN|KEY|SECRET|JWT|PASSWORD|EMAILS|_URL)$/;
    for (const svc of bp.services) {
      expect(svc.buildCommand).toMatch(/pnpm install --frozen-lockfile/);
      for (const v of svc.envVars.filter((e) => secreto.test(e.key))) {
        expect({ servicio: svc.name, key: v.key, value: v.value }).toEqual({ servicio: svc.name, key: v.key, value: undefined });
        expect(v.sync === false || v.generateValue === true).toBe(true);
      }
    }
  });

  it(".env.example no trae secretos con valor", () => {
    const lineas = read(".env.example").split("\n").filter((l) => /^[A-Z_]+=/.test(l));
    const conValor = lineas.filter((l) => /^(\w*(TOKEN|KEY|SECRET|JWT))=.+/.test(l));
    expect(conValor).toEqual([]);
  });
});
