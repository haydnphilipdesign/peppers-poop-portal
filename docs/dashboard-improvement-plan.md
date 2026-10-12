# Pepper's Portal improvement plan

Created: October 12, 2026

Audience: Chris and Debbie, primarily using the app on mobile devices

Status: Phase 1 implemented and verified locally on October 12, 2026; later phases remain proposed

## Goal and constraints

Make Pepper's Portal reliable, predictable, and exceptionally easy to operate. Prioritize accurate care information, understandable feedback, and large controls. Preserve the app's warm visual identity, existing functionality, and public read-only view.

Favor targeted changes over rewrites. Reuse existing dependencies and primitives where practical. Explain material architecture changes, substantial layout changes, and database migrations before implementing them. Routine fixes and proportionate tests can proceed without repeated confirmation.

This plan records all recommendations from the dashboard review. Findings describe the source reviewed at the time; revalidate them against the current checkout before changing code. Design proposals and optional features require evaluation rather than automatic implementation.

## Completed baseline

Commit `dbc370ab2f9eeb83683ea77492237ab3e84545af`, pushed to `main`, implemented:

- A permanently mounted Log Walk action above asynchronous dashboard content.
- A PIN drawer and reserved header space so editing access and the champion badge do not move the action.
- Sized loading placeholders and explicit empty/error states for Latest Walk and today's totals.
- Existing walk data retained during refresh, with retry controls and protection against outdated responses.
- Five independent dashboard reads started in parallel, removal of the duplicate walk refresh after writes, and deferred History/Analytics loading.
- Walk-save failures kept visible in the drawer, duplicate-tap protection, earlier-time reset/validation, and reduced-motion support for confetti.
- Improved control sizes, labels, focus return, visible edit controls, and routine/reminder error feedback.
- Four data-lifecycle regression tests and fixes to existing test typing.

Verification at that point: 23 tests passed; TypeScript, lint, and production build passed. Fixture-driven Chromium checks covered 320, 390, 768, and 1280px widths, loading/empty/error states, retries, dark mode, editing access, and the public view. Log Walk movement during the mobile loading reproduction was reduced from approximately 674px to 0px. Local Supabase configuration contained a placeholder URL, so live persistence and physical-device Safari were not verified.

Keep those improvements intact throughout this roadmap. Cached or background-refresh data must not reintroduce disappearing cards or move the primary action.

## Recommendation inventory

| ID | Recommendation | Priority | Nature |
| --- | --- | --- | --- |
| R1 | Consistent save results and cross-screen updates | High | Confirmed implementation gaps |
| R2 | Shared request caching and request deduplication | High | Architecture improvement to evaluate |
| R3 | Separate walk-data availability from leaderboard failures | High | Confirmed coupling |
| R4 | Refresh on foreground return and calendar boundaries | High | Freshness improvement |
| R5 | Give each walk an explicit identity | High | Confirmed correctness concern; migration required |
| R6 | Compact, task-focused daily information hierarchy | Medium | UX proposal to preview |
| R7 | Protection against accidental deletion | Medium | Interaction improvement |
| R8 | Simpler routine attribution | Medium | UX proposal to validate |
| R9 | Clear connection, freshness, and save feedback | High | Reliability and UX improvement |
| R10 | Accessibility and usability on the family's actual devices | High | Validation and targeted fixes |

## Phase 1: Reliable saves and consistent care state

Start here. Address R1 and the directly related parts of R9 with small changes and behavioral tests. Prepare an early design note for R5 because it concerns data accuracy, even if migration implementation happens later.

### Work

- Audit History, routines, reminders, and walk editing/deletion for failed writes that resolve as if they succeeded. Several hooks currently catch errors without propagating a failure result to callers.
- Establish a consistent write-result contract. Forms should close or clear only after the write succeeds; failed submissions should retain useful input and offer a clear next action.
- Keep write failure distinct from a successful write followed by a failed read. The latter should report that the save succeeded and the display needs refreshing, without encouraging another write.
- Synchronize Today after routine changes made in History. `useActivities` currently does not subscribe to the general `ppp:data-changed` event, while History dispatches it after changes.
- Check all affected views after updates and deletions, including already-visited hidden tabs. Refresh the relevant data once rather than combining a local refetch with a second identical event-driven refetch.
- Extend duplicate-submission protection where needed. Provide clear pending feedback and avoid showing an optimistic change as permanently saved before acknowledgement.
- Review editing-session expiration. A rejected write should provide an understandable route to unlocking editing again while preserving the user's intended entry where practical.

