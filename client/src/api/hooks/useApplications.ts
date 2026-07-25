import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { api } from '../api'
import { invalidateBillingStatus } from './useBilling'
import type { Skill } from './useSkills'
import type { Location } from './useLocations'
import type { FilterConfig } from './useTrackerViews'

export type SkillRef = Pick<Skill, 'id' | 'name'>
export type LocationRef = Pick<Location, 'id' | 'name'>

export type { Skill, Location }

export interface Application {
  id: string
  user_id: string
  company_name: string
  job_name: string | null
  careers_url: string | null
  job_url: string | null
  status: ApplicationStatus
  location_id: string | null
  location: LocationRef | null
  salary: string | null
  work_style: 'remote' | 'hybrid' | 'on-site' | null
  visa_support: 'yes' | 'no' | 'unknown' | null
  is_favorite: boolean
  scanner_enabled: boolean
  date_applied: string | null
  next_deadline: string | null
  notes: string | null
  last_moved_at: string | null
  created_at: string
  updated_at: string
  skills: { skill: SkillRef }[]
}

export type ApplicationStatus =
  | 'prospect'
  | 'no_openings'
  | 'ready_to_apply'
  | 'applied'
  | 'pending_schedule'
  | 'interview_scheduled'
  | 'awaiting_response'
  | 'technical_test'
  | 'offer_received'
  | 'rejected'
  | 'rejected_ghosted'
  | 'signed'

export type CreateApplicationPayload = {
  company_name?: string
  job_name?: string | null
  careers_url?: string | null
  job_url?: string | null
  status?: ApplicationStatus
  location_id?: string | null
  salary?: string | null
  work_style?: 'remote' | 'hybrid' | 'on-site' | null
  visa_support?: 'yes' | 'no' | 'unknown' | null
  is_favorite?: boolean
  scanner_enabled?: boolean
  date_applied?: string | null
  next_deadline?: string | null
  notes?: string | null
  skill_ids?: string[]
}

export type UpdateApplicationPayload = {
  id: string
  known_updated_at: string
} & CreateApplicationPayload

// The whole tracker reads from one shared cache: the full list of the user's
// applications (newest first, matching the server's order). Views, filtering,
// sorting, and search are all derived from it client-side on the tracker page —
// there is no per-view server query.
export const APPLICATIONS_LIST_KEY = ['applications', 'list'] as const

export function getCachedApplication(
  queryClient: QueryClient,
  id: string,
): Application | null {
  const detail = queryClient.getQueryData<Application>([
    'applications',
    'detail',
    id,
  ])
  if (detail) return detail

  const list = queryClient.getQueryData<Application[]>(APPLICATIONS_LIST_KEY)
  return list?.find((row) => row.id === id) ?? null
}

interface ExpandedReferences {
  location?: LocationRef | null
  skills?: { skill: SkillRef }[]
}

// Resolves the foreign-key fields on a payload (location_id, skill_ids) into
// the embedded shapes the Application carries (location, skills) by reading
// the relevant query caches. If `fallback` is given, its location/skills are
// used when the cache lookup misses — useful when merging into a known app.
export function expandApplicationReferences(
  queryClient: QueryClient,
  payload: CreateApplicationPayload,
  fallback?: Application,
): ExpandedReferences {
  const result: ExpandedReferences = {}

  if (payload.location_id !== undefined) {
    if (payload.location_id === null) {
      result.location = null
    } else {
      const locations = queryClient.getQueryData<Location[]>(['locations'])
      const match = locations?.find((l) => l.id === payload.location_id)
      result.location =
        match ??
        (fallback?.location_id === payload.location_id
          ? fallback.location
          : null)
    }
  }

  if (payload.skill_ids !== undefined) {
    const skills = queryClient.getQueryData<Skill[]>(['skills'])
    const byId = skills ? new Map(skills.map((s) => [s.id, s])) : null
    result.skills = payload.skill_ids.map((id) => ({
      skill: byId?.get(id) ??
        fallback?.skills.find((s) => s.skill.id === id)?.skill ?? {
          id,
          name: '…',
        },
    }))
  }

  return result
}

function buildApplicationPatch(
  queryClient: QueryClient,
  payload: CreateApplicationPayload,
): Partial<Application> {
  const patch: Partial<Application> = {
    ...payload,
    ...expandApplicationReferences(queryClient, payload),
  }
  if (payload.status !== undefined) {
    patch.last_moved_at = new Date().toISOString()
  }
  return patch
}

