import { laggedCorrelation, logDiff, median, movingAverage, pctChange, pearson } from "./stats";

describe("estadística", () => {
  it("median maneja entradas vacías, impares y pares", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it("pctChange se protege de bases ausentes o en cero", () => {
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(1, 0)).toBeNull();
    expect(pctChange(null, 1)).toBeNull();
  });

  it("movingAverage deja vacía la ventana de arranque", () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
  });

  it("pearson detecta la correlación perfecta y la indefinida", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it("laggedCorrelation encuentra un adelanto conocido", () => {
    const x = Array.from({ length: 60 }, (_, i) => Math.sin(i / 3));
    const y = [0, 0, 0, ...x.slice(0, -3)];
    expect(laggedCorrelation(x, y, 3).r).toBeCloseTo(1);
    expect(laggedCorrelation(x, y, 0).r ?? 0).toBeLessThan(0.9);
  });

  it("logDiff omite los nulos y los valores no positivos", () => {
    expect(logDiff([null, 1, Math.E, 0], 1)).toEqual([null, null, 1, null]);
  });
});
