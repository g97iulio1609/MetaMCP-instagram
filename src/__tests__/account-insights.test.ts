import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstagramManager } from "../index.js";

// Mock global fetch used by MetaGraphClient
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeOkResponse(data: unknown) {
  return { ok: true, json: async () => data };
}

function makeErrorResponse(status: number, data: unknown) {
  return { ok: false, status, json: async () => data };
}

describe("InstagramManager.getAccountInsights", () => {
  let manager: InstagramManager;

  beforeEach(() => {
    mockFetch.mockReset();
    manager = new InstagramManager({
      accessToken: "test-token",
      igUserId: "ig-user-123",
      apiVersion: "v22.0",
    });
  });

  it("returns insights data on success", async () => {
    const apiData = { data: [{ name: "views", values: [{ value: 250 }] }] };
    mockFetch.mockResolvedValueOnce(makeOkResponse(apiData));

    const result = await manager.getAccountInsights({
      metric: "views,follower_count",
      period: "day",
      metricType: "total_value",
    });

    expect(result.channel).toBe("instagram");
    expect(result.status).toBe("ok");
    expect(result.result).toEqual(apiData);
  });

  it("passes optional timeframe and breakdown params", async () => {
    const apiData = { data: [] };
    mockFetch.mockResolvedValueOnce(makeOkResponse(apiData));

    await manager.getAccountInsights({
      metric: "views",
      period: "lifetime",
      metricType: "total_value",
      timeframe: "this_month",
      breakdown: "city",
    });

    const calledUrl = mockFetch.mock.calls[0]![0] as URL;
    expect(calledUrl.searchParams.get("timeframe")).toBe("this_month");
    expect(calledUrl.searchParams.get("breakdown")).toBe("city");
  });

  it("returns error status on API failure instead of throwing", async () => {
    mockFetch.mockResolvedValueOnce(
      makeErrorResponse(400, { error: { message: "Invalid metric", type: "OAuthException" } }),
    );

    const result = await manager.getAccountInsights({
      metric: "invalid_metric",
      period: "day",
      metricType: "total_value",
    });

    expect(result.status).toBe("error");
    expect(result.channel).toBe("instagram");
    expect(result).toHaveProperty("error");
  });

  it("throws when metric is empty", async () => {
    await expect(
      manager.getAccountInsights({
        metric: "  ",
        period: "day",
        metricType: "total_value",
      }),
    ).rejects.toThrow("metric parameter must be a non-empty string");
  });
});
