import { planBuild } from "./build-site";

describe("planBuild", () => {
  it("publica la tesis real solo si hay datos reales", () => {
    expect(planBuild("live", true)).toEqual({ mode: "live", steps: [["src/tesis/toro/build.ts"]] });
  });

  it("cae a la tesis de ejemplo cuando no hay datos reales", () => {
    expect(planBuild("live", false).mode).toBe("mock");
    expect(planBuild("live", false).steps[0]).toEqual(["src/tesis/mock/run.ts"]);
  });

  it("respeta DATA_MODE=mock aunque existan datos reales", () => {
    expect(planBuild("mock", true).mode).toBe("mock");
  });
});
