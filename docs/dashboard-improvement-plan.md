# Pepper's Portal improvement plan

Created: October 12, 2026

Audience: Chris and Debbie, primarily using the app on mobile devices

Status: Phases 1–3 implemented and verified locally on October 12, 2026; Phase 4 remains a data-model/migration proposal and Phase 5 requires actual-device/family validation

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

## Early design recommendations

### Shared data ownership — R2 / Phase 2 (adopted)

The small in-memory care-data provider proposed in Phase 1 was explained before implementation and adopted in Phase 2. It shares reminder snapshots and identical date-scoped log/activity requests without adding a dependency. See **Phase 2 delivery** below for the final keys, freshness, invalidation, and cleanup rules. The device-local calendar rule is preserved; no fixed household timezone was introduced.

### Explicit walk record — R5 / Phase 4

The concern is still present: adjacent outcome logs within 30 minutes are grouped without a shared identity or matching walker. Repeated adjacent gaps can even form a longer chain. Those inferred groups drive counts, points, attribution, edits, and deletions. Phase 1 does not change grouping or pretend historical identity is known.

Recommend a dedicated `walks` parent record with stable UUID, occurrence time, and walker, plus `logs.walk_id` for its bathroom outcomes. One server transaction creates/updates the parent and its outcomes; editing/removal targets the walk UUID. The parent owns time/person, while each outcome belongs to exactly one parent. Keeping existing outcome rows allows a staged compatibility period for existing readers and outcome counts. Compare this with only adding a shared UUID to logs: that is smaller initially, but cannot represent an outing with no outcomes and leaves walk metadata repeated. The parent model is a better long-term boundary. The user approved exposing Neither on October 12, 2026 for occasional outings without either bathroom outcome; its goals/counts/points behavior still needs to be specified in the Phase 4 proposal.

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

## Phase 2 delivery — October 12, 2026

R2 (shared reads), R3 (independent walk availability), R4 (foreground/calendar refresh), and the read-freshness portions of R9 are complete for the current client contract. Phase 1 write acknowledgement, retained drafts, duplicate-tap guards, post-save read guidance, and public read-only behavior remain intact. R5 remains a proposal: no walk identity, grouping, API write route, database schema, or migration was changed.

### Ownership and read map

`CareDataProvider` in the root layout owns a per-page `CareDataStore`, shared by the dashboard and lazily mounted/visited tabs. Hooks subscribe to resource snapshots; components retain their own forms and write errors. Server rendering does not share a global store between visitors.

| Resource / exact scope | Consumers |
| --- | --- |
| All reminders, descending due date | Banner, Care Schedule, current monthly scores, previous-month champion |
| Logs for a local day | Today totals/walk history; History when selecting the same day |
| Activities for a local day | Today routines; History when selecting the same day |
| Logs / activities for the current local month | Current leaderboard inputs |
| Logs / activities for the previous local month | Champion inputs |
| Logs from the start of 30 calendar days ago through the end of today | Latest Walk/streak and visited Analytics; aligns their previously overlapping windows |
| Logs / activities for another selected local day | History; separate entry for each exact range |

Keys contain the table, exact start/end ISO timestamps (or no bounds for all reminders), device timezone, and consistent descending ordering. Month, day, and recent queries cannot substitute for one another. Each entry holds data, pending state, error/save-refresh context, last successful read time, generation, in-flight promise, and subscribers.

### Refresh and failure rules

