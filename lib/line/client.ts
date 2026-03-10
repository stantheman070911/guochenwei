// Lazy-initialized LINE Messaging API client singleton — deferred to avoid build-time throws

import { messagingApi } from "@line/bot-sdk";

let _lineClient: messagingApi.MessagingApiClient | null = null;

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!_lineClient) {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
      throw new Error(
        "Missing environment variable: LINE_CHANNEL_ACCESS_TOKEN must be set before starting the server."
      );
    }
    _lineClient = new messagingApi.MessagingApiClient({ channelAccessToken });
  }
  return _lineClient;
}
