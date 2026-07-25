import { Router } from 'express'
import { getSupabase } from '../../middleware/auth'
import { sendPlanLimit } from '../../billing/limits'

const router = Router()

const JOINED_SELECT =
  '*, location:locations(id, name), skills:application_skills(skill:skills(id, name))'

async function fetchApplicationWithJoins(id: string, userId: string) {
  return await getSupabase()
    .from('applications')
    .select(JOINED_SELECT)
    .eq('id', id)
    .eq('user_id', userId)
    .single()
}

async function validateLocationOwnership(
  locationId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return error.message
  if (!data) return 'Invalid location_id'
  return null
}

async function setApplicationSkills(
  applicationId: string,
  skillIds: string[],
  userId: string,
): Promise<{ status: number; message: string } | null> {
  const { error } = await getSupabase().rpc('set_application_skills', {
    p_application_id: applicationId,
    p_user_id: userId,
    p_skill_ids: skillIds,
  })

  if (!error) return null

  if (error.code === 'P0001') return { status: 404, message: error.message }
  if (error.code === 'P0002') return { status: 400, message: error.message }
  return { status: 500, message: error.message }
}

// Returns all of the user's applications (newest first). Filtering, sorting,
// and search are applied client-side on the loaded set — see the tracker page.
// Returns only active applications. Rows archived by a downgrade stay in the DB
// but are excluded until the user resubscribes.
router.get('/', async (req, res) => {
  const { data, error } = await getSupabase()
    .from('applications')
    .select(JOINED_SELECT)
    .eq('user_id', req.userId!)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

router.get('/:id', async (req, res) => {
  const { data, error } = await getSupabase()
    .from('applications')
    .select(JOINED_SELECT)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Not found' })

  // Archived rows are hidden behind a downgrade — don't serve them directly.
  const { plan, limits } = req.entitlement!
  if ((data as { archived_at: string | null }).archived_at) {
    return sendPlanLimit(res, 'applications', limits.applications, plan)
  }

  return res.json(data)
})

router.post('/', async (req, res) => {
  const {
    company_name,
    job_name,
    careers_url,
    job_url,
    status,
    location_id,
    salary,
    work_style,
    visa_support,
    is_favorite,
    date_applied,
    next_deadline,
    notes,
    skill_ids,
  } = req.body

  const { count, error: countError } = await getSupabase()
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.userId!)
    .is('archived_at', null)

  if (countError) return res.status(500).json({ error: countError.message })
  const { plan, limits } = req.entitlement!
  if ((count ?? 0) >= limits.applications)
    return sendPlanLimit(res, 'applications', limits.applications, plan)

  if (location_id) {
    const locationError = await validateLocationOwnership(
      location_id,
      req.userId!,
    )
    if (locationError) return res.status(400).json({ error: locationError })
  }

  const { data: created, error } = await getSupabase()
    .from('applications')
    .insert({
      user_id: req.userId!,
      company_name: company_name ?? '',
      job_name: job_name ?? null,
      careers_url: careers_url ?? null,
      job_url: job_url ?? null,
      status: status ?? 'prospect',
      location_id: location_id ?? null,
      salary: salary ?? null,
      work_style: work_style ?? null,
      visa_support: visa_support ?? null,
      is_favorite: is_favorite ?? false,
      date_applied: date_applied ?? null,
      next_deadline: next_deadline ?? null,
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  if (Array.isArray(skill_ids) && skill_ids.length > 0) {
    const skillError = await setApplicationSkills(
      created.id,
      skill_ids,
      req.userId!,
    )
    if (skillError) {
      // Roll back the orphan application row so the caller can retry cleanly.
      await getSupabase().from('applications').delete().eq('id', created.id)
      return res.status(skillError.status).json({ error: skillError.message })
    }
  }

  const { data, error: fetchErr } = await fetchApplicationWithJoins(
    created.id,
    req.userId!,
  )
  if (fetchErr) return res.status(500).json({ error: fetchErr.message })
  return res.status(201).json(data)
})

router.put('/:id', async (req, res) => {
  const {
    known_updated_at,
    company_name,
    job_name,
    careers_url,
    job_url,
    status,
    location_id,
    salary,
    work_style,
    visa_support,
    is_favorite,
    scanner_enabled,
    date_applied,
    next_deadline,
    notes,
    skill_ids,
  } = req.body

  if (!known_updated_at) {
    return res.status(400).json({ error: 'known_updated_at is required' })
  }

  if (location_id) {
    const locationError = await validateLocationOwnership(
      location_id,
      req.userId!,
    )
    if (locationError) return res.status(400).json({ error: locationError })
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (company_name !== undefined) update.company_name = company_name
  if (job_name !== undefined) update.job_name = job_name
  if (careers_url !== undefined) update.careers_url = careers_url
  if (job_url !== undefined) update.job_url = job_url
  if (status !== undefined) update.status = status
  if (location_id !== undefined) update.location_id = location_id
  if (salary !== undefined) update.salary = salary
  if (work_style !== undefined) update.work_style = work_style
  if (visa_support !== undefined) update.visa_support = visa_support
  if (is_favorite !== undefined) update.is_favorite = is_favorite
  if (scanner_enabled !== undefined) update.scanner_enabled = scanner_enabled
  if (date_applied !== undefined) update.date_applied = date_applied
  if (next_deadline !== undefined) update.next_deadline = next_deadline
  if (notes !== undefined) update.notes = notes

  const { data: updated, error } = await getSupabase()
    .from('applications')
    .update(update)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .eq('updated_at', known_updated_at)
    .select('id')
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!updated) return res.status(409).json({ error: 'Update conflict' })

  if (Array.isArray(skill_ids)) {
    const skillError = await setApplicationSkills(
      updated.id,
      skill_ids,
      req.userId!,
    )
    if (skillError) {
      // Row is already committed. Return current state so the client cache stays
      // coherent and the next edit doesn't hit a 409.
      const { data: fallback, error: fallbackErr } =
        await fetchApplicationWithJoins(updated.id, req.userId!)
      if (fallbackErr || !fallback)
        return res.status(500).json({ error: skillError.message })
      return res.json(fallback)
    }
  }

  const { data, error: fetchErr } = await fetchApplicationWithJoins(
    updated.id,
    req.userId!,
  )
  if (fetchErr) return res.status(500).json({ error: fetchErr.message })
  return res.json(data)
})

router.delete('/:id', async (req, res) => {
  const { data: deleted, error } = await getSupabase()
    .from('applications')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  return res.json({ id: deleted.id })
})

export default router
