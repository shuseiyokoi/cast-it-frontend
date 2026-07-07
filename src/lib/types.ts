export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Episode {
  id: string
  title: string
  language: string
  publish_date: string | null
  status: string
  duration_seconds: number | null
  created_at: string
  updated_at: string
}

export interface EpisodeDetail extends Episode {
  description: string
  summary: string
  cover_image: string | null
}

export interface Article {
  id: string
  source: string
  source_name: string
  title: string
  url: string
  published_at: string | null
  language: string
  category: string
  importance_score: number | null
  status: string
  created_at: string
  updated_at: string
}

export interface ArticleDetail extends Article {
  author: string
  summary: string
  content: string
}

export interface Script {
  id: string
  episode: string
  episode_title: string
  version: number
  title: string
  status: string
  validation_status: string
  estimated_duration_seconds: number | null
  generated_at: string | null
  created_at: string
  updated_at: string
}

export interface ScriptSegment {
  id: string
  script: string
  sequence: number
  speaker: string
  voice: string
  emotion: string
  text: string
  estimated_duration_seconds: number | null
  created_at: string
  updated_at: string
}

export interface AudioAsset {
  id: string
  episode: string
  episode_title: string
  script_segment: string | null
  provider: string
  voice: string
  file_path?: string
  duration: number | null
  format: string
  is_final_episode_audio: boolean
  status: string
  generated_at: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  job_type: string
  status: string
  progress: number
  retry_count: number
  error_message?: string
  created_at: string
  updated_at: string
}

export interface NewsSource {
  id: string
  name: string
  url: string
  source_type?: string
  language?: string
  enabled?: boolean
  last_fetched_at?: string | null
  created_at: string
  updated_at: string
}

export interface HealthCheck {
  status: string
  checks: Record<string, { healthy: boolean; [key: string]: unknown }>
}
