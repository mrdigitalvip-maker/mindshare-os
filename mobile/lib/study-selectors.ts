import type {
  StudyGoal,
  StudySession,
  Subject,
  SubjectWorkspace,
} from "@/services/workspace-service";

const validDate = (value: string | null | undefined) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
};
export const uniqueSubjects = (subjects: Subject[]) => [
  ...new Map(subjects.map((subject) => [subject.id, subject])).values(),
];
export const completedSessions = (sessions: StudySession[]) =>
  sessions.filter((session) => session.status === "completed" && session.duration > 0);
export const getSubjectStudyMinutes = (sessions: StudySession[]) =>
  completedSessions(sessions).reduce((sum, session) => sum + session.duration, 0);
const startOfDay = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());
export const startOfStudyWeek = (now: Date) => {
  const start = startOfDay(now);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
};
const minutesSince = (sessions: StudySession[], since: Date, now: Date) =>
  completedSessions(sessions).reduce((sum, session) => {
    const date = validDate(session.endedAt ?? session.createdAt);
    return date && date >= since && date <= now ? sum + session.duration : sum;
  }, 0);
export const getTodayStudyMinutes = (sessions: StudySession[], now = new Date()) =>
  minutesSince(sessions, startOfDay(now), now);
export const getWeeklyStudyMinutes = (sessions: StudySession[], now = new Date()) =>
  minutesSince(sessions, startOfStudyWeek(now), now);
export const getSubjectLastSession = (sessions: StudySession[]) =>
  completedSessions(sessions).sort((a, b) =>
    (b.endedAt ?? b.createdAt).localeCompare(a.endedAt ?? a.createdAt),
  )[0] ?? null;
export const getSubjectActiveGoal = (goals: StudyGoal[]) =>
  goals.find((goal) => !goal.completed) ?? null;
export const reconstructElapsedSeconds = (session: StudySession, now = new Date()) => {
  const started = validDate(session.startedAt);
  if (!started || session.status !== "active") return Math.max(0, session.duration * 60);
  return Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000));
};
export const selectStudyFocus = (workspaces: SubjectWorkspace[]) => {
  const candidates = [
    ...new Map(
      workspaces.filter(({ subject }) => subject.status === "active").map((w) => [w.subject.id, w]),
    ).values(),
  ];
  return (
    candidates.sort((a, b) => {
      const activeA = a.sessions.some((s) => s.status === "active") ? 1 : 0;
      const activeB = b.sessions.some((s) => s.status === "active") ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      const actionA = a.subject.nextAction ? 1 : 0,
        actionB = b.subject.nextAction ? 1 : 0;
      if (actionA !== actionB) return actionB - actionA;
      const goalA = getSubjectActiveGoal(a.goals) ? 1 : 0,
        goalB = getSubjectActiveGoal(b.goals) ? 1 : 0;
      if (goalA !== goalB) return goalB - goalA;
      return (
        (getSubjectLastSession(a.sessions)?.createdAt ?? "").localeCompare(
          getSubjectLastSession(b.sessions)?.createdAt ?? "",
        ) || a.subject.name.localeCompare(b.subject.name)
      );
    })[0] ?? null
  );
};
export const getStudyProgress = (workspace: SubjectWorkspace, now = new Date()) => ({
  todayMinutes: getTodayStudyMinutes(workspace.sessions, now),
  weeklyMinutes: getWeeklyStudyMinutes(workspace.sessions, now),
  weeklyTargetMinutes: workspace.subject.weeklyTargetMinutes,
  sessions: completedSessions(workspace.sessions).filter(
    (s) => (validDate(s.endedAt ?? s.createdAt)?.getTime() ?? 0) >= startOfStudyWeek(now).getTime(),
  ).length,
  completedGoals: workspace.goals.filter((goal) => goal.completed).length,
});