### Acceptance checks

- A rejected write leaves the relevant form available with useful input and a clear error; it produces no success message or celebration.
- Rapid taps do not create duplicate writes.
- A routine edited in History is reflected in Today without a page reload.
- A successful write followed by a failed refresh is clearly distinguished from a failed write.
- Loading and error feedback remain understandable in both editable and read-only modes.

### Relevant source

`hooks/use-history.ts`, `hooks/use-activities.ts`, `hooks/use-reminders.ts`, `hooks/use-write-access.ts`, `components/history-view.tsx`, `components/daily-routines.tsx`, `components/reminder-manager.tsx`, `components/reminders-banner.tsx`, and `components/walk-history.tsx`.

## Phase 1 delivery — October 12, 2026

R1 is complete for the current frontend/API contract. The save-feedback parts of R9 are complete; connection/freshness work remains in Phase 2. R2 and R5 have design recommendations below, with no shared store or database migration implemented.

### Changes and decisions

- All History walk/routine mutations, Today routine logging, and reminder log/schedule/complete operations now use the existing walk-save contract: `Promise<void>` resolves only after an acknowledged API write and rejects on write failure. Components catch rejection, retain drafts, and show an error beside the affected action. Forms reset/close and success feedback appear only after acknowledgement.
- Removed optimistic routine/reminder completion. Pending feedback identifies the save in progress; a synchronous ref guard prevents rapid taps before React has rendered disabled controls. Pending inputs and conflicting actions are disabled. There is no offline write queue.
- Each successful mutation emits the existing change event(s). Every mounted consumer refreshes once through its listener; the originating hook no longer combines a local read with an event-driven duplicate. Today routines now subscribe to `ppp:data-changed`, so History additions, attribution changes, and removals update Today without reloading. Reminder consumers refresh through `ppp:reminders-changed`; dashboard scores, History, champion, and visited Analytics refresh through the general event.
- A failed post-save read is a read error, not a rejected save: feedback explicitly says the change saved, asks for a read refresh, and says not to save again. The last successful snapshot stays available in History, routines, reminders, and the existing dashboard. Editing stale records waits for a successful read, preventing repeated changes against an old snapshot. History and Analytics have explicit read-retry controls.
- Request sequence guards protect History, activities, reminders, and Analytics from older responses. History publishes a snapshot only under the date it belongs to; an unavailable day is not presented as an empty day or relabeled with the prior day's records. Same-day background refresh retains the mounted forms and records.
- Care-write HTTP 401 responses invalidate editing access, explain that editing locked, and provide the existing PIN drawer from local save feedback. Draft state survives unlocking; feedback then confirms editing is unlocked and asks for an explicit save retry. The public view remains read-only. Foreground/session-status refresh is still Phase 2 work.
- Kept the stable Log Walk location and visual identity. Enlarged/named affected controls, exposed selected outcomes/people with pressed state, kept pending person buttons named, and allowed expanded History/care forms to wrap on small screens. This is a targeted usability pass, not the proposed daily-layout redesign.

### Acceptance evidence

| Check | Evidence |
| --- | --- |
| Rejected writes retain useful input and show no success | Hook tests cover all ten affected write paths. Component regressions cover failed History create/edit/delete/routine attribution and failed vet scheduling/retry. Chromium exercises failed walk, routine, schedule, and banner-completion submissions. |
| Rapid taps create one write | Synchronous duplicate-tap component regressions for History and Care Schedule; intercepted browser request counts for History Save Walk and the main Log Walk drawer. |
| History routines reach Today | Hook tests assert one activity read per mounted consumer after edits/removals; browser checks create, reassign, and remove today's routine in History and inspect the already mounted Today tab. |
| Saved write / failed refresh are distinct | Hook tests cover History, Today routines, and reminders; browser checks History walk edits and reminder scheduling with successful write responses followed by failed reads, then read recovery. |
| Loading/errors work in editable and read-only modes | Browser checks initial loading, empty data, unavailable reads, retries, stale snapshot retention, locked editing, public Today/History, and 401 recovery. Initial History failure does not show a false empty-day summary. |

Validation: **47 tests passed** (24 added to the 23-test baseline); `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` passed. Existing domain-metrics coverage remains approximately 86.9% of statements; coverage configuration is scoped to metrics, so that percentage does not describe UI coverage.

