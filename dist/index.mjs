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
  async postStory(imageUrl) {
    const container = await this.client.request({
      method: "POST",
      endpoint: `${this.accountId}/media`,
      params: {
        image_url: imageUrl,
        media_type: "STORIES"
      },
      accessToken: graphConfig.accessToken
    });
    if (!container.id) {
      throw new Error("Failed to create story container");
    }
    return this.publishMedia(container.id);
  }
  // TODO: Add postVideo if needed (requires video upgrade)
  async publishMedia(creationId) {
    return this.client.request({
      method: "POST",
      endpoint: `${this.accountId}/media_publish`,
      params: {
        creation_id: creationId
      },
      accessToken: graphConfig.accessToken
    });
  }
  async postCarousel(imageUrls, caption, options) {
    const childrenIds = [];
    for (const url of imageUrls) {
      const container = await this.client.request({
        method: "POST",
        endpoint: `${this.accountId}/media`,
        params: {
          image_url: url,
          is_carousel_item: true
        },
        accessToken: graphConfig.accessToken
      });
      if (container.id) childrenIds.push(container.id);
    }
    if (childrenIds.length < 2) {
      throw new Error("Failed to create at least 2 carousel items");
    }
    const containerParams = {
      media_type: "CAROUSEL",
      children: childrenIds
    };
    if (caption) containerParams.caption = caption;
    if (options?.location_id) containerParams.location_id = options.location_id;
    const carouselContainer = await this.client.request({
      method: "POST",
      endpoint: `${this.accountId}/media`,
      // Instagram API expects comma-separated list for children if passed as query param, or JSON array in body. 
      // GraphClient sends params as query string or body depending on method? 
      // Assuming mixed usage here, let's format children correctly.
      params: {
        ...containerParams,
        children: childrenIds.join(",")
      },
      accessToken: graphConfig.accessToken
    });
    if (!carouselContainer.id) {
      throw new Error("Failed to create carousel container");
    }
    return this.publishMedia(carouselContainer.id);
  }
  async postReel(videoUrl, caption, options) {
    const containerParams = {
      media_type: "REELS",
      video_url: videoUrl
    };
    if (caption) containerParams.caption = caption;
    if (options?.cover_url) containerParams.cover_url = options.cover_url;
    if (options?.location_id) containerParams.location_id = options.location_id;
    if (options?.share_to_feed !== void 0) containerParams.share_to_feed = options.share_to_feed;
    const container = await this.client.request({
      method: "POST",
      endpoint: `${this.accountId}/media`,
      params: containerParams,
      accessToken: graphConfig.accessToken
    });
    if (!container.id) {
      throw new Error("Failed to create reel container");
    }
    await this.waitForMediaReady(container.id);
    return this.publishMedia(container.id);
  }
  async waitForMediaReady(containerId) {
    let attempts = 0;
    const maxAttempts = 15;
    while (attempts < maxAttempts) {
      try {
        const status = await this.client.request({
          method: "GET",
          endpoint: containerId,
          params: { fields: "status_code" },
          accessToken: graphConfig.accessToken
        });
        if (status.status_code === "FINISHED") return;
        if (status.status_code === "ERROR") throw new Error("Media processing failed");
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        attempts++;
      } catch (e) {
        console.error("Error checking media status:", e);
        return;
      }
    }
  }
  async getComments(mediaId, limit = 25) {
    return this.client.request({
      method: "GET",
      endpoint: `${mediaId}/comments`,
      params: {
        fields: "id,timestamp,text,username,like_count,replies,user",
        limit
      },
      accessToken: graphConfig.accessToken
    });
  }
  async replyComment(commentId, message) {
    return this.client.request({
      method: "POST",
      endpoint: `${commentId}/replies`,
      params: { message },
      accessToken: graphConfig.accessToken
    });
  }
  async deleteComment(commentId) {
    return this.client.request({
      method: "DELETE",
      endpoint: commentId,
      accessToken: graphConfig.accessToken
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
  ig_post_story: z.object({
    image_url: z.string().url().describe("Public URL of the image for the story")
  }),
  ig_post_carousel: z.object({
    image_urls: z.array(z.string().url()).min(2).max(10).describe("Array of public URLs for images in the carousel (2-10 images)"),
    caption: z.string().optional().describe("Caption for the carousel post"),
    location_id: z.string().optional().describe("Facebook Page ID of the location")
  }),
  ig_post_reel: z.object({
    video_url: z.string().url().describe("Public URL of the video for the reel"),
    caption: z.string().optional().describe("Caption for the reel"),
    cover_url: z.string().url().optional().describe("Public URL for the custom cover image"),
    location_id: z.string().optional().describe("Facebook Page ID of the location"),
    share_to_feed: z.boolean().optional().default(true).describe("Whether to share the reel to the feed")
  }),
  ig_get_comments: z.object({
    media_id: z.string().min(1).describe("The ID of the media object to get comments for"),
    limit: z.number().int().min(1).max(50).optional().default(25)
  }),
  ig_reply_comment: z.object({
    comment_id: z.string().min(1).describe("The ID of the comment to reply to"),
    message: z.string().min(1).describe("The reply message text")
  }),
  ig_delete_comment: z.object({
    comment_id: z.string().min(1).describe("The ID of the comment to delete")
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
  ig_post_story: "Publish a photo as an Instagram Story.",
  ig_post_carousel: "Publish a carousel verification (multiple photos) to Instagram Feed.",
  ig_post_reel: "Publish a video (Reel) to Instagram.",
  ig_get_recent_media: "Get recent media objects from the Instagram account.",
  ig_get_media_insights: "Get insights for a specific Instagram media object.",
  ig_get_comments: "Get comments on a specific media object.",
  ig_reply_comment: "Reply to a specific comment.",
  ig_delete_comment: "Delete a specific comment/reply."
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
    ig_post_story: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_post_story, args);
      return manager.postStory(parsed.image_url);
    },
    ig_post_carousel: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_post_carousel, args);
      return manager.postCarousel(parsed.image_urls, parsed.caption, {
        location_id: parsed.location_id
      });
    },
    ig_post_reel: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_post_reel, args);
      return manager.postReel(parsed.video_url, parsed.caption, {
        cover_url: parsed.cover_url,
        location_id: parsed.location_id,
        share_to_feed: parsed.share_to_feed
      });
    },
    ig_get_comments: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_get_comments, args);
      return manager.getComments(parsed.media_id, parsed.limit);
    },
    ig_reply_comment: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_reply_comment, args);
      return manager.replyComment(parsed.comment_id, parsed.message);
    },
    ig_delete_comment: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_delete_comment, args);
      return manager.deleteComment(parsed.comment_id);
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
