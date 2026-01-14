import { z } from "zod";

export const toolSchemas = {
    ig_post_photo: z.object({
        image_url: z.string().url(),
        caption: z.string().optional(),
        user_tags: z.array(z.object({
            username: z.string(),
            x: z.number().min(0).max(1).optional().default(0.5),
            y: z.number().min(0).max(1).optional().default(0.5),
        })).optional().describe("Array of users to tag with x/y coordinates (0.0 to 1.0)"),
        location_id: z.string().optional().describe("Facebook Page ID of the location"),
    }),
    ig_get_recent_media: z.object({
        limit: z.number().int().min(1).max(50).optional().default(25),
    }),
    ig_get_media_insights: z.object({
        media_id: z.string().min(1),
    }),
};

export const toolDescriptions = {
    ig_post_photo: "Publish a photo to Instagram Feed.",
    ig_get_recent_media: "Get recent media objects from the Instagram account.",
    ig_get_media_insights: "Get insights for a specific Instagram media object.",
};

export type ToolName = keyof typeof toolSchemas;

// Export inferred types for each tool schema
export type IgPostPhotoArgs = z.infer<typeof toolSchemas.ig_post_photo>;
export type IgGetRecentMediaArgs = z.infer<typeof toolSchemas.ig_get_recent_media>;
export type IgGetMediaInsightsArgs = z.infer<typeof toolSchemas.ig_get_media_insights>;
