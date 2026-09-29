import { validateSignature, webhook } from "@line/bot-sdk";
import { after } from "next/server";
import { PROMPTS, SETTINGS } from "@/lib/content";
import { askGemini } from "@/lib/gemini";
import { saveChatLog } from "@/lib/firestore";
import { lineClient, toLineText } from "@/lib/line";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { events } = JSON.parse(body) as webhook.CallbackRequest;

  // 先回 200 給 LINE，實際處理放到回應送出之後
  after(() => Promise.all(events.map(handleEvent)));

  return Response.json({ ok: true });
}

async function handleEvent(event: webhook.Event) {
  if (event.type !== "message" || event.message.type !== "text" || !event.replyToken) return;

  const message = event.message as webhook.TextMessageContent;
  const source = event.source;
  const inGroup = source?.type === "group" || source?.type === "room";

  let query = message.text;
  if (inGroup) {
    const mentionees = message.mention?.mentionees ?? [];
    const botMention = mentionees.find((m) => m.type === "user" && m.isSelf);
    if (SETTINGS.replyOnlyWhenMentionedInGroup && !botMention) return;
    // 把「@機器人」那段文字拿掉，只留問題本身
    if (botMention) {
      query = (query.slice(0, botMention.index) + query.slice(botMention.index + botMention.length)).trim();
    }
  }
  if (!query) return;

  const userId = source?.userId ?? "";
  const groupId = source?.type === "group" ? source.groupId : null;
  const roomId = source?.type === "room" ? source.roomId : null;

  // 一對一聊天時顯示「輸入中」動畫（群組不支援）
  if (source?.type === "user" && userId) {
    await lineClient().showLoadingAnimation({ chatId: userId, loadingSeconds: 20 }).catch(() => {});
  }

  let answer: string | null = null;
  try {
    answer = await askGemini(query);
  } catch (err) {
    console.error("Gemini error:", err instanceof Error ? err.message : err);
  }

  try {
    await lineClient().replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: "text", text: toLineText(answer ?? PROMPTS.errorReply) }],
    });
  } catch (err) {
    console.error("LINE reply error:", err instanceof Error ? err.message : err);
  }

  if (answer) {
    await saveChatLog({ user_id: userId, group_id: groupId, room_id: roomId, query, ai_response: answer }).catch(
      (err) => console.error("Firestore error:", err instanceof Error ? err.message : err),
    );
  }
}
