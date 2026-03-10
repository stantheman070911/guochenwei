// Displays the activation code in a copyable box with LINE bot deep-link instructions

"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Code box */}
      <div className="flex items-center justify-between rounded-lg border bg-muted p-4">
        <span className="font-mono text-2xl font-bold tracking-widest">
          {code}
        </span>
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          {copied ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <Copy className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Instructions */}
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">下一步：</p>
        <ol className="list-inside list-decimal space-y-2">
          <li>加入我們的 LINE 官方帳號</li>
          <li>在 LINE 聊天中傳送上面的啟動碼</li>
          <li>等待 AI 回覆確認啟動成功</li>
        </ol>
      </div>

      {/* Email reminder */}
      <p className="text-xs text-muted-foreground">
        啟動碼也已寄到你的 email，24 小時內有效。
      </p>
    </div>
  );
}
