import { HttpsUrl, IsoDate } from "./esquemas";

describe("HttpsUrl", () => {
  it.each(["https://x.com/cuenta/status/1", "https://example.org/a?b=c"])("acepta %s", (url) => {
    expect(HttpsUrl.safeParse(url).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>1</script>", "http://example.org", "ftp://example.org", "no es url", ""])(
    "rechaza %s",
    (url) => {
      expect(HttpsUrl.safeParse(url).success).toBe(false);
    },
  );
});

describe("IsoDate", () => {
  it("solo acepta AAAA-MM-DD", () => {
    expect(IsoDate.safeParse("2026-11-16").success).toBe(true);
    expect(IsoDate.safeParse("16/11/2026").success).toBe(false);
  });
});