- Initial or stale mounts read the resource; identical concurrent reads and concurrent manual retries share the same in-flight request. A newly mounted consumer reuses a successful snapshot younger than 60 seconds. Reusing a snapshot is an in-memory read optimization, not a freshness guarantee across devices. Inactive snapshots are pruned during unsubscribe when the cache exceeds 32 entries; active snapshots, including already visited hidden tabs, remain subscribed.
- Successful writes keep the existing events. The single provider invalidates log/activity entries on `ppp:data-changed`, and reminder entries on `ppp:reminders-changed`. Reminder writes emit both events, so rows refresh once and scoring recomputes from the same reminder snapshot. General events conservatively refresh all active log/activity scopes, since existing events do not carry mutation dates. Inactive entries are marked stale for their next mount. Rejected writes emit no invalidation and retain the Phase 1 local error/draft behavior.
- Invalidation after a write or foreground return supersedes an unfinished older read. Per-entry generations ignore old responses. Manual retries share an already-running request. Errors keep successful snapshots and their original scope; a failed new-day read cannot present yesterday's totals as today's data. Successful writes remain successful if the ensuing read fails; save-specific guidance continues to say not to save again.
- Today logs, recent logs (Latest Walk), and monthly scoring inputs publish independently. Neither slow/unavailable reminders nor monthly activities/champion inputs can hold successful walk data behind a combined request. Latest Walk, today's walk availability, and leaderboard errors have separate visible refresh controls. Loaded leaderboard/cards remain mounted during same-scope background reads; initial unavailable scores are not shown as zero rankings. The noncritical champion retains available same-scope inputs and cannot overwrite the new month's crown with an old request.
- Visible `visibilitychange`, window focus, and reconnect (`online`) signals coalesce over 50ms into an active-resource refresh. The same pass recomputes calendar scopes and emits a foreground signal to editing access. No connection diagnosis or offline-save claim is inferred from a failed read.
- Calendar checks run at the next local midnight, capped at one minute to detect clock/timezone changes. On day, month, timezone, or offset changes, consumers select new exact scopes; reminder due logic and History's `isToday` also recompute. Foreground return checks immediately after the coalescing interval, even if background timers were suspended. History retains its explicitly selected date. Latest Walk's day label updates immediately on the calendar render and its elapsed-time display still ticks each minute.
- **Calendar decision:** preserve device-local dates, matching existing behavior. Local calendar arithmetic handles 23/25-hour daylight-saving days. A fixed household timezone remains a future family/product decision; different device timezones can still have different definitions of Today.
- Editing status refreshes on foreground return and every five visible minutes with `cache: no-store`. Generations prevent a late status response from undoing a newer unlock/lock or HTTP 401 expiration. Foreground checks wait while an access mutation is pending. Expiration preserves the existing explicit PIN-unlock-and-retry flow.
- Provider cleanup removes events/timers, unsubscribes consumers, and invalidates pending generations. The transports may finish, but their obsolete results cannot publish. The periodic access and Latest Walk timers also clean up. There is no persistent offline cache, queued write, live subscription, or new dependency.

### Acceptance evidence

| Check | Evidence |
| --- | --- |
| Identical reminder consumers share rows and reads | Hook regression mounts banner, schedule, scores, and champion behind one delayed request; both reminder views receive the same snapshot. Chromium observes one initial reminder request. Concurrent retry regression proves one read recovers both consumers. |
| Reminder saves update both views and scoring | Phase 1 pending/rejected-write regressions remain; the shared write test asserts one reminder read and current-score update. A backdated-completion regression recalculates the prior month's champion. Browser scheduling/banner completion and saved-then-read-failed recovery update both views through the shared owner. |
| Scoring failure does not hide walks | Hook tests cover failed reminders/monthly activities and stalled/failed monthly/recent log reads while Today succeeds. Browser checks an unavailable reminder/leaderboard with available Latest Walk, totals, and editable walk history. |
| Foreground return refreshes care and editing status | Hook/browser fixtures simulate another device's changed rows, exercise visibility/focus signals, and inspect Today plus previously visited History/Analytics. Access changes to locked; one coalesced reminder read is observed. |
| Day/month rollover and DST | Fake-clock hook/browser tests cross October 31 into November 1, inspect new-day totals/routines, new-month scores/champion, Analytics, due reminders, and the retained History selection. Suspended-clock foreground recovery advances into another day/month. Dedicated date tests and intercepted browser URLs verify New York's 23-hour spring and 25-hour fall day ranges, plus device-timezone scope isolation. |
| Late responses / cleanup | Shared store tests and retained Phase 1 regressions reject superseded reads, protect exact date scopes, retain snapshots on unavailable reads, and prove timers/events stop after unmount. Access regression prevents a late pre-expiry response from re-unlocking editing. |
| Stable action, mobile/save/public behavior | Chromium measured **0px** Log Walk document-position movement during delayed initial loading, foreground refresh/access locking, and month rollover. The repeated Phase 1 browser suite verifies failed walk/routine/reminder writes, retained earlier-time drafts, rapid taps, HTTP 401 unlock, acknowledged-save/failed-read recovery, visited tabs, and public Today/History at 320/390/1280px. |

Validation: **65 tests passed** (18 added to the 47-test Phase 1 suite); `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` passed. Domain-metrics statement coverage is approximately 99.1%; coverage configuration still measures metrics only, not overall client/UI coverage. No production scoring/grouping rules were altered by the additional tests.

