import type {
  PassportDailyMission,
  PassportLanguageTrack,
  PassportLesson,
  PassportProfile,
  PassportVocabularyItem,
} from "@/lib/passport";
import { workspaceMutationError } from "@/lib/mutation-errors";
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

  const [lessons, dueVocabulary, missions] = await Promise.all([
    listPassportLessons(uid, profile.trackId),
    listPassportDueVocabulary(uid, profile.trackId, 20),
    listPassportDailyMissions(uid, profile.trackId, date),
  ]);

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
