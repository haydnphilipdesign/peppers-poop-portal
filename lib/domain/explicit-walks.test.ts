import { describe, expect, it } from 'vitest'
import { calculateMonthlyPoints, calculatePoopStreak, calculateWalkerStats, determineMonthlyChampion, recordsToWalks, walkOutcomeLabel } from './metrics'
import { isUnchangedWalk } from '@/components/delete-confirmation'
import type { WalkRecord } from '@/lib/database.types'

const parent = (id: string, user: WalkRecord['user_name'], types: ('poop' | 'pee')[], time = new Date().toISOString()): WalkRecord => ({
    id, user_name: user, created_at: time, revision: 1, provenance: 'explicit', deleted_at: null,
    logs: types.map(type => ({ id: `${id}-${type}`, type, created_at: time, user_name: user, notes: null, walk_id: id })),
})
describe('explicit walk metrics', () => {
    it('keeps simultaneous and adjacent outings separate, including different walkers and Neither', () => {
        const time = new Date().toISOString()
        const records = [parent('a','Chris',['poop','pee'],time),parent('b','Debbie',[],time),parent('c','Chris',['pee'],new Date(Date.parse(time)+60_000).toISOString())]
        const walks = recordsToWalks(records)
        expect(walks.map(w=>w.id)).toEqual(['a','b','c'])
        expect(walkOutcomeLabel(walks[1])).toBe('Neither')
        const logs = records.flatMap(r=>r.logs)
        expect(calculateMonthlyPoints(logs,[],[],walks)).toEqual({ Chris: 10, Debbie: 5, Haydn: 0 })
        expect(calculateWalkerStats(logs,walks).Debbie).toEqual({ walks: 1, poops: 0, pees: 0 })
        expect(calculatePoopStreak(logs)).toBe(0)
        expect(determineMonthlyChampion(logs,[],[],walks)?.winners).toEqual(['Chris'])
    })
    it('Neither earns the same points/tiebreak and has no bathroom or streak contribution', () => {
        const records = [parent('a','Chris',[]),parent('b','Debbie',['poop','pee'])]
        const walks = recordsToWalks(records)
        const logs = records.flatMap(r=>r.logs)
        expect(determineMonthlyChampion(logs,[],[],walks)?.winners).toEqual(['Chris','Debbie'])
        expect(calculateWalkerStats(logs,walks).Chris).toEqual({ walks: 1, poops: 0, pees: 0 })
        expect(calculatePoopStreak([])).toBe(0)
    })
    it('keeps historical outcome attribution and excludes deleted parents', () => {
        const historical = { ...parent('a','Debbie',['poop','pee']), provenance: 'legacy_estimate' as const }
        historical.logs[0].user_name = 'Chris'
        const walks = recordsToWalks([historical,{ ...parent('b','Haydn',[]),deleted_at:new Date().toISOString() }])
        expect(walks).toHaveLength(1)
        expect(walks[0].provenance).toBe('legacy_estimate')
        expect(calculateWalkerStats(historical.logs,walks).Chris.poops).toBe(1)
        expect(calculateMonthlyPoints(historical.logs,[],[],walks).Debbie).toBe(5)
    })
    it('detects changed or replaced Neither targets even though their outcome arrays are empty', () => {
        const [walk] = recordsToWalks([parent('a','Chris',[])])
        expect(isUnchangedWalk(walk,{ ...walk })).toBe(true)
        for (const change of [{revision:2},{id:'b'},{userName:'Debbie' as const},{time:new Date(0)}]) {
            expect(isUnchangedWalk(walk,{...walk,...change})).toBe(false)
        }
    })
})
