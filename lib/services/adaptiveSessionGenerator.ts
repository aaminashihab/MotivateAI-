import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { UserProfile, SessionLog } from '@/lib/types/sessionLog';
import { analyzeUserBehavior } from './behaviorAnalyzer';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '');

export interface GeneratedTask {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  resources?: string; // e.g., topic to search for YouTube
}

export interface AdaptiveSessionPlan {
  sessionId?: string;
  goal: string;
  estimatedTotalTime: number;
  tasks: GeneratedTask[];
  suggestedBreakTiming: number;
  personalizationNotes: string;
}

/**
 * Helper to sanitize user goals against prompt injection
 */
function sanitizeGoalInput(input: string): string {
  if (typeof input !== 'string') return '';
  // 1. Truncate to maximum 100 characters to prevent massive payload injection
  let sanitized = input.slice(0, 100);

  // 2. Remove common adversarial phrases used in prompt injection attacks
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous\s+)?instructions/gi,
    /system\s+prompt/gi,
    /forget\s+(everything|all)/gi,
    /you\s+must\s+now/gi,
    /developer\s+mode/gi,
    /act\s+as\s+a/gi,
    /jailbreak/gi,
    /bypass\s+rules/gi
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.trim();
}

/**
 * Generate an adaptive session plan based on user behavior
 */
