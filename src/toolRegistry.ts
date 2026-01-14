import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type { InstagramManager } from "./manager.js";
import { toolDescriptions, toolSchemas, type ToolName } from "./toolSchemas.js";

export interface ToolDefinition {
    name: ToolName;
    description: string;
    inputSchema: Record<string, unknown>;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export interface ToolRegistry {
    definitions: ToolDefinition[];
    handlers: Record<ToolName, ToolHandler>;
}

export const createToolRegistry = (manager: InstagramManager): ToolRegistry => {
    const handlers: Record<ToolName, ToolHandler> = {
        ig_post_photo: async (args) => {
            const parsed = toolSchemas.ig_post_photo.parse(args);
            return manager.postPhoto(parsed.image_url, parsed.caption, {
                user_tags: parsed.user_tags,
                location_id: parsed.location_id,
            });
        },
        ig_get_recent_media: async (args) => {
            const parsed = toolSchemas.ig_get_recent_media.parse(args);
            return manager.getRecentMedia(parsed.limit);
        },
        ig_get_media_insights: async (args) => {
            const parsed = toolSchemas.ig_get_media_insights.parse(args);
            return manager.getMediaInsights(parsed.media_id);
        },
    };

    const definitions = (Object.keys(toolSchemas) as ToolName[]).map((name) => ({
        name,
        description: toolDescriptions[name],
        inputSchema: zodToJsonSchema(
            toolSchemas[name] as unknown as Parameters<typeof zodToJsonSchema>[0],
            {
                name,
                $refStrategy: "none",
            },
        ) as Record<string, unknown>,
    }));

    return { definitions, handlers };
};
