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
    ig_post_story: z.object({
        image_url: z.string().url().describe("Public URL of the image for the story"),
    }),
    ig_post_carousel: z.object({
        image_urls: z.array(z.string().url()).min(2).max(10).describe("Array of public URLs for images in the carousel (2-10 images)"),
        caption: z.string().optional().describe("Caption for the carousel post"),
        location_id: z.string().optional().describe("Facebook Page ID of the location"),
    }),
    ig_post_reel: z.object({
        video_url: z.string().url().describe("Public URL of the video for the reel"),
        caption: z.string().optional().describe("Caption for the reel"),
        cover_url: z.string().url().optional().describe("Public URL for the custom cover image"),
        location_id: z.string().optional().describe("Facebook Page ID of the location"),
        share_to_feed: z.boolean().optional().default(true).describe("Whether to share the reel to the feed"),
    }),
    ig_get_comments: z.object({
        media_id: z.string().min(1).describe("The ID of the media object to get comments for"),
        limit: z.number().int().min(1).max(50).optional().default(25),
    }),
    ig_reply_comment: z.object({
        comment_id: z.string().min(1).describe("The ID of the comment to reply to"),
        message: z.string().min(1).describe("The reply message text"),
    }),
    ig_delete_comment: z.object({
        comment_id: z.string().min(1).describe("The ID of the comment to delete"),
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
    ig_post_story: "Publish a photo as an Instagram Story.",
    ig_post_carousel: "Publish a carousel verification (multiple photos) to Instagram Feed.",
    ig_post_reel: "Publish a video (Reel) to Instagram.",
    ig_get_recent_media: "Get recent media objects from the Instagram account.",
    ig_get_media_insights: "Get insights for a specific Instagram media object.",
    ig_get_comments: "Get comments on a specific media object.",
    ig_reply_comment: "Reply to a specific comment.",
    ig_delete_comment: "Delete a specific comment/reply.",
};

export type ToolName = keyof typeof toolSchemas;

// Export inferred types for each tool schema
export type IgPostPhotoArgs = z.infer<typeof toolSchemas.ig_post_photo>;
export type IgGetRecentMediaArgs = z.infer<typeof toolSchemas.ig_get_recent_media>;
export type IgGetMediaInsightsArgs = z.infer<typeof toolSchemas.ig_get_media_insights>;
