// Dashboard overview page — shows user status and active goals

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      goals: {
        where: { status: "ACTIVE" },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!user) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      {/* User info */}
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">狀態：</span>
            {user.status === "ACTIVE" ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                已啟動
              </span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                等待啟動
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">進行中的目標</CardTitle>
          <CardDescription>
            在 LINE 聊天中告訴郭陳維你的目標，他會幫你追蹤。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              還沒有目標。在 LINE 上跟郭陳維說說你想做什麼。
            </p>
          ) : (
            <ul className="space-y-3">
              {user.goals.map((goal) => (
                <li
                  key={goal.id}
                  className="rounded-md border p-3"
                >
                  <p className="font-medium">{goal.title}</p>
                  {goal.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {goal.description}
                    </p>
                  )}
                  {goal.due_date && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      截止：{goal.due_date.toLocaleDateString("zh-TW")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