export function patchApplicationInCache(
  queryClient: QueryClient,
  id: string,
  payload: CreateApplicationPayload,
) {
  const patch = buildApplicationPatch(queryClient, payload)

  queryClient.setQueryData<Application[]>(APPLICATIONS_LIST_KEY, (old) =>
    old?.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  )
  queryClient.setQueryData<Application>(
    ['applications', 'detail', id],
    (old) => (old ? { ...old, ...patch } : old),
  )
}

export function useApplications() {
  return useQuery({
    queryKey: APPLICATIONS_LIST_KEY,
    queryFn: () => api.get<Application[]>('/api/applications'),
  })
}

// Evaluates a view's stored filter_config against an application. A null
// filter (the permanent "All" view) matches everything.
export function appMatchesFilter(
  app: Application,
  filter: FilterConfig | null,
): boolean {
  if (!filter) return true
  if (filter.field === 'is_favorite') {
    const target = filter.values[0] === true
    if (filter.operator === 'is_not') return app.is_favorite !== target
    return app.is_favorite === target
  }
  const values = filter.values as string[]
  // 'is' = status is any of the values; 'is_not' = none of them.
  if (filter.operator === 'is_not') return !values.includes(app.status)
  return values.includes(app.status)
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['applications', 'detail', id],
    queryFn: () => api.get<Application>(`/api/applications/${id}`),
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateApplicationPayload) =>
      api.post<Application>('/api/applications', payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] })
      const previous = queryClient.getQueryData<Application[]>(
        APPLICATIONS_LIST_KEY,
      )

      const tempId = `temp-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const locations = queryClient.getQueryData<Location[]>(['locations'])
      const skills = queryClient.getQueryData<Skill[]>(['skills'])

      const optimisticApp: Application = {
        id: tempId,
        user_id: '',
        company_name: payload.company_name ?? '',
        job_name: payload.job_name ?? null,
        careers_url: payload.careers_url ?? null,
        job_url: payload.job_url ?? null,
        status: payload.status ?? 'prospect',
        location_id: payload.location_id ?? null,
        location: payload.location_id
          ? (locations?.find((l) => l.id === payload.location_id) ?? null)
          : null,
        salary: payload.salary ?? null,
        work_style: payload.work_style ?? null,
        visa_support: payload.visa_support ?? null,
        is_favorite: payload.is_favorite ?? false,
        scanner_enabled: payload.scanner_enabled ?? false,
        date_applied: payload.date_applied ?? null,
        next_deadline: payload.next_deadline ?? null,
        notes: payload.notes ?? null,
        last_moved_at: now,
        created_at: now,
        updated_at: now,
        skills: (payload.skill_ids ?? []).map((sid) => ({
          skill: skills?.find((s) => s.id === sid) ?? { id: sid, name: '…' },
        })),
      }

      queryClient.setQueryData<Application[]>(APPLICATIONS_LIST_KEY, (old) =>
        old ? [optimisticApp, ...old] : [optimisticApp],
      )

      return { previous, tempId }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(APPLICATIONS_LIST_KEY, ctx?.previous)
    },
    onSuccess: (newApp, _vars, ctx) => {
      queryClient.setQueryData<Application[]>(
        APPLICATIONS_LIST_KEY,
        (old) =>
          old?.map((a) => (a.id === ctx?.tempId ? newApp : a)) ?? [newApp],
      )
      queryClient.setQueryData(['applications', 'detail', newApp.id], newApp)
      void invalidateBillingStatus(queryClient)
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateApplicationPayload) =>
      api.put<Application>(`/api/applications/${id}`, payload),
    onMutate: async ({ id, ...payload }) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] })
      const previous = queryClient.getQueryData<Application[]>(
        APPLICATIONS_LIST_KEY,
      )
      const previousDetail = queryClient.getQueryData<Application>([
        'applications',
        'detail',
        id,
      ])
      patchApplicationInCache(queryClient, id, payload)

      return { previous, previousDetail, id }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      queryClient.setQueryData(APPLICATIONS_LIST_KEY, ctx.previous)
      queryClient.setQueryData(
        ['applications', 'detail', ctx.id],
        ctx.previousDetail,
      )
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Application[]>(APPLICATIONS_LIST_KEY, (old) =>
        old?.map((a) => (a.id === data.id ? data : a)),
      )
      queryClient.setQueryData(['applications', 'detail', data.id], data)
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/api/applications/${id}`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Application[]>(APPLICATIONS_LIST_KEY, (old) =>
        old?.filter((a) => a.id !== id),
      )
      queryClient.removeQueries({ queryKey: ['applications', 'detail', id] })
      void invalidateBillingStatus(queryClient)
    },
  })
}
