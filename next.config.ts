import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin 用到 Node 原生模組，不要讓 Next 打包它
  serverExternalPackages: ["firebase-admin"],
  // 確保部署到 Vercel 時，webhook 函式有帶上規則檔
  outputFileTracingIncludes: {
    "/api/line/webhook": ["./content/**/*"],
  },
};

export default nextConfig;
