import type { InstagramManager } from "./manager.js";
import { toolDescriptions, toolSchemas, type ToolName } from "./toolSchemas.js";
import { buildToolDefinitions, parseToolArgs, type ToolDefinition, type ToolHandler, type ToolRegistry } from "@meta-mcp/core";

export type { ToolDefinition, ToolHandler, ToolRegistry };

export const createToolRegistry = (manager: InstagramManager): ToolRegistry<ToolName> => {
  const handlers: Record<ToolName, ToolHandler> = {
    ig_post_photo: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_post_photo, args);
      return manager.postPhoto(parsed.image_url, parsed.caption, {
        user_tags: parsed.user_tags,
        location_id: parsed.location_id,
      });
    },
    ig_get_recent_media: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_get_recent_media, args);
      return manager.getRecentMedia(parsed.limit);
    },
    ig_get_media_insights: async (args) => {
      const parsed = parseToolArgs(toolSchemas.ig_get_media_insights, args);
      return manager.getMediaInsights(parsed.media_id);
    },
  };

  const definitions = buildToolDefinitions(toolSchemas, toolDescriptions) as ToolDefinition<ToolName>[];

  return { definitions, handlers };
};

export type InstagramToolRegistry = ToolRegistry<ToolName>;
