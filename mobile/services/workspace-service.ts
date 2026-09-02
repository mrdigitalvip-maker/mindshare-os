import { supabase } from "@/lib/supabase";
import { WorkspaceMutationError, workspaceMutationError } from "@/lib/mutation-errors";
import { normalizeSessionInput, normalizeSubjectInput } from "@/lib/study-input";

export type Project = {
  id: string;
  title: string;
  description: string;
  objective?: string;
  status: string;
  dueDate?: string | null;
  updatedAt?: string | null;
};
export type ProjectWorkspace = {
  project: Project;
  tasks: Task[];
  checkIns: ProjectCheckIn[];
  tasksUnavailable: boolean;
  checkInsUnavailable: boolean;
};
export type ProjectCheckInState = "progressed" | "unchanged" | "blocked" | "reorganize";
export type ProjectCheckIn = {
  id: string;
  projectId: string;
  state: ProjectCheckInState;
  note: string;
  createdAt: string;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  completed: boolean;
  updatedAt?: string | null;
  executionStatus?: "not_started" | "in_progress" | "blocked" | "completed";
  nextAction?: string | null;
  blockerNote?: string | null;
  startedAt?: string | null;
  lastProgressAt?: string | null;
  reminderAt?: string | null;
};
export type Subject = {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed";
  color: string;
  objective?: string;
  weeklyTargetMinutes?: number | null;
  nextAction?: string;
};
export type StudyGoal = {
  id: string;
  title: string;
  completed: boolean;
  currentValue: number;
  targetValue: number;
};
export type StudySession = {
  id: string;
  activity: string;
  duration: number;
  createdAt: string;
  status: "active" | "completed" | "cancelled";
  plannedMinutes: number | null;
  startedAt: string | null;
  endedAt: string | null;
  reflection: "understood" | "review" | "difficult" | null;
};
export type StudyNote = { id: string; title: string; content: string; updatedAt: string };
export type SubjectWorkspace = {
  subject: Subject;
  goals: StudyGoal[];
  sessions: StudySession[];
  notes: StudyNote[];
};

const required = (value: string, label: string) => {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
};
const owner = (userId: string) => required(userId, "User ID");
const resource = (id: string) => required(id, "Resource ID");
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const normalizeDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim();
  const parsed = new Date(`${normalized}T12:00:00Z`);
  if (
    !DATE.test(normalized) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  )
    throw new WorkspaceMutationError("Escolha uma data válida.", "invalid-date", value);
  return normalized;
};
export const normalizeProjectInput = (input: {
  title: string;
  objective?: string;
  description?: string;
  dueDate?: string | null;
}) => {
  const title = input.title.trim();
  if (!title)
    throw new WorkspaceMutationError("Informe o nome do projeto.", "invalid-input", input.title);
  if (title.length > 120)
    throw new WorkspaceMutationError(
      "O nome do projeto deve ter até 120 caracteres.",
      "invalid-input",
      input.title,
    );
  const objective = input.objective?.trim() || null;
  const description = input.description?.trim() || null;
  if ((objective?.length ?? 0) > 1000 || (description?.length ?? 0) > 1000)
    throw new WorkspaceMutationError(
      "O objetivo e a descrição devem ter até 1000 caracteres.",
      "invalid-input",
      input,
    );
  return { title, objective, description, dueDate: normalizeDate(input.dueDate) };
};
const projectFrom = (row: Record<string, unknown>): Project => ({
  id: String(row.id),
  title: String(row.title ?? "Projeto sem título"),
  description: String(row.description ?? ""),
  objective: String(row.objective ?? ""),
  status: typeof row.status === "string" ? row.status : "active",
  dueDate: typeof row.due_date === "string" ? row.due_date : null,
  updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
});
const normalizeTaskTitle = (value: string) => {
  const title = value.trim();
  if (!title)
    throw new WorkspaceMutationError("Informe o título da tarefa.", "invalid-input", value);
  if (title.length > 160)
    throw new WorkspaceMutationError(
      "O título da tarefa deve ter até 160 caracteres.",
      "invalid-input",
      value,
    );
  return title;
};
const taskFrom = (row: Record<string, unknown>): Task => ({
  id: String(row.id),
  title: String(row.title ?? "Tarefa sem título"),
  description: String(row.description ?? ""),
  priority: String(row.priority ?? "medium"),
  dueDate: typeof row.due_date === "string" ? row.due_date : null,
  projectId: typeof row.project_id === "string" ? row.project_id : null,
  completed: row.completed === true,
  updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  executionStatus:
    row.completed === true
      ? "completed"
      : ["not_started", "in_progress", "blocked"].includes(String(row.execution_status))
        ? (row.execution_status as Task["executionStatus"])
        : "not_started",
  nextAction: typeof row.next_action === "string" ? row.next_action : null,
  blockerNote: typeof row.blocker_note === "string" ? row.blocker_note : null,
  startedAt: typeof row.started_at === "string" ? row.started_at : null,
  lastProgressAt: typeof row.last_progress_at === "string" ? row.last_progress_at : null,
  reminderAt: typeof row.reminder_at === "string" ? row.reminder_at : null,
});

