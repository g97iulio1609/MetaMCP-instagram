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

    // TODO: Add postVideo if needed (requires video upgrade)

    async publishMedia(creationId: string): Promise<Record<string, unknown>> {
        return this.client.request({
            method: "POST",
            endpoint: `${this.accountId}/media_publish`,
            params: { creation_id: creationId },
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
