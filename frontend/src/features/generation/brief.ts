import type { Guide, TaskHint } from '../../api/client'
export interface GenerationBrief {
  city: string
  area: string
  theme: 'history' | 'architecture' | 'culture' | 'mystery' | 'custom'
  idea: string
  audience: 'adults' | 'family' | 'teens'
  duration_minutes: number
  checkpoint_count: number
  difficulty: 'easy' | 'medium' | 'hard'
  tone: 'informative' | 'adventure' | 'detective'
  guide_style: 'none' | 'captain' | 'historian' | 'explorer'
  task_format: 'single_choice' | 'text' | 'mixed'
  preferred_places: string[]
  excluded_places: string[]
  step_free: boolean
  outdoor_only: boolean
  wishes: string
  source_notes: string
}

export interface GenerationPreparation {
  status: 'awaiting_provider' | 'ready'
  brief: GenerationBrief
  message: string
}

export const initialBrief: GenerationBrief = {
  city: 'Санкт-Петербург', area: '', theme: 'history', idea: '', audience: 'adults',
  duration_minutes: 60, checkpoint_count: 4, difficulty: 'easy', tone: 'adventure',
  guide_style: 'explorer', task_format: 'single_choice', preferred_places: [], excluded_places: [],
  step_free: false, outdoor_only: true, wishes: '', source_notes: '',
}

export const labels = {
  guide_style: { none: 'Без проводника', captain: 'Капитан', historian: 'Хранитель историй', explorer: 'Исследователь' },
  theme: { history: 'История города', architecture: 'Архитектура', culture: 'Искусство и культура', mystery: 'Городские легенды', custom: 'Своя тема' },
  audience: { adults: 'Взрослые', family: 'Семья с детьми', teens: 'Подростки' },
  difficulty: { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' },
  tone: { informative: 'Познавательный', adventure: 'Приключение', detective: 'Детектив' },
  task_format: { single_choice: 'Выбор ответа', text: 'Текстовый ответ', mixed: 'Смешанный' },
}

export function readBrief(key: string): GenerationBrief {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...initialBrief }
    const result = { ...initialBrief }
    for (const field of Object.keys(initialBrief) as (keyof GenerationBrief)[]) {
      const value = (saved as Record<string, unknown>)[field]
      const fallback = initialBrief[field]
      if (Array.isArray(fallback)) {
        if (Array.isArray(value) && value.every((item) => typeof item === 'string')) Object.assign(result, { [field]: value })
      } else if (typeof value === typeof fallback && (typeof value !== 'number' || Number.isFinite(value))) {
        if (field in labels && !Object.hasOwn(labels[field as keyof typeof labels], String(value))) continue
        Object.assign(result, { [field]: value })
      }
    }
    return result
  } catch {
    return { ...initialBrief }
  }
}

export interface GenerationStatus {
  available: boolean
  model: string
}

export interface GeneratedCheckpoint {
  place_name: string
  address_hint: string
  title: string
  description: string
  task_type: 'text' | 'single_choice' | 'ordering'
  correct_order?: string[]
  hints?: TaskHint[]
  task_prompt: string
  answer_options: string[]
  correct_answer: string
  route_clue: string
  travel_facts: { title: string; text: string }[]
  reveal_title: string
  reveal_text: string
  source_urls: string[]
  verification_notes: string[]
}

export interface GeneratedPlan {
  guide?: Guide | null
  title: string
  short_description: string
  city: string
  estimated_duration_minutes: number
  checkpoints: GeneratedCheckpoint[]
  review_notes: string[]
  confirmed_indices?: number[]
}