export async function listProjects(userId: string): Promise<Project[]> {
  const id = owner(userId);
  const { data, error } = await supabase
    .from("projects")
    .select("id,title,description,objective,status,due_date,updated_at")
    .eq("user_id", id)
    .order("updated_at", { ascending: false });
  if (error) throw workspaceMutationError(error);
  return (data ?? []).map(projectFrom);
}
export async function createProject(
  userId: string,
  input: { title: string; objective?: string; description?: string; dueDate?: string | null },
): Promise<string> {
  const normalized = normalizeProjectInput(input);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: owner(userId),
      title: normalized.title,
      objective: normalized.objective,
      description: normalized.description,
      due_date: normalized.dueDate,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw workspaceMutationError(error);
  return data.id;
}
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", resource(projectId))
    .eq("user_id", owner(userId))
    .select("id")
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!data) throw new Error("Project not found.");
}
export async function updateProject(
  userId: string,
  projectId: string,
  patch: {
    title?: string;
    objective?: string;
    description?: string;
    status?: "active" | "completed";
    dueDate?: string | null;
  },
): Promise<void> {
  if (patch.status !== undefined && !["active", "completed"].includes(patch.status))
    throw new WorkspaceMutationError("Status de projeto inválido.", "invalid-input", patch.status);
  if (
    (patch.objective?.trim().length ?? 0) > 1000 ||
    (patch.description?.trim().length ?? 0) > 1000
  )
    throw new WorkspaceMutationError(
      "O objetivo e a descrição devem ter até 1000 caracteres.",
      "invalid-input",
      patch,
    );
  const normalized =
    patch.title !== undefined
      ? normalizeProjectInput({
          title: patch.title,
          objective: patch.objective,
          description: patch.description,
          dueDate: patch.dueDate,
        })
      : null;
  const update = {
    ...(patch.description !== undefined ? { description: patch.description.trim() || null } : {}),
    ...(patch.objective !== undefined ? { objective: patch.objective.trim() || null } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.dueDate !== undefined
      ? { due_date: normalized?.dueDate ?? normalizeDate(patch.dueDate) }
      : {}),
    ...(patch.title !== undefined ? { title: normalized!.title } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", resource(projectId))
    .eq("user_id", owner(userId))
    .select("id")
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!data) throw new Error("Project not found.");
}
export async function getProject(
  userId: string,
  projectId: string,
): Promise<ProjectWorkspace | null> {
  const id = resource(projectId),
    user = owner(userId);
  const { data, error } = await supabase
    .from("projects")
    .select("id,title,description,objective,status,due_date,updated_at")
    .eq("id", id)
    .eq("user_id", user)
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!data) return null;
  const [tasksResult, checkInsResult] = await Promise.allSettled([
    listTasks(userId, id),
    listProjectCheckIns(userId, id),
  ]);
  return {
    project: projectFrom(data),
    tasks: tasksResult.status === "fulfilled" ? tasksResult.value : [],
    checkIns: checkInsResult.status === "fulfilled" ? checkInsResult.value : [],
    tasksUnavailable: tasksResult.status === "rejected",
    checkInsUnavailable: checkInsResult.status === "rejected",
  };
}

