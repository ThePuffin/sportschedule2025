import { fetchRecentFormGames } from "./fetchData";

// --- localStorage mock (same shape as syncService.test.ts) ---
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const localStorageMock = new LocalStorageMock();
const mockFetch = jest.fn();

/** Two finished games, as the backend `/form` endpoint returns them. */
const FORM_PAYLOAD = [{ uniqueId: "g1" }, { uniqueId: "g2" }];

const mockSuccessfulFetch = (payload: unknown = FORM_PAYLOAD) => {
  mockFetch.mockResolvedValue({ json: async () => payload });
};

const lastRequestedUrl = () =>
  mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  Object.defineProperty(globalThis, "fetch", {
    value: mockFetch,
    writable: true,
  });
});

describe("fetchRecentFormGames", () => {
  it("returns nothing for a missing team without calling the API", async () => {
    const result = await fetchRecentFormGames("");

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("bounds a past game on its own start and returns the payload", async () => {
    mockSuccessfulFetch();
    const before = "2026-03-20T18:00:00.000Z";

    const result = await fetchRecentFormGames("NHL-BOS", before, 5);

    expect(result).toEqual(FORM_PAYLOAD);
    const url = lastRequestedUrl();
    expect(url).toContain(`/games/team/NHL-BOS/form`);
    expect(url).toContain("limit=5");
    expect(url).toContain(`before=${encodeURIComponent(before)}`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("omits the bound for an upcoming game", async () => {
    mockSuccessfulFetch();

    await fetchRecentFormGames("NHL-BOS", undefined, 5);

    const url = lastRequestedUrl();
    expect(url).not.toContain("before=");
    expect(url).toContain("limit=5");
  });

  it("treats an unparsable bound as no bound", async () => {
    mockSuccessfulFetch();

    await fetchRecentFormGames("NHL-BOS", "not-a-date", 5);

    expect(lastRequestedUrl()).not.toContain("before=");
  });

  it("serves a past game from cache on the second call", async () => {
    mockSuccessfulFetch();
    const before = "2026-03-20T18:00:00.000Z";

    await fetchRecentFormGames("NHL-BOS", before, 5);
    const second = await fetchRecentFormGames("NHL-BOS", before, 5);

    expect(second).toEqual(FORM_PAYLOAD);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('serves an upcoming game from cache without a "now" bound defeating it', async () => {
    mockSuccessfulFetch();

    // Two calls with no bound, as two modal opens of the same upcoming game.
    await fetchRecentFormGames("NHL-BOS", undefined, 5);
    const second = await fetchRecentFormGames("NHL-BOS", undefined, 5);

    expect(second).toEqual(FORM_PAYLOAD);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a separate entry per team, per limit and per bound", async () => {
    mockSuccessfulFetch();
    const before = "2026-03-20T18:00:00.000Z";

    await fetchRecentFormGames("NHL-BOS", before, 5);
    await fetchRecentFormGames("NHL-NYR", before, 5); // other team
    await fetchRecentFormGames("NHL-BOS", before, 3); // other limit
    await fetchRecentFormGames("NHL-BOS", "2026-03-10T18:00:00.000Z", 5); // other bound
    await fetchRecentFormGames("NHL-BOS", undefined, 5); // no bound

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it("never caches an empty row so a team is not stuck blank", async () => {
    mockSuccessfulFetch([]);

    const first = await fetchRecentFormGames("NHL-BOS", undefined, 5);
    const second = await fetchRecentFormGames("NHL-BOS", undefined, 5);

    expect(first).toEqual([]);
    expect(second).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
