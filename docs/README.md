# MetaMCP Instagram

A Model Context Protocol (MCP) server for the Instagram Graph API.

## Installation

```bash
npm install @meta-mcp/instagram
# or
pnpm add @meta-mcp/instagram
```

## Configuration

This package requires the following environment variables:

- `IG_ACCESS_TOKEN`: User Access Token for Instagram Graph API.
- `IG_USER_ID`: The Instagram Business Agent User ID.

## Usage

```typescript
import { InstagramManager, createToolRegistry } from "@meta-mcp/instagram";

const manager = InstagramManager.fromEnv();
const registry = createToolRegistry(manager);
```

## Available Tools

### Content
- **ig_post_photo**: Publish a photo to the Instagram Feed.
  - Inputs: `image_url`, `caption`, `user_tags` (optional), `location_id` (optional).

### Retrieval
- **ig_get_recent_media**: Fetch recent media objects (photos, videos, carousels) from the account.
  - Inputs: `limit` (max 50, default 25).

### Insights
- **ig_get_media_insights**: Retrieve metrics for a specific media object.
  - Inputs: `media_id`.
