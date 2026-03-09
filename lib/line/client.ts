// Initializes and exports the LINE Messaging API client using channel credentials from env

import { messagingApi } from "@line/bot-sdk";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!channelAccessToken) {
  throw new Error(
    "Missing environment variable: LINE_CHANNEL_ACCESS_TOKEN must be set before starting the server."
  );
}

export const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken,
});
