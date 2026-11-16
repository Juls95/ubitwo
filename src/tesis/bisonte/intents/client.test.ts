import { aggregateDaily, chainOf, fetchSwaps, MIN_INTERVAL_MS } from "./client";

const tx = (i: number, over: Record<string, unknown> = {}) => ({
  depositAddress: `addr${i}`,
  depositMemo: null,
  originAsset: "nep141:eth-0xabc.omft.near",
  destinationAsset: "nep141:wrap.near",
  status: "SUCCESS",
  createdAt: "2026-11-01T10:00:00Z",
  amountInUsd: "10.5",
  amountOutUsd: "10.4",
  ...over,
});

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const opts = { jwt: "secret-jwt", start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-11-01T00:00:00Z") };

describe("fetchSwaps", () => {
  it("pagina con el cursor de depósito y espera entre páginas", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => tx(i));
    const fetchImpl = jest.fn().mockResolvedValueOnce(json(full)).mockResolvedValueOnce(json([tx(1000)]));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const out = await fetchSwaps({ ...opts, fetchImpl, sleep });
    expect(out).toHaveLength(1001);
    const second = new URL(String(fetchImpl.mock.calls[1]?.[0]));
    expect(second.searchParams.get("lastDepositAddress")).toBe("addr999");
    expect(second.searchParams.get("statuses")).toBe("SUCCESS");
    expect(sleep).toHaveBeenCalledWith(MIN_INTERVAL_MS);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers.Authorization).toBe("Bearer secret-jwt");
  });

  it("espera ante un 429 y reintenta la misma página", async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(json({}, 429, { "retry-after": "7" })).mockResolvedValueOnce(json([tx(1)]));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const out = await fetchSwaps({ ...opts, fetchImpl, sleep });
    expect(out).toHaveLength(1);
    expect(sleep).toHaveBeenCalledWith(7000);
  });

  it("se rinde tras varios 429 en lugar de repetir para siempre", async () => {
    const fetchImpl = jest.fn().mockImplementation(() => Promise.resolve(json({}, 429)));
    const sleep = jest.fn().mockResolvedValue(undefined);
    await expect(fetchSwaps({ ...opts, fetchImpl, sleep })).rejects.toThrow(/429/);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it("falla de inmediato cuando cambia la forma de la respuesta", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(json([{ unexpected: true }]));
    await expect(fetchSwaps({ ...opts, fetchImpl, sleep: jest.fn() })).rejects.toThrow(/schema mismatch/);
  });
});

describe("aggregateDaily", () => {
  it("suma USD, cuenta los valores faltantes y los swaps entre cadenas", () => {
    const rows = aggregateDaily([
      { createdAt: "2026-11-01T01:00:00Z", originAsset: "nep141:eth-0x1.omft.near", destinationAsset: "nep141:wrap.near", amountInUsd: 10 },
      { createdAt: "2026-11-01T02:00:00Z", originAsset: "nep141:wrap.near", destinationAsset: "nep141:usdt.tether-token.near", amountInUsd: null },
      { createdAt: "2026-11-02T02:00:00Z", originAsset: "nep141:btc.omft.near", destinationAsset: "nep141:sol.omft.near", amountInUsd: 5.555 },
    ]);
    expect(rows).toEqual([
      { date: "2026-11-01", swaps: 2, volume_usd: 10, swaps_missing_usd: 1, cross_chain_swaps: 1 },
      { date: "2026-11-02", swaps: 1, volume_usd: 5.56, swaps_missing_usd: 0, cross_chain_swaps: 1 },
    ]);
  });

  it.each([
    ["nep141:eth-0xabc.omft.near", "eth"],
    ["nep141:btc.omft.near", "btc"],
    ["nep141:usdt.tether-token.near", "near"],
    ["nep141:wrap.near", "near"],
  ])("chainOf(%s) = %s", (asset, chain) => expect(chainOf(asset)).toBe(chain));
});
