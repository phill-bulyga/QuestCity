import type { PartnerPlace, MapLocation } from '../features/partners/types'
import type { GenerationBrief, GenerationPreparation, GenerationStatus, GeneratedPlan } from '../features/generation/brief'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export interface User {
  id: string
  email: string
  display_name: string
  role: 'player' | 'author' | 'admin'
  is_active: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: 'bearer'
  user: User
}

export type QuestStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
export type TaskType = 'text' | 'single_choice' | 'ordering' | 'photo'
export interface TaskHint { text: string; cost: number }
export interface Guide { name: string; persona: 'captain' | 'historian' | 'explorer'; introduction: string; completion: string }

export interface QuestListItem {
  id: string
  title: string
  short_description: string
  city: string
  status: QuestStatus
  estimated_duration_minutes: number
  checkpoint_count: number
  created_at: string
}

export interface Checkpoint {
  correct_order: string[]
  hints: TaskHint[]
  task_image_url: string | null
  task_image_caption: string
  id: string
  position: number
  title: string
  description: string
  latitude: number
  longitude: number
  activation_radius_m: number
  task_type: TaskType
  task_prompt: string
  answer_options: string[]
  correct_answer?: string
  points: number
  max_attempts: number
  reveal_title: string
  reveal_text: string
  reveal_image_url: string | null
  reveal_audio_url: string | null
  reveal_media_caption: string
  reveal_source_url: string | null
  route_clue: string
  travel_facts: TravelFact[]
}

export interface TravelFact { title: string; text: string }

export interface Quest {
  guide: Guide | null
  partner_places: PartnerPlace[]
  start_location?: MapLocation | null
  max_score?: number
  demo_mode?: boolean
  generation_plan?: GeneratedPlan | null
  id: string
  author_id: string
  title: string
  short_description: string
  city: string
  status: QuestStatus
  estimated_duration_minutes: number
  checkpoints: Checkpoint[]
  created_at: string
  updated_at: string
  rejection_reason?: string
}

export type QuestPreview = Omit<Quest, 'checkpoints' | 'rejection_reason'> & {
  checkpoints: { id: string; position: number }[]
}

export interface GameCheckpoint {
  hints: TaskHint[]
  hint_count: number
  next_hint_cost: number | null
  hint_penalty: number
  task_image_url: string | null
  task_image_caption: string
  attempts_remaining: number
  id: string
  position: number
  title: string
  description: string
  latitude: number
  longitude: number
  activation_radius_m: number
  is_unlocked: boolean
  task_type: TaskType | null
  task_prompt: string | null
  answer_options: string[]
  points: number | null
  route_clue: string
  travel_facts: TravelFact[]
  travel_fact_index: number
  travel_fact_count: number
}

export interface QuestReward {
  partner_name: string
  venue_address: string
  offer: string
  promo_code: string
  redemption_instructions: string
  min_score: number
  is_active: boolean
  is_demo: boolean
}

export type EarnedReward = Omit<QuestReward, 'min_score' | 'is_active'>

export interface GameSession {
  guide: Guide | null
  journal: (CheckpointReveal & { chapter: number; checkpoint_title: string })[]
  partner_places: PartnerPlace[]
  max_score: number
  demo_mode: boolean
  id: string
  quest_id: string
  quest_title: string
  status: 'active' | 'completed' | 'abandoned'
  current_checkpoint_index: number
  checkpoint_count: number
  score: number
  started_at: string
  finished_at: string | null
  current_checkpoint: GameCheckpoint | null
  reward: EarnedReward | null
  reward_min_score: number | null
}

export interface ArrivalResponse {
  arrived: boolean
  distance_m: number
  allowed_distance_m: number
  session: GameSession
}

export interface AnswerResponse {
  is_correct: boolean
  attempts_used: number
  attempts_remaining: number
  points_awarded: number
  correct_answer: string | null
  reveal: CheckpointReveal | null
  session: GameSession
}

export interface CheckpointReveal {
  title: string
  text: string
  image_url: string | null
  audio_url: string | null
  media_caption: string
  source_url: string | null
}

export interface MediaUploadResponse {
  url: string
  media_type: 'image' | 'audio'
  original_name: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function errorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item?.msg === 'string' ? item.msg : null))
      .filter((message): message is string => message !== null)
    if (messages.length) return messages.join('; ')
  }
  return fallback
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
    throw new ApiError(errorDetail(payload?.detail, 'Не удалось выполнить запрос'), response.status)
  }

  return response.json() as Promise<T>
}