Browser evidence: Browser plugin unavailable; Playwright used an existing Chromium installation without adding project dependencies. Local Next.js app at `http://127.0.0.1:3000`, Chromium, 320×844, 390×844, and 1280×844 simulated viewports, America/New_York timezone, reduced motion. Intercepted Supabase reads and API writes provided deterministic loading, HTTP 401/500/503, empty, pending, and saved-then-read-failed states. The test process used a fixture URL/key in process environment only because `.env.local` contains a placeholder Supabase URL; the file was not changed. Log Walk's document position changed **0px** through the delayed mobile initial load. A previously visited Analytics tab showed the History walk change. Screenshots and DOM checks found no horizontal overflow in the exercised states, no framework overlay, and no application exceptions; failed-resource console messages corresponded to intentional intercepted errors.

Temporary browser script, screenshots, and results live outside the repository in `C:/Users/haydn/.codex/tmp/pepper-phase1-*`. No dependencies, database schema, deployment, or server write routes changed. These checks prove the rendered client handles simulated responses; they do **not** verify live Supabase persistence, cross-device updates, physical phones, Safari/home-screen behavior, a screen reader, or system text enlargement. A transport failure after a server commit remains ambiguous until data is read again; durable request idempotency is a future API/data-model decision, not a claim made by this frontend contract.

## Early design recommendations (proposals only)

### Shared data ownership — R2 / Phase 2

Use a small care-data provider for reusable resource snapshots before adding a cache library. The reminder collection is the best first owner: banner, schedule, and monthly scoring need the same public rows. Today/History activities can share identical date-scoped requests. Keep walk reads independent from leaderboard inputs so a scoring failure cannot hide available care records (R3).

Define keys by resource and exact scope: all reminders; activity or log ranges with start/end ISO timestamps and calendar timezone. Different day/month/last-30-day queries must not reuse an incompatible response. Each entry should own its snapshot, in-flight promise, last successful read time, read error, and request generation. Consumers subscribe; mutations invalidate the affected entries once. Keep write errors local to the draft. Preserve successful snapshots during background reads, share identical in-flight reads, ignore superseded responses, and clean up subscriptions. Do not make a general cache framework or persistent offline queue for this small app.

Refresh on foreground return and day/month rollover; recheck calendar boundaries on return because background timers can stop. The current code follows device-local days. Confirm whether the family wants a fixed household timezone before changing that rule. Review the provider's ownership/invalidation rules before implementation. Phase 1 still makes two reminder reads for two consumers; eliminating that duplication is intentionally Phase 2.

### Explicit walk record — R5 / Phase 4

The concern is still present: adjacent outcome logs within 30 minutes are grouped without a shared identity or matching walker. Repeated adjacent gaps can even form a longer chain. Those inferred groups drive counts, points, attribution, edits, and deletions. Phase 1 does not change grouping or pretend historical identity is known.

Recommend a dedicated `walks` parent record with stable UUID, occurrence time, and walker, plus `logs.walk_id` for its bathroom outcomes. One server transaction creates/updates the parent and its outcomes; editing/removal targets the walk UUID. The parent owns time/person, while each outcome belongs to exactly one parent. Keeping existing outcome rows allows a staged compatibility period for existing readers and outcome counts. Compare this with only adding a shared UUID to logs: that is smaller initially, but cannot represent an outing with no outcomes and leaves walk metadata repeated. The parent model is a better long-term boundary. Whether to expose Neither, and how it scores, still needs the family's decision.

Before implementation, present the schema/API/type/metrics changes together and agree how ambiguous historical groups will be labeled and counted. Do not silently treat the current 30-minute inference as a certain reconstruction. Produce a backfill preview with mixed-walker/close-outing ambiguities and compare totals/points with the baseline; retain original rows and an auditable mapping. Choose preservation/review rules explicitly before converting ambiguous history.

Stage the migration: backup/export and count verification; additive parent/FK/provenance fields; compatible RPCs that create stable IDs atomically; previewed/reviewed backfill; coordinated reads, History, Analytics, metrics, and identity-based mutations; then constraints/legacy cleanup after verification. Preserve public-read/PIN-protected-write permissions, timestamps, outcomes, and original records. Verify same-time/nearby separate walks and scoped edit/delete behavior. Keep an export and compatibility release for recovery. Consider using a client request UUID as an idempotency key so a lost write response can be retried safely. No live migration should accompany an incidental frontend release.

## Phase 2: Shared data, independent failures, and freshness

Address R2, R3, R4, and the remaining data-related parts of R9. Explain the proposed ownership and refresh rules before adopting a shared-data architecture.

### Shared request caching, in plain terms