export async function generateAdaptiveSession(
  goal: string,
  userId: string,
  userSessions: SessionLog[],
  userPreferences?: any
): Promise<AdaptiveSessionPlan> {
  // Sanitize the goal input
  const sanitizedGoal = sanitizeGoalInput(goal);

  // Step 1: Analyze user behavior
  const userProfile = analyzeUserBehavior(userSessions);

  // Step 2: Build personalization hints
  const adaptationPrompt = buildAdaptationPrompt(userProfile);

  // Step 3: Call Gemini with enriched prompt
  const targetDuration = userPreferences?.maxSessionDuration || 60;
  const targetDifficulty = userPreferences?.difficultyLevel || 'intermediate';
  const minBreak = userPreferences?.minBreakDuration || 5;

  // Check for recent duplicate goals within 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const recentDuplicate = userSessions.find(
    (s) => s.goal?.toLowerCase() === sanitizedGoal.toLowerCase() && new Date(s.createdAt) > oneDayAgo
  );

  const duplicateContext = recentDuplicate 
    ? "\nCRITICAL: The user has already studied this topic recently. DO NOT include any 'Introduction', 'Setup', or 'Overview' tasks. Jump immediately into intermediate practice, advanced concepts, or building a project."
    : "";
  
  const systemPrompt = `You are an adaptive learning coach that personalizes task breakdowns based on user behavior.

${adaptationPrompt}

You must return a personalized, structured learning session based on the user's goal. You MUST adhere exactly to the JSON response schema.`;

  const userPrompt = `User's goal: "${sanitizedGoal}"${duplicateContext}

Please create a personalized ${targetDuration}-minute learning session that breaks down this goal into micro-tasks. The user's preferred difficulty level is ${targetDifficulty}.

IMPORTANT RULES:
1. The sum of all task durations PLUS the breaks between them must NOT exceed the target session duration of ${targetDuration} minutes. Every break MUST be at least ${minBreak} minutes long.
2. Include a "resources" field with the key topic to search for on YouTube.
3. Consider the user's preferences in task duration and difficulty.
4. Prioritize completion likelihood over perfectionism.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            goal: { type: SchemaType.STRING },
            estimatedTotalTime: { type: SchemaType.NUMBER },
            suggestedBreakTiming: { type: SchemaType.NUMBER },
            personalizationNotes: { type: SchemaType.STRING },
            tasks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  name: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  durationMinutes: { type: SchemaType.NUMBER },
                  difficulty: { type: SchemaType.STRING, enum: ['beginner', 'intermediate', 'advanced'] } as any,
                  resources: { type: SchemaType.STRING }
                },
                required: ['id', 'name', 'description', 'durationMinutes', 'difficulty', 'resources']
              }
            }
          },
          required: ['goal', 'estimatedTotalTime', 'suggestedBreakTiming', 'personalizationNotes', 'tasks']
        }
      }
    });

    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text() || '';

    const parsedPlan = JSON.parse(responseText.trim()) as AdaptiveSessionPlan;

    // Validate structure
    if (
      !parsedPlan.tasks ||
      !Array.isArray(parsedPlan.tasks) ||
      parsedPlan.tasks.length === 0
    ) {
      throw new Error('Invalid task structure from Gemini');
    }

    return parsedPlan;
  } catch (error) {
    console.error('Gemini adaptation error:', error);
    // Fall back to generic session
    return generateFallbackSession(sanitizedGoal || goal);
  }
}

/**
 * Build personalization hints based on user profile
 */
function buildAdaptationPrompt(userProfile: UserProfile): string {
  let prompt =
    'You are an adaptive learning coach that personalizes task breakdowns based on user behavior.\n\n';
  prompt += 'LEARNER PROFILE:\n';

  // Basic stats
  prompt += `- Typical task duration: ${userProfile.avgTaskDuration.toFixed(0)} minutes\n`;
  prompt += `- Overall completion rate: ${userProfile.overallCompletionRate.toFixed(0)}%\n`;
  prompt += `- Session consistency: ${userProfile.sessionConsistency}\n`;
  prompt += `- Engagement level: ${userProfile.signals.engagementLevel}\n`;

  // Adaptation hints
  prompt += '\nPERSONALIZATION HINTS:\n';

  if (userProfile.signals.prefersShortTasks) {
    prompt += `✓ User EXCELS at short bursts (avg ${userProfile.avgTaskDuration.toFixed(0)} min). Prefer many small tasks (10-15 min) over fewer long ones. This maximizes their completion rate.\n`;
  } else {
    prompt += `✓ User can handle medium-length tasks (${userProfile.avgTaskDuration.toFixed(0)} min avg). Balance between depth and manageability.\n`;
  }

  if (userProfile.signals.skipsBreaks) {
    prompt += `⚠ User frequently skips breaks (${userProfile.averageBreakSkipRate.toFixed(0)}%). Design shorter task sequences before fatigue sets in. Suggest break at ${userProfile.optimalBreakTiming} min (not 25+).\n`;
  } else {
    prompt += `✓ User respects breaks. Standard 25-minute task + break rhythm works well.\n`;
  }

  if (userProfile.signals.dropoutAfterMinutes) {
    prompt += `⚠ User has historically abandoned sessions after ~${userProfile.signals.dropoutAfterMinutes} minutes. Cap this session at ${Math.max(30, userProfile.signals.dropoutAfterMinutes - 10)} minutes to ensure completion.\n`;
  }

  if (userProfile.signals.highVariance) {
    prompt += `✓ User has variable energy/focus. Design flexible task lengths (some 10 min, some 20 min) so they can adjust based on mood.\n`;
  }

  // Engagement-based hints
  if (userProfile.signals.engagementLevel === 'high') {
    prompt += `✓ User is highly engaged. Can include challenging content and deeper dives. They WILL complete it.\n`;
  } else if (userProfile.signals.engagementLevel === 'low') {
    prompt += `✓ User needs momentum-building. Start with easy wins (10-min overview), then gradually increase difficulty. Keep early tasks simple to build confidence.\n`;
  }

  if (userProfile.signals.bestTimeOfDay) {
    prompt += `✓ User is most productive in the ${userProfile.signals.bestTimeOfDay}. If possible, suggest practicing during that time.\n`;
  }

  prompt += '\nDESIGN PRIORITIES (in order):\n';
  prompt += '1. Completion likelihood > perfect coverage\n';
  prompt += '2. User preferences > generic best practices\n';
  prompt += '3. Early wins > deep dives (build momentum first)\n';
  prompt += `4. Task duration ${getTaskDurationGuidance(userProfile)}\n`;

  return prompt;
}

/**
 * Get task duration guidance based on user profile
 */
function getTaskDurationGuidance(userProfile: UserProfile): string {
  if (userProfile.signals.prefersShortTasks) {
    return '10-15 minutes (user preference)';
  } else if (userProfile.signals.highVariance) {
    return 'Mix of 12, 18, and 20 minutes (variable focus)';
  } else {
    return '15-25 minutes (balanced)';
  }
}

/**
 * Fallback session if Gemini fails
 */
function generateFallbackSession(goal: string): AdaptiveSessionPlan {
  return {
    goal,
    estimatedTotalTime: 60,
    suggestedBreakTiming: 25,
    personalizationNotes:
      'Fallback session generated due to API limits. Try again in a few moments.',
    tasks: [
      {
        id: 'task_1',
        name: 'Introduction & Setup',
        description: `Get oriented with the fundamentals of ${goal}. Watch a beginner-friendly introduction.`,
        durationMinutes: 15,
        difficulty: 'beginner',
        resources: `${goal} for beginners`,
      },
      {
        id: 'task_2',
        name: 'Core Concepts',
        description: `Deep dive into the main concepts. Take notes on key ideas.`,
        durationMinutes: 20,
        difficulty: 'intermediate',
        resources: `${goal} core concepts explained`,
      },
      {
        id: 'task_3',
        name: 'Practice Activity',
        description: `Apply what you learned. Try a hands-on exercise or example.`,
        durationMinutes: 15,
        difficulty: 'beginner',
        resources: `${goal} hands-on tutorial`,
      },
      {
        id: 'task_4',
        name: 'Review & Reflect',
        description: `Summarize what you learned. Write down 3 key takeaways.`,
        durationMinutes: 10,
        difficulty: 'beginner',
        resources: `${goal} key concepts summary`,
      },
    ],
  };
}
