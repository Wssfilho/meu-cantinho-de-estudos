import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validStudySession, type StudySessionInput } from "@/lib/pomodoro";

export type Topic = {
  id: string;
  subject_id: string;
  title: string;
  done: boolean;
  completed_at: string | null;
  created_at: string;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  topics: Topic[];
};

export type Profile = { id: string; display_name: string | null };

export type StudySession = StudySessionInput & {
  user_id: string;
  created_at: string;
};

export const studySessionsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["study-sessions", userId],
    queryFn: async (): Promise<StudySession[]> => {
      const sessions: StudySession[] = [];
      // Fetch every page so totals remain correct beyond PostgREST's row limit.
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("study_sessions")
          .select(
            "id, user_id, started_at, ended_at, duration_seconds, target_seconds, completed, created_at",
          )
          .eq("user_id", userId)
          .order("ended_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + 999);
        if (error) throw error;
        sessions.push(...data);
        if (data.length < 1000) return sessions;
      }
    },
  });

export function useSaveStudySession(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: StudySessionInput) => {
      if (!validStudySession(session)) throw new Error("Sessão de estudo inválida.");
      const { error } = await supabase
        .from("study_sessions")
        .upsert({ ...session, user_id: userId }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-sessions", userId] }),
    // Keep failures in the timer's persistent queue; the UI offers an explicit retry.
    retry: false,
  });
}

const TOPIC_FIELDS = "id, subject_id, title, done, completed_at, created_at";

function sortTopics(topics: Topic[]) {
  return [...topics].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const subjectsQuery = () =>
  queryOptions({
    queryKey: ["subjects"],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from("subjects")
        .select(`id, name, color, created_at, updated_at, topics(${TOPIC_FIELDS})`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        topics: sortTopics(s.topics as Topic[]),
      }));
    },
  });

export const subjectQuery = (id: string) =>
  queryOptions({
    queryKey: ["subjects", id],
    queryFn: async (): Promise<Subject | null> => {
      const { data, error } = await supabase
        .from("subjects")
        .select(`id, name, color, created_at, updated_at, topics(${TOPIC_FIELDS})`)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, topics: sortTopics(data.topics as Topic[]) };
    },
  });

function useInvalidateSubjects() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["subjects"] });
}

const onError = (e: Error) => toast.error("Algo deu errado", { description: e.message });

export function useCreateSubject() {
  const invalidate = useInvalidateSubjects();
  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from("subjects")
        .insert({ name: input.name.trim(), color: input.color })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Matéria criada");
    },
    onError,
  });
}

export function useUpdateSubject() {
  const invalidate = useInvalidateSubjects();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from("subjects")
        .update({ name: input.name.trim(), color: input.color })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Matéria atualizada");
    },
    onError,
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: ["subjects", id] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Matéria excluída");
    },
    onError,
  });
}

export function useAddTopic() {
  const invalidate = useInvalidateSubjects();
  return useMutation({
    mutationFn: async (input: { subjectId: string; title: string }) => {
      const { error } = await supabase
        .from("topics")
        .insert({ subject_id: input.subjectId, title: input.title.trim() });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError,
  });
}

export function useToggleTopic() {
  const invalidate = useInvalidateSubjects();
  return useMutation({
    mutationFn: async (input: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("topics")
        .update({ done: input.done })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError,
  });
}

export function useDeleteTopic() {
  const invalidate = useInvalidateSubjects();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError,
  });
}

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: displayName.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Perfil atualizado");
    },
    onError,
  });
}

export function displayNameOf(profile: Profile | null | undefined, email?: string | null) {
  return profile?.display_name?.trim() || email?.split("@")[0] || "Estudante";
}