Browser evidence: Browser plugin unavailable; temporary Playwright script reused the existing Chromium installation without installing dependencies. The production build ran at `http://127.0.0.1:3000` with 320×844, 390×844, and 1280×844 simulated viewports, America/New_York timezone, and reduced motion. Supabase reads/API writes were intercepted to verify initial loading/empty/unavailable states, independent scoring failure, stale data, successful retry, write 401/500, read 503, pending saves, foreground events, and browser-clock boundaries. Screenshots and DOM checks found no horizontal overflow in exercised states, no framework overlay, and no application exceptions; failed-resource console messages corresponded to intentional fixture failures. Screenshot review caught and fixed a briefly incorrect Latest Walk “Today” label after midnight; the rollover regression now checks the previous day's explicit date.

Temporary browser scripts, results (17 scenario groups), and screenshots are outside the repository at `C:/Users/haydn/.codex/tmp/pepper-phase2-*`. The production build used a fixture Supabase URL/key in the build process environment only; `.env.local` was not changed. This verifies the rendered client and deterministic intercepted responses, not live persistence or actual cross-device networking. Physical phones, Safari/home-screen resume behavior, screen readers, enlarged text, and live Supabase remain unverified. No deployment or migration was performed.

## Phase 3: Simpler daily interactions and information hierarchy

Address R6, R7, and R8. Produce a mobile preview or a concrete layout proposal before substantial rearrangement. Validate the choices with the family rather than assuming fewer taps always means a better experience.

### Work

- Keep Log Walk immediately accessible and stable. Keep Latest Walk easy to find.
- Explore placing due care and daily routines ahead of a potentially long walk history.
- Explore a more compact totals presentation, with leaderboard/gamification taking less space in the main care flow. Retain access to existing information.
- Preserve layout stability when alerts load. Design loading/reserved-space behavior alongside the proposed order.
- Clarify the selected person and editing state. **Header controls completed:** the family uses a persistent profile per phone and rarely locks editing or switches users. These controls now live in a collapsed Profile & access section in the footer; the header scrolls away. PIN unlock remains available directly through Log Walk and affected save feedback.
- Explore defaulting routine attribution to the selected person, with a clear way to choose someone else. Preserve logging on another family member's behalf.
- Add a clear deletion confirmation or design a genuine undo. Evaluate confirmations first if they can address the risk with less complexity. Any undo must actually restore the saved data correctly.
- Review wording, spacing, tap targets, and scrolling across expanded Care Schedule and History forms, not just the dashboard's first viewport.

### Acceptance checks

- Parents can identify the last walk, log a new walk, and find due care without instructions.
- Routine attribution remains obvious and easy to correct.
- An accidental delete tap does not silently remove a record without prevention or recovery.
- All existing care, history, and analytics functionality remains reachable.
- Long histories, due alerts, large text, and expanded forms do not cause clipping or unexpected movement of primary controls.

### Phase 3 targeted header improvement — October 12, 2026

The user confirmed that Lock Editing and Switch User are rarely needed because each family member uses their own phone. Moved both controls into a keyboard-operable, collapsed **Profile & access** section in the footer, retaining manual locking and profile changes. Removed the family dashboard header's sticky positioning and button row; the selected profile remains visible and asynchronous crown space remains reserved. Log Walk stays mounted above all asynchronous care sections and continues to open PIN unlocking when editing expires. This is a targeted change requested by the user, not completion of the broader Phase 3 hierarchy/deletion/attribution work.

Validation: the existing **65 tests**, TypeScript, lint, production build, and `git diff --check` passed. Fixture-driven Playwright/Chromium checks at 320, 390, and 1280px cover initial delayed reads with **0px** Log Walk movement, no header buttons, nonsticky scrolling, collapsed footer controls, keyboard expansion, manual lock, Log Walk PIN unlocking/focus return, failed-save retry, foreground expiration, profile switching/persistence, and the unchanged public read-only view. Rendered screenshots/DOM checks found no horizontal overflow or application exceptions in the exercised states. Browser plugin unavailable; reused the existing Chromium installation. Scripts/results/screenshots are outside the repository at `C:/Users/haydn/.codex/tmp/pepper-header-*` and `pepper-settings-*`. Reads and writes remain intercepted fixtures; live persistence and actual-device behavior remain unverified. No deployment or database changes were made.

## Phase 3 delivery — October 12, 2026

R6 (daily hierarchy), R7 (deletion prevention), and R8 (routine attribution) are implemented. R10 received further simulated-mobile/large-text checks; family observation, live persistence, and actual-device accessibility remain Phase 5 work. The checkout already contained Phase 1/2 and header improvements; those changes were preserved.

### Preview and final decisions