Store a shared snapshot of fetched data so components needing the same records can reuse it. If a request is already running, they share that request too. After a relevant change, update or invalidate the shared snapshot so affected components receive consistent information.

For example, RemindersBanner and ReminderManager currently each fetch reminders, and dashboard scoring also reads reminders separately. A shared reminders snapshot could support those views with fewer requests. Exact duplicates can share requests; differently filtered queries must not accidentally share the wrong result.

This is initially an in-memory data-sharing improvement. It does not imply persistent offline storage, a server cache, or a new dependency. Evaluate whether a small React data provider is sufficient before selecting an additional library or creating a general-purpose cache framework.

### Work

- Map existing reads, overlapping data, event subscriptions, and mutations. Define query keys or ownership by resource, date range, and any relevant scope.
- Share identical in-flight requests and reusable results. Define freshness, invalidation, error, and cleanup behavior explicitly.
- Preserve usable data while background requests run. Failed refreshes should mark it as potentially outdated rather than replace it with empty records.
- Separate essential walk reads and their errors from monthly activities, reminder scoring, and champion/leaderboard reads. Currently, a failure in any of the five dashboard reads can prevent otherwise available walk data from being published.
- Refresh care data when the page returns to the foreground. Account for changes made on another family member's device through that refresh path; evaluate live subscriptions only if foreground refresh proves insufficient.
- Recompute day- and month-scoped queries across midnight and month rollover. Recheck on foreground return in case background timers were suspended.
- Decide and document whether the family calendar follows the device timezone or a fixed household timezone. Verify daylight-saving and date-boundary behavior.
- Refresh editing access when appropriate so a long-lived screen does not indefinitely present an expired editing state.
- Use plain feedback for offline/unavailable reads and stale data. Avoid claiming a connection diagnosis unless the app can actually establish it.

### Acceptance checks

- Two consumers requesting identical reminders share one in-flight read and a consistent snapshot.
- A reminder mutation updates both the banner and schedule; relevant scoring refreshes appropriately.
- A leaderboard failure does not hide available walk records or totals.
- Returning after another device's update refreshes the displayed care state.
- An app left open across midnight shows the correct new day's totals and routines; month-specific views also roll over correctly.
- Late responses cannot overwrite newer data, and listeners/timers clean up correctly.
- Log Walk remains in the same position throughout these transitions.

### Relevant source

`components/dashboard.tsx`, `components/public-dashboard.tsx`, `hooks/use-logs.ts`, `hooks/use-activities.ts`, `hooks/use-reminders.ts`, `hooks/use-history.ts`, `hooks/use-champion.ts`, and `lib/api-client.ts`.

## Phase 3: Simpler daily interactions and information hierarchy

Address R6, R7, and R8. Produce a mobile preview or a concrete layout proposal before substantial rearrangement. Validate the choices with the family rather than assuming fewer taps always means a better experience.

### Work

- Keep Log Walk immediately accessible and stable. Keep Latest Walk easy to find.
- Explore placing due care and daily routines ahead of a potentially long walk history.
- Explore a more compact totals presentation, with leaderboard/gamification taking less space in the main care flow. Retain access to existing information.
- Preserve layout stability when alerts load. Design loading/reserved-space behavior alongside the proposed order.
- Clarify the selected person and editing state. Evaluate reducing the prominence of infrequent actions such as switching profiles or locking editing, while keeping them easy to locate.
- Explore defaulting routine attribution to the selected person, with a clear way to choose someone else. Preserve logging on another family member's behalf.
- Add a clear deletion confirmation or design a genuine undo. Evaluate confirmations first if they can address the risk with less complexity. Any undo must actually restore the saved data correctly.
- Review wording, spacing, tap targets, and scrolling across expanded Care Schedule and History forms, not just the dashboard's first viewport.

### Acceptance checks

- Parents can identify the last walk, log a new walk, and find due care without instructions.
- Routine attribution remains obvious and easy to correct.
- An accidental delete tap does not silently remove a record without prevention or recovery.
- All existing care, history, and analytics functionality remains reachable.
- Long histories, due alerts, large text, and expanded forms do not cause clipping or unexpected movement of primary controls.

## Phase 4: Accurate walk records and an optional Neither outcome

Implement R5 only after presenting the data-model proposal, migration strategy, and compatibility implications. Begin investigating the issue in Phase 1; it is a correctness concern, not cosmetic backlog.

### Confirmed concern

