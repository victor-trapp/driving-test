import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type ClipSummary,
  type FlashcardState,
  type Meta,
  type MockListItem,
  type Profile,
  type ProgressSummary,
  type ReviewQuestion,
  type SignsResponse,
  type TopicDetail,
  type TopicStats,
} from "./api";

export const keys = {
  profile: ["profile"] as const,
  meta: ["meta"] as const,
  progress: ["progress"] as const,
  topics: ["topics"] as const,
  topic: (id: string) => ["topics", id] as const,
  signs: ["signs"] as const,
  flashcards: ["flashcards"] as const,
  practice: (id: string) => ["practice", id] as const,
  practiceList: ["practice-list"] as const,
  mocks: ["mocks"] as const,
  mock: (id: string) => ["mock", id] as const,
  mockResults: (id: string) => ["mock-results", id] as const,
  clips: ["clips"] as const,
  clip: (id: string) => ["clips", id] as const,
  bookmarks: ["bookmarks"] as const,
  mistakes: ["mistakes"] as const,
};

export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: () => api.get<Profile>("/profile") });
export const useMeta = () => useQuery({ queryKey: keys.meta, queryFn: () => api.get<Meta>("/meta"), staleTime: Infinity });
export const useProgress = () => useQuery({ queryKey: keys.progress, queryFn: () => api.get<ProgressSummary>("/progress") });
export const useTopics = () => useQuery({ queryKey: keys.topics, queryFn: () => api.get<TopicStats[]>("/topics") });
export const useTopic = (id: string) => useQuery({ queryKey: keys.topic(id), queryFn: () => api.get<TopicDetail>(`/topics/${id}`) });
export const useSigns = () => useQuery({ queryKey: keys.signs, queryFn: () => api.get<SignsResponse>("/signs"), staleTime: Infinity });
export const useFlashcards = () => useQuery({ queryKey: keys.flashcards, queryFn: () => api.get<FlashcardState>("/flashcards") });
export const useMocks = () => useQuery({ queryKey: keys.mocks, queryFn: () => api.get<{ active: string | null; tests: MockListItem[] }>("/mock-tests") });
export const useClips = () => useQuery({ queryKey: keys.clips, queryFn: () => api.get<ClipSummary[]>("/hazard/clips") });
export const useBookmarks = () =>
  useQuery({ queryKey: keys.bookmarks, queryFn: () => api.get<{ createdAt: number; question: ReviewQuestion }[]>("/bookmarks") });
export const useMistakes = () =>
  useQuery({ queryKey: keys.mistakes, queryFn: () => api.get<{ question: ReviewQuestion; lastSelected: number[]; at: number }[]>("/mistakes") });

/** Anything that records learning activity should refresh these. */
export function useInvalidateProgress() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.progress });
    qc.invalidateQueries({ queryKey: keys.topics });
    qc.invalidateQueries({ queryKey: keys.mistakes });
  };
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<Profile, "id">>) => api.patch<Profile>("/profile", patch),
    onSuccess: (p) => {
      qc.setQueryData(keys.profile, p);
      qc.invalidateQueries({ queryKey: keys.progress });
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => (on ? api.put(`/bookmarks/${id}`) : api.del(`/bookmarks/${id}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.bookmarks });
      qc.invalidateQueries({ queryKey: keys.progress });
    },
  });
}
