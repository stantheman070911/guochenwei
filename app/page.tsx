// Landing / registration page — renders the RegisterForm for new users to sign up

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/register-form";
import { MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">郭寶</CardTitle>
          <CardDescription>
            你的 AI 問責夥伴。註冊後，在 LINE 上啟動。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <div className="mt-6 flex justify-center">
            <a
              href="https://lin.ee/3WNlqqk"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-green-600 transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-green-500 group-hover:text-green-600" />
              <span>點擊這裡成為郭寶朋友</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
