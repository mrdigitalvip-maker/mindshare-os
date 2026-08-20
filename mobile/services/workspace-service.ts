import { supabase } from "@/lib/supabase";

export type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
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
};
export type Subject = {
  id: string;
  name: string;
  description: string;
  status: string;
  color: string;
};
export type StudyGoal = {
  id: string;
  title: string;
  completed: boolean;
  currentValue: number;
  targetValue: number;
};
export type StudySession = { id: string; activity: string; duration: number; createdAt: string };
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
const taskFrom = (row: Record<string, unknown>): Task => ({
  id: String(row.id),
  title: String(row.title ?? "Untitled task"),
  description: String(row.description ?? ""),
  priority: String(row.priority ?? "medium"),
  dueDate: typeof row.due_date === "string" ? row.due_date : null,
  projectId: typeof row.project_id === "string" ? row.project_id : null,
  completed: row.completed === true,
  updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
});

export async function listProjects(userId: string): Promise<Project[]> {
  const id = owner(userId);
  const { data, error } = await supabase
    .from("projects")
    .select("id,title,description,status")
    .eq("user_id", id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? "Untitled project",
    description: row.description ?? "",
    status: row.status ?? "active",
  }));
}
export async function createProject(
  userId: string,
  input: { title: string; description?: string },
): Promise<string> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: owner(userId),
      title: required(input.title, "Project name"),
      description: input.description?.trim() || null,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;
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
  if (error) throw error;
  if (!data) throw new Error("Project not found.");
}
export async function updateProject(
  userId: string,
  projectId: string,
  patch: { title?: string; description?: string; status?: string },
): Promise<void> {
  const update = {
    ...patch,
    ...(patch.title !== undefined ? { title: required(patch.title, "Project name") } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", resource(projectId))
    .eq("user_id", owner(userId))
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Project not found.");
}
export async function getProject(
  userId: string,
  projectId: string,
): Promise<{ project: Project; tasks: Task[] } | null> {
  const id = resource(projectId);
  const projects = await listProjects(userId);
  const project = projects.find((item) => item.id === id);
  if (!project) return null;
  return { project, tasks: await listTasks(userId, id) };
}

export async function listTasks(userId: string, projectId?: string): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select("id,title,description,priority,due_date,project_id,completed,updated_at")
    .eq("user_id", owner(userId))
    .order("updated_at", { ascending: false });
  if (projectId) query = query.eq("project_id", resource(projectId));
  const { data, error } = await query;
  if (error) throw error;
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
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: owner(userId),
      title: required(input.title, "Task title"),
      description: input.description?.trim() || null,
      project_id: input.projectId ? resource(input.projectId) : null,
      priority: input.priority ?? "medium",
      due_date: input.dueDate || null,
      completed: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
export async function updateTask(
  userId: string,
  taskId: string,
  patch: Partial<
    Pick<Task, "title" | "description" | "priority" | "dueDate" | "projectId" | "completed">
  >,
): Promise<void> {
  const update = {
    ...(patch.title !== undefined ? { title: required(patch.title, "Task title") } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.dueDate !== undefined ? { due_date: patch.dueDate } : {}),
    ...(patch.projectId !== undefined ? { project_id: patch.projectId } : {}),
    ...(patch.completed !== undefined ? { completed: patch.completed } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", resource(taskId))
    .eq("user_id", owner(userId))
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Task not found.");
}
export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", resource(taskId))
    .eq("user_id", owner(userId));
  if (error) throw error;
}

export async function listSubjects(userId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("study_subjects")
    .select("id,name,description,status,color")
    .eq("user_id", owner(userId))
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? "Untitled subject",
    description: row.description ?? "",
    status: row.status ?? "active",
    color: row.color ?? "#8B7CFF",
  }));
}
export async function createSubject(userId: string, name: string): Promise<string> {
  const { data, error } = await supabase
    .from("study_subjects")
    .insert({ user_id: owner(userId), name: required(name, "Subject name") })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
export async function getSubjectWorkspace(
  userId: string,
  subjectId: string,
): Promise<SubjectWorkspace | null> {
  const id = resource(subjectId);
  const user = owner(userId);
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
      .select("id,activity,duration,created_at")
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
    goals: (goals.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      completed: row.completed,
      currentValue: row.current_value,
      targetValue: row.target_value,
    })),
    sessions: (sessions.data ?? []).map((row) => ({
      id: row.id,
      activity: row.activity,
      duration: row.duration,
      createdAt: row.created_at,
    })),
    notes: (notes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      updatedAt: row.updated_at,
    })),
  };
}
export async function createStudyGoal(
  userId: string,
  subjectId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase.from("study_goals").insert({
    user_id: owner(userId),
    subject_id: resource(subjectId),
    title: required(title, "Goal"),
  });
  if (error) throw error;
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
  if (error) throw error;
}
export async function createStudySession(
  userId: string,
  subjectId: string,
  activity: string,
  duration: number,
): Promise<void> {
  if (!Number.isFinite(duration) || duration < 1 || duration > 1440)
    throw new Error("Duration must be between 1 and 1440 minutes.");
  const { error } = await supabase.from("study_sessions").insert({
    user_id: owner(userId),
    subject_id: resource(subjectId),
    activity: required(activity, "Activity"),
    duration: Math.round(duration),
    completed: true,
  });
  if (error) throw error;
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
  if (error) throw error;
}
