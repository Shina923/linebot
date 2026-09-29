import { readFileSync } from "node:fs";
import path from "node:path";

// 規則、提示語與設定都放在 content/ 資料夾，修改內容不需要動程式碼
function readContent(file: string) {
  return readFileSync(path.join(process.cwd(), "content", file), "utf8");
}

// 依「## 標題」把 prompt.md 切成各段，並去掉 HTML 註解
function parseSections(markdown: string) {
  const sections = new Map<string, string>();
  const text = markdown.replace(/<!--[\s\S]*?-->/g, "");
  for (const part of text.split(/^## /m).slice(1)) {
    const newline = part.indexOf("\n");
    const title = part.slice(0, newline).trim();
    sections.set(title, part.slice(newline + 1).trim());
  }
  return sections;
}

const sections = parseSections(readContent("prompt.md"));

function section(title: string) {
  const value = sections.get(title);
  if (!value) throw new Error(`content/prompt.md 缺少「## ${title}」段落或內容是空的`);
  return value;
}

export const RULES = readContent("rules.md").trim();

export const PROMPTS = {
  system: section("系統提示語").replaceAll("{{rules}}", RULES),
  emptyReply: section("無法回答時的回覆"),
  errorReply: section("發生錯誤時的回覆"),
};

// 讀取 settings.json 並檢查每個值；有錯時直接報錯，讓部署失敗而不是上線後才出問題
function loadSettings() {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readContent("settings.json"));
  } catch (err) {
    throw new Error(`content/settings.json 格式錯誤（JSON 語法）：${err instanceof Error ? err.message : err}`);
  }

  const { model, temperature, replyOnlyWhenMentionedInGroup } = raw;
  if (typeof model !== "string" || !model.trim()) {
    throw new Error("content/settings.json 的 model 必須是模型名稱字串，例如 \"gemini-2.5-flash\"");
  }
  if (typeof temperature !== "number" || temperature < 0 || temperature > 2) {
    throw new Error("content/settings.json 的 temperature 必須是 0 到 2 之間的數字（不要加引號）");
  }
  if (typeof replyOnlyWhenMentionedInGroup !== "boolean") {
    throw new Error("content/settings.json 的 replyOnlyWhenMentionedInGroup 必須是 true 或 false（不要加引號）");
  }
  return { model: model.trim(), temperature, replyOnlyWhenMentionedInGroup };
}

export const SETTINGS = loadSettings();
