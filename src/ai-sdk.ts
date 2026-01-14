import { tool } from "ai";
import { InstagramManager } from "./manager.js";
import { toolDescriptions, toolSchemas } from "./toolSchemas.js";

const buildTool = <TInput>(
    schema: any, // Relax type for now to avoid complexity
    description: string,
    execute: (args: TInput) => Promise<unknown>,
) =>
    tool({
        description,
        parameters: schema,
        execute: async (args: any) => execute(args),
    });

export const createAiSdkTools = (manager = InstagramManager.fromEnv()) => ({
    ig_post_photo: buildTool(
        toolSchemas.ig_post_photo,
        toolDescriptions.ig_post_photo,
        async (args: any) => manager.postPhoto(args.image_url, args.caption, {
            user_tags: args.user_tags,
            location_id: args.location_id,
        }),
    ),
    ig_get_recent_media: buildTool(
        toolSchemas.ig_get_recent_media,
        toolDescriptions.ig_get_recent_media,
        async (args: any) => manager.getRecentMedia(args.limit),
    ),
    ig_get_media_insights: buildTool(
        toolSchemas.ig_get_media_insights,
        toolDescriptions.ig_get_media_insights,
        async (args: any) => manager.getMediaInsights(args.media_id),
    ),
});
