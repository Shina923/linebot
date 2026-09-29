import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function db() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
  }
  return getFirestore();
}

export type ChatLog = {
  user_id: string;
  group_id: string | null;
  room_id: string | null;
  query: string;
  ai_response: string;
};

// 沿用 dify-firestore 的 chatbot collection 與欄位，另外多存 group_id / room_id
export async function saveChatLog(log: ChatLog) {
  await db()
    .collection("chatbot")
    .add({ ...log, created_at: FieldValue.serverTimestamp() });
}
