import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendLineMessage } from "@/lib/line/reply";
import { getAnthropic } from "@/lib/claude/client";
import { buildSystemPrompt } from "@/lib/claude/system-prompt";
import { CLAUDE_MODEL, MAX_TOKENS } from "@/constants/claude";
import { getRecentMessages, saveMessage } from "@/lib/db/conversation";
import { ConversationRole } from "@prisma/client";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, goalId } = body;

        if (!userId || !goalId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch user and the specific goal
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                goals: {
                    where: { id: goalId, status: "ACTIVE" }
                }
            }
        });

        if (!user || !user.line_user_id) {
            console.warn(`[push-reminder] User not found or no LINE ID. UserID: ${userId}`);
            return NextResponse.json({ error: "User or LINE ID not found" }, { status: 404 });
        }

        if (!user.goals || user.goals.length === 0) {
            console.warn(`[push-reminder] Goal not found or inactive. GoalID: ${goalId}`);
            return NextResponse.json({ error: "Goal not found or inactive" }, { status: 404 });
        }

        const targetGoal = user.goals[0];

        // 2. Build personalized system prompt just for this targeted reminder
        const baseSystemPrompt = buildSystemPrompt(user.goals);
        const promptAddon = `\n\n【指定目標提醒模式】\n這是一個由你稍早設定的精確排程提醒。用戶針對目標（${targetGoal.title}）設定的提醒時間已到。立刻給出嚴厲且簡短的提醒，要求他現在就處理這個目標。不要廢話。150字以內。`;
        const finalSystemPrompt = baseSystemPrompt + promptAddon;

        // 3. Fetch recent conversation history
        const recentMessages = await getRecentMessages(user.id);
        const historyMessages = recentMessages.map((msg) => ({
            role: msg.role === "USER" ? ("user" as const) : ("assistant" as const),
            content: msg.content,
        }));

        // 4. Call Claude
        const response = await getAnthropic().messages.create({
            model: CLAUDE_MODEL,
            max_tokens: MAX_TOKENS,
            system: finalSystemPrompt,
            messages: [
                ...historyMessages,
                { role: "user", content: `（系統通知：目標「${targetGoal.title}」的提醒時間已到。請立馬噴我，叫我去執行。）` }
            ]
        });

        const block = response.content[0];
        let pushText = `喂，目標「${targetGoal.title}」的時間到了，別給我裝死。`;
        if (block && block.type === "text") {
            pushText = block.text;
        }

        // 5. Send via LINE Push API
        await sendLineMessage(user.line_user_id, pushText);
        console.log(`[push-reminder] Sent precise push to user ${user.id} for goal ${goalId}`);

        // 6. Save the assistant message
        await saveMessage({
            userId: user.id,
            role: ConversationRole.ASSISTANT,
            content: pushText,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[push-reminder] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
