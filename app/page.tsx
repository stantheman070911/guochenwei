// Landing / registration page — renders the RegisterForm for new users to sign up

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/register-form";

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
        </CardContent>
      </Card>
    </main>
  );
}
