// src/manager.ts
import { GraphApiClient, graphConfig } from "@meta-mcp/core";
var InstagramManager = class _InstagramManager {
  client;
  accountId;
  constructor(client, accountId) {
    this.client = client;
    this.accountId = accountId;
  }
  static fromEnv() {
    if (!graphConfig.instagramAccountId) {
      throw new Error("INSTAGRAM_ACCOUNT_ID is not configured");
    }
    return new _InstagramManager(new GraphApiClient(graphConfig), graphConfig.instagramAccountId);
  }
  async postPhoto(imageUrl, caption, options = {}) {
    const containerParams = {
      image_url: imageUrl,
      caption,
      media_type: "IMAGE",
      location_id: options.location_id
    };
    if (options.user_tags && options.user_tags.length > 0) {
      containerParams.user_tags = JSON.stringify(options.user_tags.map((tag) => ({
        username: tag.username,
        x: tag.x ?? 0.5,
        y: tag.y ?? 0.5
      })));
    }
    const container = await this.client.request({
      method: "POST",
      endpoint: `${this.accountId}/media`,
      params: containerParams,
      accessToken: graphConfig.accessToken
      // Uses FB token with IG permissions
    });
    if (!container.id) {
      throw new Error("Failed to create media container");
    }
    return this.publishMedia(container.id);
  }
  // TODO: Add postVideo if needed (requires video upgrade)
  async publishMedia(creationId) {
    return this.client.request({
      method: "POST",
      endpoint: `${this.accountId}/media_publish`,
      params: { creation_id: creationId }
    });
  }
  async getRecentMedia(limit = 25) {
    const response = await this.client.request({
      method: "GET",
      endpoint: `${this.accountId}/media`,
      params: {
        fields: "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
        limit
      }
    });
    return response.data;
  }
  async getMediaInsights(mediaId) {
    const metrics = [
      "impressions",
      "reach",
      "engagement",
      "saved"
    ];
    return this.client.request({
      method: "GET",
      endpoint: `${mediaId}/insights`,
      params: {
        metric: metrics.join(",")
      }
    });
  }
};

// src/toolSchemas.ts
import { z } from "zod";
var toolSchemas = {
  ig_post_photo: z.object({
    image_url: z.string().url(),
    caption: z.string().optional(),
    user_tags: z.array(z.object({
      username: z.string(),
      x: z.number().min(0).max(1).optional().default(0.5),
      y: z.number().min(0).max(1).optional().default(0.5)
    })).optional().describe("Array of users to tag with x/y coordinates (0.0 to 1.0)"),
    location_id: z.string().optional().describe("Facebook Page ID of the location")
  }),
  ig_get_recent_media: z.object({
    limit: z.number().int().min(1).max(50).optional().default(25)
  }),
  ig_get_media_insights: z.object({
    media_id: z.string().min(1)
  })
};
var toolDescriptions = {
  ig_post_photo: "Publish a photo to Instagram Feed.",
  ig_get_recent_media: "Get recent media objects from the Instagram account.",
  ig_get_media_insights: "Get insights for a specific Instagram media object."
};

// src/toolRegistry.ts
import { buildToolDefinitions, parseToolArgs } from "@meta-mcp/core";
var createToolRegistry = (manager) => {
  const handlers = {
    ig_post_photo: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_post_photo, args);
      return manager.postPhoto(parsed.image_url, parsed.caption, {
        user_tags: parsed.user_tags,
        location_id: parsed.location_id
      });
    },
    ig_get_recent_media: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_get_recent_media, args);
      return manager.getRecentMedia(parsed.limit);
    },
    ig_get_media_insights: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_get_media_insights, args);
      return manager.getMediaInsights(parsed.media_id);
    }
  };
  const definitions = buildToolDefinitions(toolSchemas, toolDescriptions);
  return { definitions, handlers };
};

// src/ai-sdk.ts
import { tool } from "ai";
var buildTool = (schema, description, execute) => tool({
  description,
  parameters: schema,
  execute: async (args) => execute(args)
});
var createAiSdkTools = (manager = InstagramManager.fromEnv()) => ({
  ig_post_photo: buildTool(
    toolSchemas.ig_post_photo,
    toolDescriptions.ig_post_photo,
    async (args) => manager.postPhoto(args.image_url, args.caption, {
      user_tags: args.user_tags,
      location_id: args.location_id
    })
  ),
  ig_get_recent_media: buildTool(
    toolSchemas.ig_get_recent_media,
    toolDescriptions.ig_get_recent_media,
    async (args) => manager.getRecentMedia(args.limit)
  ),
  ig_get_media_insights: buildTool(
    toolSchemas.ig_get_media_insights,
    toolDescriptions.ig_get_media_insights,
    async (args) => manager.getMediaInsights(args.media_id)
  )
});
export {
  InstagramManager,
  createAiSdkTools,
  createToolRegistry,
  toolDescriptions,
  toolSchemas
};
