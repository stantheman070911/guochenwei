// Post-registration page — displays the generated activation code and LINE bot instructions

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeDisplay } from "@/components/code-display";

interface ActivatePageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { code } = await searchParams;

  if (!code) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>找不到啟動碼</CardTitle>
            <CardDescription>
              請先完成註冊以取得啟動碼。
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>你的啟動碼</CardTitle>
          <CardDescription>
            複製下方啟動碼，在 LINE 上傳給郭寶。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeDisplay code={code} />
        </CardContent>
      </Card>
    </main>
  );
}
