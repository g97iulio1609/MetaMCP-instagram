import { z } from "zod";
import { buildRegistry, MetaGraphClient, postContentSchema, type ToolRegistry } from "@giulio-leone/meta-mcp-core";

const publishSchema = postContentSchema.extend({
  mediaUrl: z.string().url(),
});

const scheduleSchema = publishSchema.extend({
  scheduledAtIso: z.string().datetime(),
});

const resolvePermalinkSchema = z.object({
  permalinkUrl: z.string().url(),
});

const updateCaptionSchema = z.object({
  mediaId: z.string().min(1),
  caption: z.string().min(1),
});

const deleteMediaSchema = z.object({
  mediaId: z.string().min(1),
});

const accountInsightsSchema = z.object({
  metric: z.string().default("views,follower_count,follows_and_unfollows"),
  period: z.enum(["day", "lifetime"]).default("day"),
  metricType: z.enum(["total_value", "time_series"]).default("total_value"),
  timeframe: z.string().optional(),
  breakdown: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
});

const envSchema = z.object({
  accessToken: z.string().min(1),
  igUserId: z.string().min(1),
  apiVersion: z.string().min(1).default("v22.0"),
});

type PublishPayload = z.infer<typeof publishSchema>;
type SchedulePayload = z.infer<typeof scheduleSchema>;
type ResolvePermalinkPayload = z.infer<typeof resolvePermalinkSchema>;
type UpdateCaptionPayload = z.infer<typeof updateCaptionSchema>;
type DeleteMediaPayload = z.infer<typeof deleteMediaSchema>;
type AccountInsightsPayload = z.infer<typeof accountInsightsSchema>;

export class InstagramManager {
  private readonly graph: MetaGraphClient;
  private readonly igUserId: string;

  constructor(params: { accessToken: string; igUserId: string; apiVersion?: string }) {
    const parsed = envSchema.parse(params);
    this.graph = new MetaGraphClient({
      accessToken: parsed.accessToken,
      apiVersion: parsed.apiVersion,
    });
    this.igUserId = parsed.igUserId;
  }

  static fromEnv() {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? process.env.META_PAGE_ACCESS_TOKEN;
    const igUserId = process.env.INSTAGRAM_IG_USER_ID;

    if (!accessToken || !igUserId) {
      throw new Error("INSTAGRAM_ACCESS_TOKEN (or META_PAGE_ACCESS_TOKEN) and INSTAGRAM_IG_USER_ID are required.");
    }

    return new InstagramManager({
      accessToken,
      igUserId,
      apiVersion: process.env.META_GRAPH_API_VERSION,
    });
  }

  async publish(payload: PublishPayload) {
    const container = await this.graph.post(`/${this.igUserId}/media`, {
      image_url: payload.mediaUrl,
      caption: payload.content,
    });

    const creationId = container.id;
    if (typeof creationId !== "string") {
      throw new Error("Instagram media container creation failed.");
    }

    const publishResult = await this.graph.post(`/${this.igUserId}/media_publish`, {
      creation_id: creationId,
    });

    return {
      channel: "instagram",
      status: "published",
      creationId,
      graphResponse: publishResult,
    };
  }

  async schedule(payload: SchedulePayload) {
    return {
      channel: "instagram",
      status: "scheduled",
      note: "Use dashboard scheduler-worker for Instagram scheduling.",
      scheduledAtIso: payload.scheduledAtIso,
      payload,
    };
  }

  async resolvePermalink(payload: ResolvePermalinkPayload) {
    let result: Record<string, unknown>;
    let mediaId: unknown;
    try {
      result = await this.graph.get("/instagram_oembed", {
        url: payload.permalinkUrl,
        omitscript: true,
      });
      mediaId = result.media_id;
    } catch {
      result = await this.graph.get(`/${this.igUserId}/media`, {
        fields: "id,permalink,caption,timestamp,media_type",
        limit: 25,
      });
      const data = Array.isArray(result.data) ? result.data : [];
      const normalizedTarget = payload.permalinkUrl.replace(/\/$/, "");
      const match = data.find((item) => {
        if (!item || typeof item !== "object") {
          return false;
        }
        const permalink = (item as { permalink?: unknown }).permalink;
        return typeof permalink === "string" && permalink.replace(/\/$/, "") === normalizedTarget;
      }) as { id?: unknown } | undefined;
      mediaId = match?.id;
    }

    return {
      channel: "instagram",
      status: "resolved",
      permalinkUrl: payload.permalinkUrl,
      mediaId,
      result,
    };
  }

  async updateCaption(payload: UpdateCaptionPayload) {
    const result = await this.graph.post(`/${payload.mediaId}`, {
      caption: payload.caption,
    });

    return {
      channel: "instagram",
      status: "updated",
      mediaId: payload.mediaId,
      result,
    };
  }

  async deleteMedia(payload: DeleteMediaPayload) {
    const result = await this.graph.delete(`/${payload.mediaId}`);
    return {
      channel: "instagram",
      status: "deleted",
      mediaId: payload.mediaId,
      result,
    };
  }

  async getAccountInsights(payload: AccountInsightsPayload) {
    if (!payload.metric || payload.metric.trim() === "") {
      throw new Error("metric parameter must be a non-empty string");
    }
    const params: Record<string, unknown> = {
      metric: payload.metric,
      period: payload.period,
      metric_type: payload.metricType,
    };
    if (payload.timeframe) params.timeframe = payload.timeframe;
    if (payload.breakdown) params.breakdown = payload.breakdown;
    if (payload.since) params.since = payload.since;
    if (payload.until) params.until = payload.until;
    try {
      const result = await this.graph.get(`/${this.igUserId}/insights`, params);
      return { channel: "instagram", status: "ok", result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { channel: "instagram", status: "error", error: message };
    }
  }
}

export function createToolRegistry(manager: InstagramManager): ToolRegistry {
  return buildRegistry(
    [
      {
        name: "instagram_publish",
        description: "Publish image content to Instagram using Meta Graph API",
        inputSchema: publishSchema.shape,
      },
      {
        name: "instagram_schedule",
        description: "Schedule Instagram content through scheduler workflow",
        inputSchema: scheduleSchema.shape,
      },
      {
        name: "instagram_resolve_permalink",
        description: "Resolve Instagram permalink URL into Graph media id",
        inputSchema: resolvePermalinkSchema.shape,
      },
      {
        name: "instagram_update_caption",
        description: "Update caption of an existing Instagram media",
        inputSchema: updateCaptionSchema.shape,
      },
      {
        name: "instagram_delete_media",
        description: "Delete an Instagram media by id",
        inputSchema: deleteMediaSchema.shape,
      },
      {
        name: "instagram_account_insights",
        description: "Get account-level insights (demographics, followers, views)",
        inputSchema: accountInsightsSchema.shape,
      },
    ],
    {
      instagram_publish: async (args: Record<string, unknown>) => manager.publish(publishSchema.parse(args)),
      instagram_schedule: async (args: Record<string, unknown>) => manager.schedule(scheduleSchema.parse(args)),
      instagram_resolve_permalink: async (args: Record<string, unknown>) => manager.resolvePermalink(resolvePermalinkSchema.parse(args)),
      instagram_update_caption: async (args: Record<string, unknown>) => manager.updateCaption(updateCaptionSchema.parse(args)),
      instagram_delete_media: async (args: Record<string, unknown>) => manager.deleteMedia(deleteMediaSchema.parse(args)),
      instagram_account_insights: async (args: Record<string, unknown>) => manager.getAccountInsights(accountInsightsSchema.parse(args)),
    },
  );
}
