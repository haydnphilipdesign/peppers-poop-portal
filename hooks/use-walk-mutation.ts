'use client'

import { useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api-client'
import type { WalkMutationResponse } from '@/lib/api-types'

/** Retain a failed request's identity/time for an unchanged explicit retry. */
export function useWalkMutation() {
    const pending = useRef(new Map<string, { key: string; body: Record<string, unknown> }>())
    return useCallback(async (init: { method: string; body: string }) => {
        const draft = JSON.parse(init.body) as Record<string, unknown>
        const scope = `${init.method}:${draft.walkId ?? 'create'}`
        const key = JSON.stringify(draft)
        let request = pending.current.get(scope)
        if (!request || request.key !== key) {
            const body = { ...draft, requestId: crypto.randomUUID() }
            delete (body as Record<string, unknown>).draftId
            request = { key, body }
            if (init.method === 'POST' && !draft.createdAt) request.body.createdAt = new Date().toISOString()
            pending.current.set(scope, request)
        }
        const response = await apiFetch<WalkMutationResponse | null>('/api/walks', { ...init, body: JSON.stringify(request.body) })
        pending.current.delete(scope)
        return response
    }, [])
}
