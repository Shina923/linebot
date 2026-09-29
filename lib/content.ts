import { readFileSync } from "node:fs";
import path from "node:path";

// 規則與提示語都放在 content/ 資料夾，修改內容不需要動程式碼
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
