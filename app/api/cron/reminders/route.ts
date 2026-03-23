import { NextResponse } from "next/server";
import { UserStatus, ConversationRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAnthropic } from "@/lib/claude/client";
import { buildSystemPrompt } from "@/lib/claude/system-prompt";
import { CLAUDE_MODEL, MAX_TOKENS } from "@/constants/claude";
import { getRecentMessages, saveMessage } from "@/lib/db/conversation";
import { sendLineMessage } from "@/lib/line/reply";

export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Standard Vercel Cron verification
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error("[cron/reminders] Unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Fetch all ACTIVE users who have at least one ACTIVE goal
        const users = await prisma.user.findMany({
            where: {
                status: UserStatus.ACTIVE,
                line_user_id: { not: null },
                goals: {
                    some: { status: "ACTIVE" }
                }
            },
            include: {
                goals: {
                    where: { status: "ACTIVE" },
                    orderBy: { created_at: "asc" }
                }
            }
        });

        console.log(`[cron/reminders] Found ${users.length} active users with goals.`);

        const reminderPromises = users.map(async (user) => {
            // 2. Build personalized system prompt
            const baseSystemPrompt = buildSystemPrompt(user.goals);
            const promptAddon = `\n\n【排程提醒模式】\n你現在是主動發起對話，用戶沒有傳訊息給你。根據他的目標噴他一句，問他進度。不要打招呼，直接開嗆。一句話，30字以內。`;
            const finalSystemPrompt = baseSystemPrompt + promptAddon;

            try {
                // 3. Fetch recent conversation history for personalized reminders
                const recentMessages = await getRecentMessages(user.id);
                const historyMessages = recentMessages.map((msg) => ({
                    role: msg.role === "USER" ? ("user" as const) : ("assistant" as const),
                    content: msg.content,
                }));

                // 4. Call Claude with history + a system trigger message
                const response = await getAnthropic().messages.create({
                    model: CLAUDE_MODEL,
                    max_tokens: MAX_TOKENS,
                    system: finalSystemPrompt,
                    messages: [
                        ...historyMessages,
                        { role: "user", content: "（系統通知：這是排程推播時間。請主動發送督促提醒告訴我該做什麼了。）" }
                    ]
                });

                const block = response.content[0];
                let pushText = "幹你的目標呢";
                if (block && block.type === "text") {
                    pushText = block.text;
                }

                // 5. Send via LINE Push API
                if (user.line_user_id) {
                    await sendLineMessage(user.line_user_id, pushText); // NO replyToken, forces fallback to Push API
                    console.log(`[cron/reminders] Sent push to user ${user.id}`);

                    // 6. Save the assistant message to the DB so the user can interact cleanly
                    await saveMessage({
                        userId: user.id,
                        role: ConversationRole.ASSISTANT,
                        content: pushText,
                    });
                }

            } catch (err) {
                console.error(`[cron/reminders] Failed processing user ${user.id}:`, err);
            }
        });

        await Promise.allSettled(reminderPromises);

        return NextResponse.json({ success: true, count: users.length });

    } catch (err) {
        console.error("[cron/reminders] Critical cron failure:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
