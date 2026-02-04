"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  InstagramManager: () => InstagramManager,
  createAiSdkTools: () => createAiSdkTools,
  createToolRegistry: () => createToolRegistry,
  toolDescriptions: () => toolDescriptions,
  toolSchemas: () => toolSchemas
});
module.exports = __toCommonJS(index_exports);

// src/manager.ts
var import_core = require("@meta-mcp/core");
var InstagramManager = class _InstagramManager {
  client;
  accountId;
  constructor(client, accountId) {
    this.client = client;
    this.accountId = accountId;
  }
  static fromEnv() {
    if (!import_core.graphConfig.instagramAccountId) {
      throw new Error("INSTAGRAM_ACCOUNT_ID is not configured");
    }
    return new _InstagramManager(new import_core.GraphApiClient(import_core.graphConfig), import_core.graphConfig.instagramAccountId);
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
      accessToken: import_core.graphConfig.accessToken
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
var import_zod = require("zod");
var toolSchemas = {
  ig_post_photo: import_zod.z.object({
    image_url: import_zod.z.string().url(),
    caption: import_zod.z.string().optional(),
    user_tags: import_zod.z.array(import_zod.z.object({
      username: import_zod.z.string(),
      x: import_zod.z.number().min(0).max(1).optional().default(0.5),
      y: import_zod.z.number().min(0).max(1).optional().default(0.5)
    })).optional().describe("Array of users to tag with x/y coordinates (0.0 to 1.0)"),
    location_id: import_zod.z.string().optional().describe("Facebook Page ID of the location")
  }),
  ig_get_recent_media: import_zod.z.object({
    limit: import_zod.z.number().int().min(1).max(50).optional().default(25)
  }),
  ig_get_media_insights: import_zod.z.object({
    media_id: import_zod.z.string().min(1)
  })
};
var toolDescriptions = {
  ig_post_photo: "Publish a photo to Instagram Feed.",
  ig_get_recent_media: "Get recent media objects from the Instagram account.",
  ig_get_media_insights: "Get insights for a specific Instagram media object."
};

// src/toolRegistry.ts
var import_core2 = require("@meta-mcp/core");
var createToolRegistry = (manager) => {
  const handlers = {
    ig_post_photo: async (args) => {
      const parsed = (0, import_core2.parseToolArgs)(toolSchemas.ig_post_photo, args);
      return manager.postPhoto(parsed.image_url, parsed.caption, {
        user_tags: parsed.user_tags,
        location_id: parsed.location_id
      });
    },
    ig_get_recent_media: async (args) => {
      const parsed = (0, import_core2.parseToolArgs)(toolSchemas.ig_get_recent_media, args);
      return manager.getRecentMedia(parsed.limit);
    },
    ig_get_media_insights: async (args) => {
      const parsed = (0, import_core2.parseToolArgs)(toolSchemas.ig_get_media_insights, args);
      return manager.getMediaInsights(parsed.media_id);
    }
  };
  const definitions = (0, import_core2.buildToolDefinitions)(toolSchemas, toolDescriptions);
  return { definitions, handlers };
};

// src/ai-sdk.ts
var import_ai = require("ai");
var buildTool = (schema, description, execute) => (0, import_ai.tool)({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InstagramManager,
  createAiSdkTools,
  createToolRegistry,
  toolDescriptions,
  toolSchemas
});
