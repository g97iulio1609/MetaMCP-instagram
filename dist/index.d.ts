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
    publishMedia(creationId: string): Promise<Record<string, unknown>>;
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
    ig_get_recent_media: string;
    ig_get_media_insights: string;
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
