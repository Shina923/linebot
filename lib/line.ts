import { messagingApi } from "@line/bot-sdk";

let client: messagingApi.MessagingApiClient | undefined;

export function lineClient() {
  return (client ??= new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  }));
}

// LINE 單則文字訊息上限 5000 字
export function toLineText(text: string) {
  return text.length > 5000 ? text.slice(0, 4999) + "…" : text;
}
