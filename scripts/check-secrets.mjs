// commit 前檢查暫存區，擋下看起來像金鑰的內容或不該上傳的檔案。
// 真的要略過（確定是誤判）：git commit --no-verify
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

const BLOCKED_FILES = [
  { pattern: /(^|\/)\.env(\..+)?$/, reason: "環境變數檔" },
  { pattern: /firebase-adminsdk.*\.json$|service-?account.*\.json$/i, reason: "Firebase 金鑰檔" },
];
const ALLOWED_FILES = [/(^|\/)\.env\.example$/];

const SECRET_PATTERNS = [
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----\s*\n?\s*[A-Za-z0-9+/]{20,}/, reason: "私鑰" },
  { pattern: /"type"\s*:\s*"service_account"[\s\S]*"private_key_id"\s*:\s*"[0-9a-f]{20,}"/, reason: "Firebase service account" },
  { pattern: /AIza[0-9A-Za-z_-]{35}/, reason: "Google / Gemini API key" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}/, reason: "GitHub token" },
  { pattern: /\bsk-[A-Za-z0-9_-]{20,}/, reason: "API secret key" },
  { pattern: /[A-Za-z0-9+/]{150,}={0,2}/, reason: "疑似 LINE channel access token（很長的 base64 字串）" },
  { pattern: /(SECRET|TOKEN|API_KEY|PASSWORD)\s*[=:]\s*["']?(?!your-|\.\.\.)[A-Za-z0-9+/_-]{16,}/, reason: "疑似寫死的金鑰值" },
];

const files = git("diff", "--cached", "--name-only", "--diff-filter=ACMR").split("\n").filter(Boolean);
const problems = [];

for (const file of files) {
  if (ALLOWED_FILES.some((p) => p.test(file))) continue;
  const blocked = BLOCKED_FILES.find(({ pattern }) => pattern.test(file));
  if (blocked) {
    problems.push(`${file}：${blocked.reason}，不應該 commit`);
    continue;
  }
  if (file.endsWith("package-lock.json")) continue;
  const content = git("show", `:${file}`);
  for (const { pattern, reason } of SECRET_PATTERNS) {
    if (pattern.test(content)) problems.push(`${file}：${reason}`);
  }
}

if (problems.length) {
  console.error("\n⛔ commit 已中止，發現疑似機密資訊：\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\n金鑰請放在 .env.local 或 Vercel 環境變數。確定是誤判才用 git commit --no-verify。\n");
  process.exit(1);
}