Before rearrangement, presented a concrete 390px HTML/screenshot proposal with example data and explained the section order and loading behavior. The user's final layout choice keeps **Today's walk log expanded below routines**. Care Schedule and Monthly leaderboard start collapsed. Preview/evidence files are outside the repository at `C:/Users/haydn/.codex/tmp/pepper-phase3-*`.

- Family Today now reads **Latest Walk → Due care → Daily Routines → compact totals → expanded Today's walk log → Care Schedule → collapsed Monthly leaderboard**. History and Analytics retain their tabs. The public view receives the same Today hierarchy and remains read-only; its existing public header is unchanged.
- The family header still scrolls away, with persistent selected profile, reserved champion space, and collapsed footer **Profile & access** controls. **Log Walk remains mounted above all asynchronous sections and tabs**, with direct PIN recovery, retained earlier-time drafts, save acknowledgement, and duplicate-tap protection. Its normal-size document position moved **0px** through tested loading, errors, refresh/access changes, and calendar rollover.
- Latest Walk retains elapsed/exact time, person, outcomes, due nudge, stale/loading/error feedback and retry in a smaller reserved card. Due care always has a labeled section with minimum loading/no-alert space. Multiple alerts and expanded forms can grow below the primary action; lower sections are not promised a fixed position for arbitrary alert heights. “No care alerts to show” does not claim every appointment is completed. Compact totals retain goals, goal acknowledgements, counts, and explicit loading/unavailable states. Leaderboard points/champions/explanation/retry remain accessible on expansion; its shared consumers stay mounted.
- Daily routines and missing History routines default to **Done by [selected profile]**. **Someone else** opens named choices without changing the device profile; Today explains that choosing saves. Completed History routines retain Change/reassignment/removal. The profile is the recorder, and the chosen person is the assignee. Pending actions use the existing synchronous guard, block conflicting taps, and close/reset only after acknowledgement. Failed forms/pickers survive read refresh and PIN recovery; retry remains explicit.
- Today/History walk deletion and History routine removal open a shared confirmation drawer naming date/time/person/outcomes or routine/date/assignee. It warns removal cannot be undone and initially focuses **Cancel**. No delete is sent before **Remove record**. Cancel/Escape returns focus; pending removal blocks dismissal and duplicate taps; rejected writes retain the target/error. Read refresh/locked editing blocks confirmation, and HTTP 401 PIN recovery retains the target. A changed/removed record in a new snapshot blocks removal and asks for a fresh selection; empty/replacement snapshots cannot silently revive an old delete. This client check does not add atomic server concurrency control. No optimistic deletion or undo is claimed.
- Expanded appointment/completion inputs now have visible labels, 16px text, available-width sizing, and wrapping person controls. History walk inputs/person groups fit narrow screens. Text buttons can grow/wrap; Log Walk keeps its normal 96px minimum and grows for enlarged text. Tabs can wrap to another row with existing keyboard navigation. Screenshot review prompted wrapping leaderboard/summary rows and a separate date-title row on narrow History screens.

### Acceptance evidence

| Check | Evidence |
| --- | --- |
| Daily care before long histories | Chromium verifies section order at 320/390/1280px and a due reminder with 12 expanded walks. Reviewed first viewport, full-page, expanded-form, confirmation, and dark screenshots. |
| Profile attribution and correction | New component tests cover one-tap selected profile, another-person rejection/retry, lock/unlock, and historical attribution. Browser checks recorder/assignee request bodies, named completion, pending controls, and Today/History synchronization. |
| Accidental deletion prevention | Component/browser checks cover Today/History confirmations, routine identity, Cancel without writes, Cancel focus/focus return, failed deletion, synchronous double taps, access/read blocking, and acknowledged removal. Browser additionally exercises confirmation-to-PIN recovery. |
| Existing functions remain reachable | Browser exercises walk create/edit/delete, earlier-time drafts, routine reassignment/removal, schedule/banner completion, visited Analytics, leaderboard expansion, footer lock/profile persistence, and public Today/History. |
| Phase 1/2 reliability preserved | Repeated browser contracts and retained hook tests cover shared reads, independent failures, rejected writes, saved-then-read-failed guidance, stale snapshots, foreground data/access refresh, midnight/month rollover, DST, and explicit PIN retry. |
| Small screens and larger text | Browser covers 320/390/1280px, expanded forms, long histories, dark mode, and simulated 200% text for Today/leaderboard/Care Schedule/History. Exercised states have no horizontal page overflow; screenshot review caught and fixed enlarged tabs, row clipping, and narrow form/date navigation issues. |

