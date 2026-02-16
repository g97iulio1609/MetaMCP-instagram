import { GraphApiClient, graphConfig, InstagramMedia } from "@meta-mcp/core";

export class InstagramManager {
    private readonly client: GraphApiClient;
    private readonly accountId: string;

    constructor(client: GraphApiClient, accountId: string) {
        this.client = client;
        this.accountId = accountId;
    }

    static fromEnv(): InstagramManager {
        if (!graphConfig.instagramAccountId) {
            throw new Error("INSTAGRAM_ACCOUNT_ID is not configured");
        }
        return new InstagramManager(new GraphApiClient(graphConfig), graphConfig.instagramAccountId);
    }

    async postPhoto(imageUrl: string, caption?: string, options: {
        user_tags?: Array<{ username: string; x?: number; y?: number }>;
        location_id?: string;
    } = {}): Promise<Record<string, unknown>> {
        // Step 1: Create Container
        const containerParams: Record<string, unknown> = {
            image_url: imageUrl,
            caption: caption,
            media_type: "IMAGE",
            location_id: options.location_id,
        };

        if (options.user_tags && options.user_tags.length > 0) {
            containerParams.user_tags = JSON.stringify(options.user_tags.map(tag => ({
                username: tag.username,
                x: tag.x ?? 0.5,
                y: tag.y ?? 0.5
            })));
        }

        const container = await this.client.request<{ id: string }>({
            method: "POST",
            endpoint: `${this.accountId}/media`,
            params: containerParams as Record<string, string | number | boolean>,
            accessToken: graphConfig.accessToken, // Uses FB token with IG permissions
        });

        if (!container.id) {
            throw new Error("Failed to create media container");
        }

        // Step 2: Publish Container
        return this.publishMedia(container.id);
    }

    async postStory(imageUrl: string): Promise<Record<string, unknown>> {
        // Step 1: Create Story Container
        const container = await this.client.request<{ id: string }>({
            method: "POST",
            endpoint: `${this.accountId}/media`,
            params: {
                image_url: imageUrl,
                media_type: "STORIES",
            } as Record<string, string | number | boolean>,
            accessToken: graphConfig.accessToken,
        });

        if (!container.id) {
            throw new Error("Failed to create story container");
        }

        // Step 2: Publish Story
        return this.publishMedia(container.id);
    }

    // TODO: Add postVideo if needed (requires video upgrade)

    async publishMedia(creationId: string): Promise<Record<string, unknown>> {
        return this.client.request({
            method: "POST",
            endpoint: `${this.accountId}/media_publish`,
            params: {
                creation_id: creationId,
            } as Record<string, string | number | boolean>,
            accessToken: graphConfig.accessToken,
        });
    }

    async postCarousel(imageUrls: string[], caption?: string, options?: { location_id?: string }): Promise<Record<string, unknown>> {
        // Step 1: Create Item Containers for each image
        const childrenIds: string[] = [];
        for (const url of imageUrls) {
            const container = await this.client.request<{ id: string }>({
                method: "POST",
                endpoint: `${this.accountId}/media`,
                params: {
                    image_url: url,
                    is_carousel_item: true,
                } as Record<string, string | number | boolean>,
                accessToken: graphConfig.accessToken,
            });
            if (container.id) childrenIds.push(container.id);
        }

        if (childrenIds.length < 2) {
            throw new Error("Failed to create at least 2 carousel items");
        }

        // Step 2: Create Carousel Container
        const containerParams: Record<string, string | number | boolean | string[]> = {
            media_type: "CAROUSEL",
            children: childrenIds,
        };
        if (caption) containerParams.caption = caption;
        if (options?.location_id) containerParams.location_id = options.location_id;

        const carouselContainer = await this.client.request<{ id: string }>({
            method: "POST",
            endpoint: `${this.accountId}/media`,
            // Instagram API expects comma-separated list for children if passed as query param, or JSON array in body. 
            // GraphClient sends params as query string or body depending on method? 
            // Assuming mixed usage here, let's format children correctly.
            params: {
                ...containerParams,
                children: childrenIds.join(',')
            } as Record<string, string | number | boolean>,
            accessToken: graphConfig.accessToken,
        });

        if (!carouselContainer.id) {
            throw new Error("Failed to create carousel container");
        }

        // Step 3: Publish Carousel
        return this.publishMedia(carouselContainer.id);
    }

    async postReel(videoUrl: string, caption?: string, options?: { cover_url?: string, location_id?: string, share_to_feed?: boolean }): Promise<Record<string, unknown>> {
        // Step 1: Initialize Upload
        const containerParams: Record<string, string | number | boolean> = {
            media_type: "REELS",
            video_url: videoUrl,
        };
        if (caption) containerParams.caption = caption;
        if (options?.cover_url) containerParams.cover_url = options.cover_url;
        if (options?.location_id) containerParams.location_id = options.location_id;
        if (options?.share_to_feed !== undefined) containerParams.share_to_feed = options.share_to_feed;

        const container = await this.client.request<{ id: string }>({
            method: "POST",
            endpoint: `${this.accountId}/media`,
            params: containerParams,
            accessToken: graphConfig.accessToken,
        });

        if (!container.id) {
            throw new Error("Failed to create reel container");
        }

        // Wait for media to be ready
        await this.waitForMediaReady(container.id);

        // Step 3: Publish
        return this.publishMedia(container.id);
    }

    private async waitForMediaReady(containerId: string): Promise<void> {
        let attempts = 0;
        const maxAttempts = 15;

        while (attempts < maxAttempts) {
            try {
                const status = await this.client.request<{ status_code: string }>({
                    method: "GET",
                    endpoint: containerId,
                    params: { fields: "status_code" },
                    accessToken: graphConfig.accessToken,
                });

                if (status.status_code === "FINISHED") return;
                if (status.status_code === "ERROR") throw new Error("Media processing failed");

                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            } catch (e) {
                console.error("Error checking media status:", e);
                return;
            }
        }
    }

    async getComments(mediaId: string, limit: number = 25): Promise<Record<string, unknown>> {
        return this.client.request({
            method: "GET",
            endpoint: `${mediaId}/comments`,
            params: {
                fields: "id,timestamp,text,username,like_count,replies,user",
                limit,
            },
            accessToken: graphConfig.accessToken,
        });
    }

    async replyComment(commentId: string, message: string): Promise<Record<string, unknown>> {
        return this.client.request({
            method: "POST",
            endpoint: `${commentId}/replies`,
            params: { message },
            accessToken: graphConfig.accessToken,
        });
    }

    async deleteComment(commentId: string): Promise<Record<string, unknown>> {
        return this.client.request({
            method: "DELETE",
            endpoint: commentId,
            accessToken: graphConfig.accessToken,
        });
    }

    async getRecentMedia(limit = 25): Promise<InstagramMedia[]> {
        const response = await this.client.request<{ data: InstagramMedia[] }>({
            method: "GET",
            endpoint: `${this.accountId}/media`,
            params: {
                fields: "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
                limit,
            },
        });
        return response.data;
    }

    async getMediaInsights(mediaId: string): Promise<Record<string, unknown>> {
        // Metrics depend on media type. Requesting valid ones.
        const metrics = [
            "impressions",
            "reach",
            "engagement",
            "saved",
        ];
        // Note: Video metrics might perform differently.

        return this.client.request({
            method: "GET",
            endpoint: `${mediaId}/insights`,
            params: {
                metric: metrics.join(","),
            },
        });
    }
}
