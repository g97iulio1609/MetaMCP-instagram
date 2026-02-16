import { GraphApiClient, InstagramMedia, ToolRegistry } from '@meta-mcp/core';
export { ToolDefinition, ToolHandler, ToolRegistry } from '@meta-mcp/core';
import { z } from 'zod';
import * as ai from 'ai';

declare class InstagramManager {
    private readonly client;
    private readonly accountId;
    constructor(client: GraphApiClient, accountId: string);
    static fromEnv(): InstagramManager;
    postPhoto(imageUrl: string, caption?: string, options?: {
        user_tags?: Array<{
            username: string;
            x?: number;
            y?: number;
        }>;
        location_id?: string;
    }): Promise<Record<string, unknown>>;
    postStory(imageUrl: string): Promise<Record<string, unknown>>;
    publishMedia(creationId: string): Promise<Record<string, unknown>>;
    postCarousel(imageUrls: string[], caption?: string, options?: {
        location_id?: string;
    }): Promise<Record<string, unknown>>;
    postReel(videoUrl: string, caption?: string, options?: {
        cover_url?: string;
        location_id?: string;
        share_to_feed?: boolean;
    }): Promise<Record<string, unknown>>;
    private waitForMediaReady;
    getComments(mediaId: string, limit?: number): Promise<Record<string, unknown>>;
    replyComment(commentId: string, message: string): Promise<Record<string, unknown>>;
    deleteComment(commentId: string): Promise<Record<string, unknown>>;
    getRecentMedia(limit?: number): Promise<InstagramMedia[]>;
    getMediaInsights(mediaId: string): Promise<Record<string, unknown>>;
}

declare const toolSchemas: {
    ig_post_photo: z.ZodObject<{
        image_url: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
        user_tags: z.ZodOptional<z.ZodArray<z.ZodObject<{
            username: z.ZodString;
            x: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            y: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            username: string;
            x: number;
            y: number;
        }, {
            username: string;
            x?: number | undefined;
            y?: number | undefined;
        }>, "many">>;
        location_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        image_url: string;
        caption?: string | undefined;
        location_id?: string | undefined;
        user_tags?: {
            username: string;
            x: number;
            y: number;
        }[] | undefined;
    }, {
        image_url: string;
        caption?: string | undefined;
        location_id?: string | undefined;
        user_tags?: {
            username: string;
            x?: number | undefined;
            y?: number | undefined;
        }[] | undefined;
    }>;
    ig_post_story: z.ZodObject<{
        image_url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        image_url: string;
    }, {
        image_url: string;
    }>;
    ig_post_carousel: z.ZodObject<{
        image_urls: z.ZodArray<z.ZodString, "many">;
        caption: z.ZodOptional<z.ZodString>;
        location_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        image_urls: string[];
        caption?: string | undefined;
        location_id?: string | undefined;
    }, {
        image_urls: string[];
        caption?: string | undefined;
        location_id?: string | undefined;
    }>;
    ig_post_reel: z.ZodObject<{
        video_url: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
        cover_url: z.ZodOptional<z.ZodString>;
        location_id: z.ZodOptional<z.ZodString>;
        share_to_feed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        video_url: string;
        share_to_feed: boolean;
        caption?: string | undefined;
        location_id?: string | undefined;
        cover_url?: string | undefined;
    }, {
        video_url: string;
        caption?: string | undefined;
        location_id?: string | undefined;
        cover_url?: string | undefined;
        share_to_feed?: boolean | undefined;
    }>;
    ig_get_comments: z.ZodObject<{
        media_id: z.ZodString;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        media_id: string;
    }, {
        media_id: string;
        limit?: number | undefined;
    }>;
    ig_reply_comment: z.ZodObject<{
        comment_id: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        comment_id: string;
    }, {
        message: string;
        comment_id: string;
    }>;
    ig_delete_comment: z.ZodObject<{
        comment_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        comment_id: string;
    }, {
        comment_id: string;
    }>;
    ig_get_recent_media: z.ZodObject<{
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
    }, {
        limit?: number | undefined;
    }>;
    ig_get_media_insights: z.ZodObject<{
        media_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        media_id: string;
    }, {
        media_id: string;
    }>;
};
declare const toolDescriptions: {
    ig_post_photo: string;
    ig_post_story: string;
    ig_post_carousel: string;
    ig_post_reel: string;
    ig_get_recent_media: string;
    ig_get_media_insights: string;
    ig_get_comments: string;
    ig_reply_comment: string;
    ig_delete_comment: string;
};
type ToolName = keyof typeof toolSchemas;
type IgPostPhotoArgs = z.infer<typeof toolSchemas.ig_post_photo>;
type IgGetRecentMediaArgs = z.infer<typeof toolSchemas.ig_get_recent_media>;
type IgGetMediaInsightsArgs = z.infer<typeof toolSchemas.ig_get_media_insights>;

declare const createToolRegistry: (manager: InstagramManager) => ToolRegistry<ToolName>;
type InstagramToolRegistry = ToolRegistry<ToolName>;

declare const createAiSdkTools: (manager?: InstagramManager) => {
    ig_post_photo: ai.Tool<any, unknown> & {
        execute: (args: any, options: ai.ToolExecutionOptions) => PromiseLike<unknown>;
    };
    ig_get_recent_media: ai.Tool<any, unknown> & {
        execute: (args: any, options: ai.ToolExecutionOptions) => PromiseLike<unknown>;
    };
    ig_get_media_insights: ai.Tool<any, unknown> & {
        execute: (args: any, options: ai.ToolExecutionOptions) => PromiseLike<unknown>;
    };
};

export { type IgGetMediaInsightsArgs, type IgGetRecentMediaArgs, type IgPostPhotoArgs, InstagramManager, type InstagramToolRegistry, type ToolName, createAiSdkTools, createToolRegistry, toolDescriptions, toolSchemas };