`groupLogsIntoWalks` currently groups adjacent bathroom logs when they are within 30 minutes. It does not require the same walker or an explicit shared walk ID. Two separate outings, including outings by different people, can therefore become one inferred walk. Grouped records drive attribution, totals, points, editing, and deletion.

### Work

- Define an explicit identity for each outing. Compare a dedicated walk record with adding a shared walk identifier to outcome records; choose the smallest model that supports the required behavior reliably.
- Preserve timestamps, walkers, outcomes, historical records, points, and public-read/PIN-protected-write behavior.
- Plan how ambiguous historical groups will be handled. Existing timestamps alone cannot reliably reconstruct every original outing, so document uncertainty rather than silently inventing certainty.
- Update relevant API routes, RPCs, types, metrics, history, analytics, and editing/deletion behavior together.
- Include a staged migration, backup/verification approach, and recovery plan. Do not apply a live database migration as an incidental part of a frontend change.
- Ask whether the family wants to track outings where Pepper does neither. If requested, add a clearly labeled Neither outcome. Current validation and storage require poop or pee, so this needs coordinated data and UI changes.
- Decide how any new outcome affects goals, counts, and points before implementing it.

### Acceptance checks

- Two outings within 30 minutes remain separate.
- Different walkers' outings retain correct attribution.
- Poop and pee from one outing remain associated with that outing.
- Editing or deleting an outing affects only that outing.
- Existing records remain available and scoring changes are explained and verified.
- If Neither is approved, it creates a valid outing without inventing a bathroom event.

### Relevant source

`lib/domain/metrics.ts`, `lib/database.types.ts`, `lib/schemas.ts`, `app/api/walks/route.ts`, `supabase-schema.sql`, and all walk/history/analytics consumers.

## Phase 5: Actual-device accessibility and family usability

R10 applies throughout every phase, with a dedicated final pass.

### Work

- Identify Chris and Debbie's actual devices, browsers, system-text settings, and whether they open the app from a home-screen shortcut.
- Test Safari and the installed/home-screen experience where used, along with a representative Android/Chromium device if relevant.
- Check larger system text and 200% text/zoom, readable contrast, screen-reader names and announcements, keyboard focus, reduced motion, and large tap targets.
- Exercise PIN entry, earlier-time selection, expanded forms, the on-screen keyboard, safe areas, and scrolling in drawers.
- Observe ordinary tasks: log a walk, record a routine, review the last walk, correct a mistake, and recover from a failed save. Include one-handed use where practical.
- Fix specific observed friction, then repeat the affected tasks. Record actual-device evidence separately from simulated viewport checks.

### Acceptance checks

- Important controls remain usable at enlarged text sizes without horizontal scrolling or clipped content.
- Drawers and forms remain operable with the keyboard visible.
- Screen-reader and keyboard users can understand controls, save results, errors, and editing state.
- Parents complete common tasks with minimal explanation and understand whether their changes were saved.

## Validation and delivery for every phase

1. Inspect the current source and establish a reproducible signal for each confirmed issue.
2. Implement one coherent batch at a time. Add regression tests for meaningful behavior rather than tests that merely mirror implementation.
3. Run `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` as appropriate to the changed code.
4. Verify rendered behavior on small mobile and desktop viewports. Cover initial loading, empty data, partial failures, stale-data refresh, failed writes, editing-access changes, and public read-only behavior where affected.
5. Use intercepted responses for deterministic slow/error cases. Clearly distinguish fixture verification from real API persistence and actual-device testing.
6. Review the final diff for unrelated changes, misleading status messages, duplicate requests, and functionality regressions.
7. Update this plan with completed IDs, evidence, remaining work, and any decisions that changed the proposed approach.
8. Report the result and limitations. Keep deployment and database migration decisions explicit.

## Deferred options

- Persistent offline saving: first establish dependable online feedback. Offline writes need conflict handling, duplicate prevention, replay ordering, and clear queued-versus-saved status; implement only if the family's usage warrants it.
- Live subscriptions: consider only if foreground refresh does not deliver adequate cross-device freshness.
- Additional cache libraries or broad rewrites: justify them against this small app's actual requirements before adoption.

## Recommended next scope

Proceed with Phase 2: agree shared ownership/refresh rules, separate walk availability from scoring errors, then share reminder/day-scoped reads and add foreground/calendar-boundary refresh. Carry the walk-identity proposal to a concrete migration/backfill review before Phase 3 layout work. Arrange real-device/live-persistence validation alongside that work; the Phase 1 simulated browser evidence cannot replace it.