async function uploadMedia(token: string, file: File): Promise<MediaUploadResponse> {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${API_URL}/media`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
    throw new ApiError(errorDetail(payload?.detail, 'Не удалось загрузить файл'), response.status)
  }
  return response.json() as Promise<MediaUploadResponse>
}

export const api = {
  saveGuide: (token: string, questId: string, guide: Guide | null) => request<Quest>(`/quests/${questId}`, { method: 'PATCH', body: JSON.stringify({ guide }) }, token),
  openHint: (token: string, sessionId: string, checkpointId: string, index: number) => request<GameSession>(`/game-sessions/${sessionId}/hint`, { method: 'POST', body: JSON.stringify({ checkpoint_id: checkpointId, index }) }, token),
  getPartners: (token: string, questId: string) => request<PartnerPlace[]>(`/admin/quests/${questId}/partners`, {}, token),
  savePartners: (token: string, questId: string, places: PartnerPlace[]) => request<PartnerPlace[]>(`/admin/quests/${questId}/partners`, { method: 'PUT', body: JSON.stringify({ places }) }, token),

  suggestField: (token: string, payload: {
    field: string; scope: 'quest' | 'brief' | 'checkpoint';
    context: Record<string, string | number | boolean | null>; instruction: string;
  }, signal?: AbortSignal) => request<{ value: string | number | boolean | null; message: string }>('/quest-generation/suggest-field', {
    method: 'POST', body: JSON.stringify(payload), signal,
  }, token),

  generationStatus: (token: string) => request<GenerationStatus>('/quest-generation/status', {}, token),

  generateQuest: (token: string, brief: GenerationBrief) =>
    request<{ quest_id: string; status: 'draft' }>('/quest-generation/generate', {
      method: 'POST', body: JSON.stringify(brief),
    }, token),

  prepareGeneration: (token: string, brief: GenerationBrief) =>
    request<GenerationPreparation>('/quest-generation/prepare', {
      method: 'POST', body: JSON.stringify(brief),
    }, token),

  register: (payload: { email: string; display_name: string; password: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  refresh: () => request<AuthResponse>('/auth/refresh', { method: 'POST' }),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: (token: string) => request<User>('/auth/me', {}, token),

  listQuests: (token: string) => request<QuestListItem[]>('/quests', {}, token),

  listMyQuests: (token: string) => request<QuestListItem[]>('/quests/mine', {}, token),

  createQuest: (
    token: string,
    payload: {
      guide?: Guide | null
      title: string
      short_description: string
      city: string
      estimated_duration_minutes: number
    },
  ) => request<Quest>('/quests', { method: 'POST', body: JSON.stringify(payload) }, token),

  getQuest: (token: string, questId: string) => request<QuestPreview>(`/quests/${questId}`, {}, token),

  getQuestForEditing: (token: string, questId: string) =>
    request<Quest>(`/quests/${questId}/edit`, {}, token),

  addCheckpoint: (
    token: string,
    questId: string,
    payload: {
      title: string
      description: string
      latitude: number
      longitude: number
      activation_radius_m: number
      correct_order: string[]
      hints: TaskHint[]
      task_image_url: string | null
      task_image_caption: string
      task_type: TaskType
      task_prompt: string
      answer_options: string[]
      correct_answer: string
      points: number
      max_attempts: number
      reveal_title: string
      reveal_text: string
      reveal_image_url: string | null
      reveal_audio_url: string | null
      reveal_media_caption: string
      reveal_source_url: string | null
      route_clue: string
      travel_facts: TravelFact[]
    },
    generationIndex?: number,
  ) =>
    request<Checkpoint>(`/quests/${questId}/checkpoints${generationIndex === undefined ? '' : `?generation_index=${generationIndex}`}`, { method: 'POST', body: JSON.stringify(payload) }, token),

  publishQuest: (token: string, questId: string) =>
    request<Quest>(`/quests/${questId}/publish`, { method: 'POST' }, token),

  uploadMedia,

  listReviewQueue: (token: string) => request<QuestListItem[]>('/admin/review', {}, token),
  getQuestForReview: (token: string, questId: string) =>
    request<Quest>(`/admin/quests/${questId}`, {}, token),
  approveQuest: (token: string, questId: string) =>
    request<Quest>(`/admin/quests/${questId}/approve`, { method: 'POST' }, token),
  rejectQuest: (token: string, questId: string, reason: string) =>
    request<Quest>(`/admin/quests/${questId}/reject`, {
      method: 'POST', body: JSON.stringify({ reason }),
    }, token),
  getReward: (token: string, questId: string) =>
    request<QuestReward | null>(`/admin/quests/${questId}/reward`, {}, token),
  saveReward: (token: string, questId: string, reward: QuestReward) =>
    request<QuestReward>(`/admin/quests/${questId}/reward`, {
      method: 'PUT', body: JSON.stringify(reward),
    }, token),

  startGame: (token: string, questId: string) =>
    request<GameSession>('/game-sessions', { method: 'POST', body: JSON.stringify({ quest_id: questId }) }, token),

  getGame: (token: string, sessionId: string) =>
    request<GameSession>(`/game-sessions/${sessionId}`, {}, token),

  nextTravelFact: (token: string, sessionId: string) =>
    request<GameSession>(`/game-sessions/${sessionId}/next-fact`, { method: 'POST' }, token),

  confirmArrival: (
    token: string,
    sessionId: string,
    payload: { latitude: number; longitude: number; accuracy_m: number },
  ) =>
    request<ArrivalResponse>(
      `/game-sessions/${sessionId}/arrive`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),

  unlockWithoutLocation: (token: string, sessionId: string) =>
    request<ArrivalResponse>(`/game-sessions/${sessionId}/unlock`, { method: 'POST' }, token),

  submitAnswer: (token: string, sessionId: string, answer: string | string[]) =>
    request<AnswerResponse>(
      `/game-sessions/${sessionId}/answer`,
      { method: 'POST', body: JSON.stringify({ answer }) },
      token,
    ),
}
