export const passportLevels = ["A0", "A1", "A2", "B1", "B2", "C1"] as const;
export type PassportLevel = (typeof passportLevels)[number];

export const passportGoals = ["travel", "work", "study", "conversation", "culture"] as const;
export type PassportGoal = (typeof passportGoals)[number];

export const passportRoleplayScenarios = [
  "airport",
  "hotel",
  "restaurant",
  "transport",
  "directions",
  "emergency",
  "shopping",
  "social",
  "custom",
] as const;
export type PassportRoleplayScenario = (typeof passportRoleplayScenarios)[number];

export const passportMissionTypes = ["culture", "listening", "vocabulary", "speaking", "travel"] as const;
export type PassportMissionType = (typeof passportMissionTypes)[number];

export type PassportLanguageTrack = {
  id: string;
  slug: string;
  title: string;
  description: string;
};

export type PassportProfile = {
  id: string;
  userId: string;
  trackId: string;
  nativeLocale: string | null;
  goal: PassportGoal;
  travelDate: string | null;
  dailyMinutes: number;
  currentLevel: PassportLevel;
  placementScore: number | null;
  planHorizonDays: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PassportLesson = {
  id: string;
  trackId: string;
  slug: string;
  title: string;
  description: string;
  content: Record<string, unknown>;
  lessonType: string;
  difficulty: string;
  orderIndex: number;
  estimatedMinutes: number;
  premium: boolean;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  xp: number;
  completedAt: string | null;
};

export type PassportPlacementQuestion = {
  key: string;
  prompt: string;
  options: string[];
  difficulty: PassportLevel;
  orderIndex: number;
};

export type PassportVocabularyStage = "new" | "learning" | "review" | "mastered";

export type PassportVocabularyItem = {
  id: string;
  trackId: string;
  sourceLessonId: string | null;
  term: string;
  translation: string;
  context: string;
  stage: PassportVocabularyStage;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
};

export type PassportReviewResult = {
  id: string;
  grade: number;
  stage: PassportVocabularyStage;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
};

export type PassportPlacementResult = {
  score: number;
  level: PassportLevel;
};

export type PassportDailyMission = {
  id: string;
  trackId: string;
  missionDate: string;
  missionKey: string;
  missionType: PassportMissionType;
  title: string;
  prompt: string;
  status: "pending" | "completed" | "skipped";
  metadata: Record<string, unknown>;
  completedAt: string | null;
};

export type PassportRoleplaySession = {
  id: string;
  trackId: string;
  scenario: PassportRoleplayScenario;
  mode: "text" | "voice";
  status: "active" | "completed" | "abandoned";
  transcript: unknown[];
  feedback: Record<string, unknown>;
  score: number | null;
  startedAt: string;
  completedAt: string | null;
};