export async function listProjectCheckIns(
  userId: string,
  projectId: string,
): Promise<ProjectCheckIn[]> {
  const { data, error } = await supabase
    .from("project_check_ins")
    .select("id,project_id,state,note,created_at")
    .eq("user_id", owner(userId))
    .eq("project_id", resource(projectId))
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    state: row.state as ProjectCheckInState,
    note: row.note ?? "",
    createdAt: row.created_at,
  }));
}

export async function createProjectCheckIn(
  userId: string,
  projectId: string,
  input: { state: ProjectCheckInState; note?: string },
): Promise<string> {
  const note = input.note?.trim() || null;
  if ((note?.length ?? 0) > 1000)
    throw new WorkspaceMutationError(
      "A nota deve ter até 1000 caracteres.",
      "invalid-input",
      input.note,
    );
  const { data, error } = await supabase
    .from("project_check_ins")
    .insert({
      user_id: owner(userId),
      project_id: resource(projectId),
      state: input.state,
      note,
    })
    .select("id")
    .single();
  if (error) throw workspaceMutationError(error);
  return data.id;
}

export async function listTasks(userId: string, projectId?: string): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select(
      "id,title,description,priority,due_date,project_id,completed,updated_at,execution_status,next_action,blocker_note,started_at,last_progress_at,reminder_at",
    )
    .eq("user_id", owner(userId))
    .order("updated_at", { ascending: false });
  if (projectId) query = query.eq("project_id", resource(projectId));
  const { data, error } = await query;
  if (error) throw workspaceMutationError(error);
  return (data ?? []).map(taskFrom);
}
export async function createTask(
  userId: string,
  input: {
    title: string;
    description?: string;
    projectId?: string | null;
    priority?: string;
    dueDate?: string | null;
    nextAction?: string | null;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: owner(userId),
      title: normalizeTaskTitle(input.title),
      description: input.description?.trim() || null,
      project_id: input.projectId ? resource(input.projectId) : null,
      priority: input.priority ?? "medium",
      due_date: normalizeDate(input.dueDate),
      completed: false,
      next_action: input.nextAction?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw workspaceMutationError(error);
  return data.id;
}
export async function updateTask(
  userId: string,
  taskId: string,
  patch: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "priority"
      | "dueDate"
      | "projectId"
      | "completed"
      | "executionStatus"
      | "nextAction"
      | "blockerNote"
      | "startedAt"
      | "lastProgressAt"
      | "reminderAt"
    >
  >,
  expectedProjectId?: string | null,
): Promise<void> {
  const update = {
    ...(patch.title !== undefined ? { title: normalizeTaskTitle(patch.title) } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.dueDate !== undefined ? { due_date: normalizeDate(patch.dueDate) } : {}),
    ...(patch.projectId !== undefined ? { project_id: patch.projectId } : {}),
    ...(patch.completed !== undefined ? { completed: patch.completed } : {}),
    ...(patch.executionStatus !== undefined ? { execution_status: patch.executionStatus } : {}),
    ...(patch.nextAction !== undefined ? { next_action: patch.nextAction?.trim() || null } : {}),
    ...(patch.blockerNote !== undefined ? { blocker_note: patch.blockerNote?.trim() || null } : {}),
    ...(patch.startedAt !== undefined ? { started_at: patch.startedAt } : {}),
    ...(patch.lastProgressAt !== undefined ? { last_progress_at: patch.lastProgressAt } : {}),
    ...(patch.reminderAt !== undefined ? { reminder_at: patch.reminderAt } : {}),
    updated_at: new Date().toISOString(),
  };
  let query = supabase
    .from("tasks")
    .update(update)
    .eq("id", resource(taskId))
    .eq("user_id", owner(userId));
  if (expectedProjectId) query = query.eq("project_id", resource(expectedProjectId));
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!data) throw new Error("Task not found.");
}
export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", resource(taskId))
    .eq("user_id", owner(userId));
  if (error) throw workspaceMutationError(error);
}