Validation: **73 tests passed** (eight added to the 65-test Phase 2/header baseline); `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` passed. Domain-metrics statement coverage remains approximately 99.1%, scoped to metrics rather than total UI coverage. No API write routes, shared store/hooks, dependencies, migrations, or scoring/grouping rules changed in this phase.

Browser environment: Browser plugin unavailable; temporary Playwright scripts reused existing Chromium at `http://127.0.0.1:3000`, America/New_York, reduced motion, 320×844 / 390×844 / 1280×844 viewports. Production build uses a fixture Supabase URL/key only in the build process environment; `.env.local` is unchanged. Reads/writes are intercepted fixtures. Page identity, meaningful content, framework-overlay absence, application-exception checks, responsive screenshots, and interactions pass. Intentional HTTP 401/500/503 failures produce expected resource-error console messages. Scripts/results/screenshots are `pepper-phase3-qa*`, `pepper-phase3-contract-*`, `pepper-phase3-extra*`, and repeated `pepper-header-*` outside the repository.

These checks verify client behavior, not live Supabase persistence or actual cross-device networking. Physical phones, Safari/home-screen resume, on-screen keyboards, screen readers, system text settings, and parents completing tasks without instructions remain unverified. Doubled browser text does not establish every OS/browser accessibility mode. Transport failure after server commit remains ambiguous; durable idempotency remains a Phase 4/API decision. Confirmations still operate on inferred walk groups: nearby outings/mixed walkers can remain grouped until explicit identity is implemented. No deployment or database changes occurred.

### Phase 4 boundary

Neither remains approved for occasional outings without bathroom outcomes. Necessary migrations remain authorized once concrete design, historical-data handling, verification, and recovery are presented. Phase 3 **does not expose Neither or execute migrations**. Retain the dedicated-walk-parent/additive-FK proposal, auditable mapping/backfill preview, count/point comparison, ambiguous-history review, atomic RPC permissions, and backup/compatibility recovery approach below. Present the specific schema/API release and goals/points behavior together before execution; timestamps cannot establish certain historical identity.

## Phase 4: Accurate walk records and a Neither outcome

Implement R5 only after presenting the data-model proposal, migration strategy, and compatibility implications. Begin investigating the issue in Phase 1; it is a correctness concern, not cosmetic backlog.

User decisions recorded October 12, 2026: Neither is approved for occasional outings where Pepper does not pee or poop. The user also authorizes applying database migrations if needed for the agreed implementation. Present the concrete schema/API changes, ambiguous-history backfill approach, verification, and recovery plan before execution. This authorization carries forward; no migration is required or applied during Phase 3 layout work.

### Confirmed concern

`groupLogsIntoWalks` currently groups adjacent bathroom logs when they are within 30 minutes. It does not require the same walker or an explicit shared walk ID. Two separate outings, including outings by different people, can therefore become one inferred walk. Grouped records drive attribution, totals, points, editing, and deletion.

### Work

- Define an explicit identity for each outing. Compare a dedicated walk record with adding a shared walk identifier to outcome records; choose the smallest model that supports the required behavior reliably.
- Preserve timestamps, walkers, outcomes, historical records, points, and public-read/PIN-protected-write behavior.
- Plan how ambiguous historical groups will be handled. Existing timestamps alone cannot reliably reconstruct every original outing, so document uncertainty rather than silently inventing certainty.
- Update relevant API routes, RPCs, types, metrics, history, analytics, and editing/deletion behavior together.
- Include a staged migration, backup/verification approach, and recovery plan. Do not apply a live database migration as an incidental part of a frontend change.
- Add the approved, clearly labeled Neither outcome for an outing with no poop or pee. Current validation and storage require poop or pee, so this needs coordinated data and UI changes.
- Decide how any new outcome affects goals, counts, and points before implementing it.

### Acceptance checks

- Two outings within 30 minutes remain separate.
- Different walkers' outings retain correct attribution.
- Poop and pee from one outing remain associated with that outing.
- Editing or deleting an outing affects only that outing.
- Existing records remain available and scoring changes are explained and verified.
- Neither creates a valid outing without inventing a bathroom event.

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

Phase 3 local implementation is complete. Gather family feedback on the expanded log below daily care and verify actual phones/live persistence in Phase 5. Next present the concrete Phase 4 explicit-walk/Neither schema, atomic API, goals/points, ambiguous-history/backfill preview, verification, and recovery design before using the existing migration authorization. Keep that data work separate from this frontend release.
