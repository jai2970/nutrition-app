import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayRange, isProfileComplete } from "@/lib/nutrition";
import { calculateTargets, getTodaysConsumedMacros } from "@/lib/daily-summary";
import { retrieveRelevantChunks, answerDietQuestion } from "@/lib/rag";

const DAILY_QUESTION_LIMIT = 10;
const MAX_QUESTION_LENGTH = 500;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json({ error: "That question is too long." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !isProfileComplete(user)) {
    return Response.json({ error: "Complete your profile first." }, { status: 400 });
  }

  const { start, end } = getTodayRange();
  const questionsToday = await prisma.advisorQuery.count({
    where: { userId: user.id, createdAt: { gte: start, lt: end } },
  });
  if (questionsToday >= DAILY_QUESTION_LIMIT) {
    return Response.json(
      { error: `You've reached today's limit of ${DAILY_QUESTION_LIMIT} questions. Try again tomorrow.` },
      { status: 429 },
    );
  }

  const { calorieGoal, macroTargets } = calculateTargets(user);
  const { consumed } = await getTodaysConsumedMacros(user.id);

  let result;
  try {
    const relevantChunks = await retrieveRelevantChunks(question);
    result = await answerDietQuestion({
      question,
      goal: user.goal,
      dietType: user.dietType,
      calorieGoal,
      proteinTargetG: macroTargets.proteinG,
      carbsTargetG: macroTargets.carbsG,
      fatTargetG: macroTargets.fatG,
      todaysCalories: consumed.calories,
      todaysProteinG: consumed.protein,
      todaysCarbsG: consumed.carbs,
      todaysFatG: consumed.fat,
      relevantChunks,
    });
  } catch (err) {
    console.error("Diet advisor RAG pipeline failed:", err);
    return Response.json(
      { error: "Couldn't reach the advisor right now. Please try again." },
      { status: 502 },
    );
  }

  await prisma.advisorQuery.create({ data: { userId: user.id, question } });

  return Response.json({ answer: result.answer, sources: result.sources });
}