export async function listSubjects(userId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("study_subjects")
    .select("id,name,description,status,color,objective,weekly_target_minutes,next_action")
    .eq("user_id", owner(userId))
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? "Matéria sem nome",
    description: row.description ?? "",
    status: (["active", "paused", "completed"].includes(row.status ?? "")
      ? row.status
      : "active") as Subject["status"],
    color: row.color ?? "#B9854B",
    objective: row.objective ?? "",
    weeklyTargetMinutes: row.weekly_target_minutes ?? null,
    nextAction: row.next_action ?? "",
  }));
}
export async function createSubject(
  userId: string,
  input: { name: string; objective?: string; weeklyTargetMinutes?: number | null },
): Promise<string> {
  const normalized = normalizeSubjectInput(input);
  const { data, error } = await supabase
    .from("study_subjects")
    .insert({
      user_id: owner(userId),
      name: normalized.name,
      objective: normalized.objective ?? null,
      description: normalized.objective ?? "",
      weekly_target_minutes: normalized.weeklyTargetMinutes,
    })
    .select("id")
    .single();
  if (error) throw workspaceMutationError(error);
  return data.id;
}
export async function updateSubject(
  userId: string,
  subjectId: string,
  patch: {
    objective?: string;
    nextAction?: string;
    weeklyTargetMinutes?: number | null;
    status?: Subject["status"];
  },
): Promise<void> {
  const update = {
    ...(patch.objective !== undefined
      ? { objective: patch.objective.trim() || null, description: patch.objective.trim() }
      : {}),
    ...(patch.nextAction !== undefined ? { next_action: patch.nextAction.trim() || null } : {}),
    ...(patch.weeklyTargetMinutes !== undefined
      ? { weekly_target_minutes: patch.weeklyTargetMinutes }
      : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("study_subjects")
    .update(update)
    .eq("id", resource(subjectId))
    .eq("user_id", owner(userId))
    .select("id")
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!data) throw new Error("Subject not found.");
}
export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  const { data, error } = await supabase
    .from("study_subjects")
    .delete()
    .eq("id", resource(subjectId))
    .eq("user_id", owner(userId))
    .select("id")
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!data) throw new Error("Matéria não encontrada.");
}
export async function getSubjectWorkspace(
  userId: string,
  subjectId: string,
): Promise<SubjectWorkspace | null> {
  const id = resource(subjectId),
    user = owner(userId);
  const [subjects, goals, sessions, notes] = await Promise.all([
    listSubjects(user),
    supabase
      .from("study_goals")
      .select("id,title,completed,current_value,target_value")
      .eq("user_id", user)
      .eq("subject_id", id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("study_sessions")
      .select(
        "id,activity,duration,created_at,status,planned_minutes,started_at,ended_at,reflection",
      )
      .eq("user_id", user)
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("study_notes")
      .select("id,title,content,updated_at")
      .eq("user_id", user)
      .eq("subject_id", id)
      .order("updated_at", { ascending: false }),
  ]);
  if (goals.error || sessions.error || notes.error)
    throw goals.error ?? sessions.error ?? notes.error;
  const subject = subjects.find((item) => item.id === id);
  if (!subject) return null;
  return {
    subject,
    goals: (goals.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      completed: r.completed,
      currentValue: r.current_value,
      targetValue: r.target_value,
    })),
    sessions: (sessions.data ?? []).map((r) => ({
      id: r.id,
      activity: r.activity,
      duration: r.duration ?? 0,
      createdAt: r.created_at,
      status: r.status ?? "completed",
      plannedMinutes: r.planned_minutes ?? null,
      startedAt: r.started_at ?? null,
      endedAt: r.ended_at ?? null,
      reflection: r.reflection ?? null,
    })),
    notes: (notes.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      updatedAt: r.updated_at,
    })),
  };
}
export async function listStudyWorkspaces(userId: string): Promise<SubjectWorkspace[]> {
  const subjects = await listSubjects(userId);
  // IDs are the identity contract: equal names remain separate user records.
  const unique = [...new Map(subjects.map((subject) => [subject.id, subject])).values()];
  const workspaces = await Promise.all(unique.map(({ id }) => getSubjectWorkspace(userId, id)));
  return workspaces.filter((item): item is SubjectWorkspace => item !== null);
}
export async function createStudyGoal(
  userId: string,
  subjectId: string,
  title: string,
  targetValue = 1,
): Promise<void> {
  if (!Number.isInteger(targetValue) || targetValue < 1)
    throw new Error("Meta precisa de um total válido.");
  const { error } = await supabase.from("study_goals").insert({
    user_id: owner(userId),
    subject_id: resource(subjectId),
    title: required(title, "Goal"),
    target_value: targetValue,
  });
  if (error) throw workspaceMutationError(error);
}
export async function updateStudyGoal(
  userId: string,
  goalId: string,
  currentValue: number,
  targetValue: number,
): Promise<void> {
  if (
    !Number.isInteger(currentValue) ||
    !Number.isInteger(targetValue) ||
    currentValue < 0 ||
    targetValue < 1
  )
    throw new Error("Progresso inválido.");
  const current = Math.min(currentValue, targetValue);
  const { error } = await supabase
    .from("study_goals")
    .update({
      current_value: current,
      target_value: targetValue,
      completed: current >= targetValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resource(goalId))
    .eq("user_id", owner(userId));
  if (error) throw workspaceMutationError(error);
}
export async function setStudyGoalCompleted(
  userId: string,
  goalId: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("study_goals")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("id", resource(goalId))
    .eq("user_id", owner(userId));
  if (error) throw workspaceMutationError(error);
}
export async function startStudySession(
  userId: string,
  subjectId: string,
  activity: string,
  plannedMinutes: number,
): Promise<string> {
  const normalized = normalizeSessionInput(activity, plannedMinutes);
  const { data: current, error: currentError } = await supabase
    .from("study_sessions")
    .select("id,subject_id")
    .eq("user_id", owner(userId))
    .eq("status", "active")
    .maybeSingle();
  if (currentError) throw workspaceMutationError(currentError);
  if (current) {
    if (current.subject_id === resource(subjectId)) return current.id;
    throw workspaceMutationError({ message: "STUDY_ACTIVE_SESSION_CONFLICT" });
  }
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: owner(userId),
      subject_id: resource(subjectId),
      activity: normalized.activity,
      duration: 0,
      completed: false,
      status: "active",
      planned_minutes: normalized.plannedMinutes,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw workspaceMutationError(error);
  return data.id;
}
export async function finishStudySession(
  userId: string,
  sessionId: string,
  input: { activity: string; reflection: "understood" | "review" | "difficult" },
): Promise<void> {
  const user = owner(userId);
  const { data, error: readError } = await supabase
    .from("study_sessions")
    .select("started_at")
    .eq("id", resource(sessionId))
    .eq("user_id", user)
    .eq("status", "active")
    .maybeSingle();
  if (readError) throw readError;
  if (!data?.started_at) throw new Error("Sessão ativa não encontrada.");
  const ended = new Date();
  const duration = Math.max(
    1,
    Math.round((ended.getTime() - new Date(data.started_at).getTime()) / 60000),
  );
  const { data: finished, error } = await supabase
    .from("study_sessions")
    .update({
      activity: required(input.activity, "Activity"),
      reflection: input.reflection,
      duration,
      completed: true,
      status: "completed",
      ended_at: ended.toISOString(),
      updated_at: ended.toISOString(),
    })
    .eq("id", resource(sessionId))
    .eq("user_id", user)
    .eq("status", "active")
    .select("id")
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!finished) throw new Error("Sessão ativa não encontrada.");
}
export async function saveStudyNote(
  userId: string,
  subjectId: string,
  input: { id?: string; title: string; content: string },
): Promise<void> {
  const values = {
    title: required(input.title, "Note title"),
    content: input.content,
    updated_at: new Date().toISOString(),
  };
  const result = input.id
    ? await supabase
        .from("study_notes")
        .update(values)
        .eq("id", resource(input.id))
        .eq("user_id", owner(userId))
    : await supabase
        .from("study_notes")
        .insert({ ...values, user_id: owner(userId), subject_id: resource(subjectId) });
  if (result.error) throw result.error;
}
export async function deleteStudyNote(userId: string, noteId: string): Promise<void> {
  const { error } = await supabase
    .from("study_notes")
    .delete()
    .eq("id", resource(noteId))
    .eq("user_id", owner(userId));
  if (error) throw workspaceMutationError(error);
}
