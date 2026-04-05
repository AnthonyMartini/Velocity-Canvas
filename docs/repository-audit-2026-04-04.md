# Velocity Canvas Repository Audit

Date: 2026-04-04

This document explains the main bugs, performance issues, and bad practices I found during a code review of the repository.

Goal of this audit:
- explain each issue in simple language
- show why it matters
- propose a practical change

Notes from review:
- `npm run build` could not be fully verified in this environment because Next.js worker spawning failed with `spawn EPERM`
- `npm run lint` is not currently usable in automation because it opens the interactive ESLint setup wizard

## 1. Any signed-in user can give themselves 100 more credits

Files:
- `src/app/api/user/credits/route.ts`
- `src/PlansPage/index.tsx`

What is happening:
- The `POST /api/user/credits` route adds `100` credits to the current user with no payment check, no admin check, and no server-side feature flag.
- The Plans page also exposes a visible `Dev: +100 Credits` button to all signed-in users.

Why this matters:
- This completely breaks the billing model.
- Any user can repeatedly add credits for free.
- If this ships to production, users can bypass payment.

Evidence:
- `src/app/api/user/credits/route.ts:42` sets `const newCredits = currentCredits + 100;`
- `src/app/api/user/credits/route.ts:44` writes the new balance immediately
- `src/PlansPage/index.tsx:97-100` renders the dev credit button in the normal UI

Proposed change:
- Remove the public `POST /api/user/credits` route or lock it behind an admin-only check.
- Remove the dev credit button from the production UI.
- Replace this with a real purchase flow triggered only by confirmed payment or an internal admin tool.

## 2. Users are charged before the request is validated or succeeds

Files:
- `src/app/api/renderer-chat/route.tsx`
- `src/app/api/tweak-component/route.tsx`

What is happening:
- Both AI routes deduct credits before they check the request body and before they know whether the model response is valid JSON.

Why this matters:
- Users can lose credits for bad requests, model failures, parse errors, or temporary outages.
- This will create support issues and refund pressure.

Evidence:
- `src/app/api/renderer-chat/route.tsx:20` deducts credits
- `src/app/api/renderer-chat/route.tsx:30` only later checks `if (!message)`
- `src/app/api/tweak-component/route.tsx:20` deducts credits
- `src/app/api/tweak-component/route.tsx:30` only later checks `if (!prompt)`
- Both routes can still fail later on `generateContent` or `JSON.parse`

Proposed change:
- Validate the request first.
- Run the AI call next.
- Deduct credits only after the response is successfully parsed and accepted.
- If you need to reserve credits early, use a two-step flow: reserve first, finalize after success, release on failure.

## 3. Full-chat AI receives the wrong component coordinates and text

File:
- `src/app/api/renderer-chat/route.tsx`

What is happening:
- The prompt builder reads lowercase fields like `x`, `y`, `width`, `height`, and `text`.
- The canvas tree uses uppercase fields like `X`, `Y`, `Width`, `Height`, and `Text`.

Why this matters:
- The model is often told that components are at `0,0` with size `0x0`.
- Text labels are missing from context.
- This makes the AI worse at avoiding overlap, understanding layout, and editing the right component.

Evidence:
- `src/app/api/renderer-chat/route.tsx:39-40` uses `c.x`, `c.y`, `c.width`, `c.height`, `c.text`
- `src/schemas/button.json:43-45` shows the actual shape uses `Width`, `X`, `Y`
- `src/schemas/button.json:6` shows text is stored in `Text`

Proposed change:
- Normalize all component data before prompt creation.
- Read from the real internal fields: `X`, `Y`, `Width`, `Height`, `Text`.
- Better yet, build the AI context from a dedicated serializer instead of hand-reading fields inline.

## 4. Sign-in sends users to an invalid tab id

Files:
- `src/LandingPage/index.tsx`
- `src/app/page.tsx`

What is happening:
- The landing page calls `onStart('generator', user)`.
- The main app only knows tabs like `renderer`, `library`, `plans`, and `admin`.

Why this matters:
- After sign-in, the app can end up with `activeTab = 'generator'`.
- None of the main content panels match that tab id.
- This can leave the signed-in user on a blank screen.

Evidence:
- `src/LandingPage/index.tsx:38` and `src/LandingPage/index.tsx:54` call `onStart('generator', ...)`
- `src/app/page.tsx:43-44` defines the real tab ids
- `src/app/page.tsx:205-215` only renders content for `renderer`, `library`, `plans`, or `admin`

Proposed change:
- Change the landing page to call `onStart('renderer', user)`.
- Add a defensive fallback in the main page so unknown tab ids reset to `renderer`.

## 5. The documentation page will crash because it treats an object like an array

Files:
- `src/ComponentLibraryPage/index.tsx`
- `src/RendererPage/constants.tsx`

What is happening:
- The documentation page calls `SCHEMAS.map(...)`.
- `SCHEMAS` is an object, not an array.

Why this matters:
- The documentation tab can crash at runtime with `SCHEMAS.map is not a function`.

Evidence:
- `src/ComponentLibraryPage/index.tsx:49` uses `SCHEMAS.map(...)`
- `src/RendererPage/constants.tsx` exports `SCHEMAS` as an object keyed by component type

Proposed change:
- Convert the object to an array before rendering, for example with `Object.values(SCHEMAS)`.
- If you need stable ordering, define and use an explicit ordered list.

## 6. Project rename can fail silently and leave the UI lying to the user

