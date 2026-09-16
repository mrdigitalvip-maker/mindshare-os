import type {
  PassportDailyMission,
  PassportLanguageTrack,
  PassportLesson,
  PassportLevel,
  PassportProfile,
  PassportVocabularyItem,
} from "@/lib/passport";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";
import {
  listPassportDailyMissions,
  listPassportDueVocabulary,
  listPassportLanguageTracks,
  listPassportLessons,
  listPassportProfiles,
} from "@/services/passport-service";

export type PassportHomeSnapshot = {
  tracks: PassportLanguageTrack[];
  profile: PassportProfile | null;
  lessons: PassportLesson[];
  dueVocabulary: PassportVocabularyItem[];
  missions: PassportDailyMission[];
  completedLessons: number;
  progressPercent: number;
  completedMissions: number;
};

const passportLevelRank: Record<PassportLevel, number> = {
  A0: 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

function lessonsFromCurrentLevel(lessons: PassportLesson[], level: PassportLevel) {
  const minimumRank = passportLevelRank[level];
  const planned = lessons.filter((lesson) => {
    const lessonRank = passportLevelRank[lesson.difficulty as PassportLevel];
    return lessonRank == null || lessonRank >= minimumRank;
  });
  return planned.length ? planned : lessons;
}

export async function loadPassportHomeSnapshot(
  userId: string,
  missionDate: string,
): Promise<PassportHomeSnapshot> {
  const uid = userId.trim();
  const date = missionDate.trim();
  if (!uid) throw workspaceMutationError(new Error("Authenticated user required."));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw workspaceMutationError(new Error("Mission date must use YYYY-MM-DD."));
  }

  const [tracks, profiles] = await Promise.all([
    listPassportLanguageTracks(),
    listPassportProfiles(uid),
  ]);

  const profile = profiles.find((item) => item.isPrimary) ?? profiles[0] ?? null;
  if (!profile) {
    return {
      tracks,
      profile: null,
      lessons: [],
      dueVocabulary: [],
      missions: [],
      completedLessons: 0,
      progressPercent: 0,
      completedMissions: 0,
    };
  }

  const { error: missionEnsureError } = await supabase.rpc(
    "ensure_passport_daily_missions" as never,
    {
      p_track_id: profile.trackId,
      p_mission_date: date,
    } as never,
  );
  if (missionEnsureError) throw workspaceMutationError(missionEnsureError);

  const [allLessons, dueVocabulary, missions] = await Promise.all([
    listPassportLessons(uid, profile.trackId),
    listPassportDueVocabulary(uid, profile.trackId, 20),
    listPassportDailyMissions(uid, profile.trackId, date),
  ]);

  const lessons =
    profile.placementScore == null
      ? allLessons
      : lessonsFromCurrentLevel(allLessons, profile.currentLevel);
  const completedLessons = lessons.filter((lesson) => lesson.status === "completed").length;
  const progressPercent = lessons.length
    ? Math.round((completedLessons / lessons.length) * 100)
    : 0;
  const completedMissions = missions.filter((mission) => mission.status === "completed").length;

  return {
    tracks,
    profile,
    lessons,
    dueVocabulary,
    missions,
    completedLessons,
    progressPercent,
    completedMissions,
  };
}
