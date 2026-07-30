import type {
  FeedbackCategory,
  SessionTask,
} from "@/lib/product/types";

export interface ScoutQuestion {
  id: string;
  prompt: string;
  options?: string[];
}

const QUESTIONS: Record<FeedbackCategory, ScoutQuestion[]> = {
  confusing: [
    {
      id: "unclear-part",
      prompt: "Which part was unclear?",
      options: [
        "What the product does",
        "What I should do next",
        "The options on this screen",
        "Something else",
      ],
    },
    { id: "intent", prompt: "What were you trying to do?" },
    { id: "expectation", prompt: "What did you expect it to mean?" },
    {
      id: "impact",
      prompt: "Did this stop you or only slow you down?",
      options: ["Stopped me", "Slowed me down", "Minor uncertainty"],
    },
  ],
  broken: [
    { id: "trigger", prompt: "What action triggered this?" },
    { id: "result", prompt: "What happened?" },
    { id: "expected", prompt: "What should have happened?" },
    {
      id: "recovery",
      prompt: "Can you continue?",
      options: ["Yes", "Only after retrying", "No"],
    },
  ],
  frustrating: [
    { id: "friction", prompt: "What made this harder than expected?" },
    {
      id: "delay",
      prompt: "How much did it slow you down?",
      options: ["A little", "Noticeably", "I could not continue"],
    },
    {
      id: "abandon",
      prompt: "Would this make you abandon the workflow?",
      options: ["Yes", "Maybe", "No"],
    },
  ],
  suggestion: [
    { id: "change", prompt: "What would you change?" },
    { id: "benefit", prompt: "Why would that be better?" },
    {
      id: "importance",
      prompt: "Is it essential or preferable?",
      options: ["Essential", "Preferable"],
    },
  ],
  "works-well": [
    { id: "worked", prompt: "What specifically worked?" },
    { id: "helped", prompt: "Why did it help?" },
    { id: "repeat", prompt: "Should more of the product behave this way?" },
  ],
  overall: [
    {
      id: "scope",
      prompt: "What does this observation apply to?",
      options: [
        "Current screen",
        "Current workflow",
        "Whole product",
        "Underlying concept",
      ],
    },
    { id: "observation", prompt: "What is your observation?" },
    { id: "matter", prompt: "Why does it matter?" },
  ],
};

export function nextScoutQuestion(
  category: FeedbackCategory,
  answers: Record<string, string>,
  task?: SessionTask,
): ScoutQuestion | null {
  const unanswered = QUESTIONS[category].find((question) => !answers[question.id]);
  if (unanswered) {
    return unanswered;
  }
  if (
    task?.title.includes("candidate") &&
    !answers["professional-basis"]
  ) {
    return {
      id: "professional-basis",
      prompt: "What is this judgement based on?",
      options: [
        "Direct professional experience",
        "Experience with similar products",
        "Technical inference",
        "General judgement",
        "Personal preference",
      ],
    };
  }
  return null;
}

export function buildScoutSummary(
  category: FeedbackCategory,
  originalText: string,
  answers: Record<string, string>,
): string {
  const context = Object.values(answers).filter(Boolean).slice(0, 3).join(". ");
  return `${category.replace("-", " ")}: ${originalText.trim()}${context ? ` Context: ${context}.` : ""}`;
}

export interface AIResearchAdapter {
  nextQuestion(
    category: FeedbackCategory,
    answers: Record<string, string>,
    task?: SessionTask,
  ): ScoutQuestion | null;
}

export const DemoResearchAdapter: AIResearchAdapter = {
  nextQuestion: nextScoutQuestion,
};

export const ProviderResearchAdapter: AIResearchAdapter = {
  nextQuestion: () => null,
};