File:
- `src/RendererPage/ProjectsDashboard.tsx`

What is happening:
- Rename is optimistic, which is fine, but the save request does not check `res.ok`.
- A server-side error can happen without throwing, so the UI may keep the new name even though the backend rejected it.

Why this matters:
- Users can think a rename worked when it did not.
- The next refresh can make names "jump back," which feels broken.

Evidence:
- `src/RendererPage/ProjectsDashboard.tsx:76` updates the UI optimistically
- `src/RendererPage/ProjectsDashboard.tsx:80-84` sends the save request
- There is no `res.ok` check before leaving the optimistic state in place

Proposed change:
- Read the response and check `res.ok`.
- Revert the optimistic update on any non-2xx response, not only on fetch/network exceptions.
- Show a visible error message when rename fails.

## 7. Full chat request cost grows with screen size because the entire screen is serialized every time

Files:
- `src/RendererPage/index.tsx`
- `src/app/api/renderer-chat/route.tsx`

What is happening:
- Full chat sends the active screen subtree and the last 10 chat messages every time.
- The server turns the whole component tree into a long prose block on every request.

Why this matters:
- Large screens will cost more and respond more slowly.
- This works directly against your credit-based pricing model.
- It will make full-page chat the most expensive feature to serve.

Evidence:
- `src/RendererPage/index.tsx:1758-1759` sends `chat_history` and `canvas_components`
- `src/app/api/renderer-chat/route.tsx:35-53` serializes the full canvas into `canvas_ctx`

Proposed change:
- Scope the context to the active task when possible.
- Send only nearby components for local edits.
- Summarize unchanged parts of the screen instead of dumping everything.
- Add hard limits for maximum components, prompt size, and image size before the model call.

## 8. Validation work scales badly because the whole app is revalidated on every tree change

Files:
- `src/RendererPage/index.tsx`
- `src/common/helpers.tsx`

What is happening:
- Every tree or variable change triggers `getAllAppErrors`.
- `getAllAppErrors` flattens the whole tree, walks every node, then walks every property on every node.

Why this matters:
- Small edits on large canvases can feel laggy.
- The cost grows as the canvas gets more complex.
- This will hurt the product exactly where power users need it most.

Evidence:
- `src/RendererPage/index.tsx:794-796` recomputes global errors from `tree` and `localVars`
- `src/common/helpers.tsx:407-443` validates the whole app

Proposed change:
- Revalidate only the changed node and its dependents where possible.
- Debounce validation during drag, resize, and rapid typing.
- Move heavy validation off the hot render path if the tree gets large.

## 9. Admin cost reporting can be wrong because the price table does not match the runtime model default

Files:
- `src/AdminPage/index.tsx`
- `src/lib/gemini.ts`

What is happening:
- The admin dashboard prices `gemini-3.1-flash-lite-preview` and `gemini-3.1-pro-preview`.
- The runtime model default is `gemini-2.0-flash-lite`.

Why this matters:
- Your estimated cost reporting can be misleading.
- That makes it harder to tune margins or trust usage analytics.

Evidence:
- `src/AdminPage/index.tsx:4-5` hardcodes 3.1 preview model names
- `src/lib/gemini.ts:53` defaults to `gemini-2.0-flash-lite`

Proposed change:
- Store model pricing in one shared server-side source of truth.
- Use the exact logged `modelName` values to look up prices.
- Fail loudly when a logged model has no matching price entry.

## 10. Activity history assumes every action costs exactly 1 credit

File:
- `src/PlansPage/index.tsx`

What is happening:
- The activity modal displays `Usage: -1 Credit` for every entry, even though the log model already stores `amount`.

Why this matters:
- This will be wrong the moment you introduce different prices for tweak vs full chat.
- It will confuse users and make billing less trustworthy.

Evidence:
- `src/PlansPage/index.tsx:196` hardcodes `Usage: -1 Credit`
- `src/app/api/user/activity/route.ts` already returns `amount`

Proposed change:
- Render the real `amount` from the activity log.
- Show positive amounts for top-ups and refunds, and negative amounts for AI usage.

## 11. Linting is not configured for automation

File:
- `package.json`

What is happening:
- The repo has a `lint` script, but running it opens Next.js's interactive ESLint setup instead of actually linting the project.

Why this matters:
- CI cannot enforce linting.
- Contributors get no consistent static analysis signal.
- Regressions will slip through more easily.

Evidence:
- `package.json:9` defines `next lint`
- Running `npm run lint` opens the ESLint configuration wizard instead of producing lint results

Proposed change:
- Add a committed ESLint config file.
- Make `npm run lint` non-interactive.
- Add lint to CI so obvious issues are caught before merge.

## Recommended Fix Order

Start here first:
1. Lock down free credit creation
2. Stop charging credits before successful AI completion
3. Fix the renderer-chat context serializer to use real component fields
4. Fix the sign-in tab bug
5. Fix the documentation page crash

Next wave:
6. Make rename error handling honest
7. Reduce full-chat context size and add budget caps
8. Improve validation performance
9. Fix cost reporting and activity log accuracy
10. Set up real linting

## Summary

The biggest risks are not cosmetic. They are:
- billing security
- billing fairness
- AI context quality
- a couple of user-facing runtime bugs

The good news is that the repo already has strong building blocks:
- a clear component schema system
- a formula parser and validator
- usage logging
- a good separation between tweak mode and full chat

With the fixes above, the product should become much safer to monetize and much more reliable for complex Power Apps editing workflows.
