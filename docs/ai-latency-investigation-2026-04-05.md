# AI Latency Investigation

Date: 2026-04-05

## Goal

Reduce the response time of the AI features in Velocity Canvas, especially:

- the single-component tweak flow, which currently feels too slow at about 20 seconds
- the full canvas chat flow, which is expected to be slower but still needs guardrails

This document is based on local repo inspection plus current official Gemini and Vertex AI documentation.

## Short Answer

The main problem is not just the model choice.

The app is currently paying latency on every request from:

- large static system prompts
- large dynamic context payloads
- no response streaming
- no output token caps
- no token preflight budgeting
- no structured output schema enforcement
- recreating the Gemini client on every request

For the tweak route, the fastest wins are:

1. shrink the request payload a lot
2. switch to schema-based JSON output instead of prompt-only JSON instructions
3. set a hard `maxOutputTokens`
4. stream the response so the UI feels faster
5. add a deterministic fast path for simple tweak intents

If those are done well, you may not need a more expensive model just to make tweak mode feel good.

## What The Repo Is Doing Today

### Tweak route

Current flow in `src/app/api/tweak-component/route.tsx`:

- verifies auth
- deducts credits
- stringifies the full selected component with pretty-printed JSON
- prepends canvas size
- sends the whole thing with a large static system prompt
- waits for the full model response
- extracts JSON by searching for the first `{` and last `}`
- parses and post-processes the result

Important details:

- `JSON.stringify(component, null, 2)` is used, which adds whitespace and increases tokens
- the route does not set `maxOutputTokens`
- the route does not use `responseJsonSchema`
- the route does not stream

### Full chat route

Current flow in `src/app/api/renderer-chat/route.tsx`:

- verifies auth
- deducts credits
- serializes the active screen into a custom text description
- sends the last 10 chat messages
- optionally sends an image
- waits for the full model response
- extracts and parses JSON

Important details:

- the route sends the full active screen subtree every turn
- the route sends up to 10 prior messages every turn
- the route does not set `maxOutputTokens`
- the route does not use `responseJsonSchema`
- the route does not stream
- screenshot/image requests can become expensive quickly

### Shared Gemini wrapper

Current flow in `src/lib/gemini.ts`:

- creates a new `GoogleGenAI` client inside each `generateContent` call
- uses one model env var for all workloads
- sends very large system instructions from `src/lib/prompts.ts`

That means tweak and full chat are sharing the same model selection strategy even though they are very different latency and cost problems.

## Biggest Local Bottlenecks

### 1. The prompts are heavy

The static prompts in `src/lib/prompts.ts` are large:

- `TWEAK_SYSTEM_PROMPT` is about 2.6k characters
- `RENDERER_CHAT_SYSTEM_PROMPT` is about 10.5k characters

That is before the request-specific component JSON, canvas context, image input, and chat history are added.

Gemini token docs explicitly note that system instructions count toward total input tokens, so these prompts directly affect both cost and latency.

### 2. Tweak mode sends too much context for a small job

For a simple tweak, the route currently sends the full component object, pretty-printed, with every property and nested content that happens to be on the node.

For many tweak requests, the model does not need all of that. A request like:

`make this button blue`

does not need:

- every default prop
- every nested child field
- repeated formatting whitespace
- unrelated metadata

### 3. Full chat sends the whole screen every turn

The chat route rebuilds and resends screen context every message. That is normal for chat APIs, but it becomes expensive fast when:

- the canvas gets large
- the user uploads an image
- the chat history is long

There is also a quality bug here: the serializer uses lowercase fields like `x`, `y`, `width`, `height`, and `text`, while the actual component data mostly uses `X`, `Y`, `Width`, `Height`, and `Text`. That mismatch can cause lower quality outputs, more retries, and more wasted time.

### 4. The app waits for the entire answer before showing anything

The Gemini docs say standard `generateContent` waits for the full response, while streaming can return chunks as they are generated.

Even if true server time stayed similar, streaming would reduce perceived latency significantly.

### 5. The app relies on prompt discipline instead of a strict schema

The routes ask for JSON and then recover by manually slicing from the first `{` to the last `}`.

Gemini structured output docs support `responseJsonSchema`, which is a better fit here because:

- it reduces parse failures
- it reduces the need for long JSON-formatting instructions in the prompt
- it gives you more predictable output

### 6. The app is not budgeting tokens before the request

Gemini supports `countTokens`, but the app currently only logs usage after the call.

That means the system cannot reject or trim oversized requests before they become slow or expensive.

### 7. The Gemini client is recreated on every request

`src/lib/gemini.ts` creates a new `GoogleGenAI` client inside every model call.

This is probably not the main reason for a 20-second tweak, but it is avoidable overhead and should be cleaned up.

### 8. There is no timing instrumentation

Right now the app logs token usage, but not step-by-step latency.

Without timings, you cannot confidently answer:

- how much time is auth taking
- how much time is prompt building taking
- how much time is Gemini taking
- how much time is JSON parsing and post-processing taking
- whether image requests are the real outlier

## Recommended Plan

### Phase 1: Fastest Wins

These are the highest-impact, lowest-risk changes.

### 1. Add response streaming

Use Gemini streaming for both tweak and full chat.

Why:

- cuts perceived latency immediately
- lets the UI show progress sooner
- especially valuable for full chat

Expected impact:

- big improvement in perceived speed
- modest or no improvement in total backend time

Good fit for:

- chat first
- tweak second if you want faster visual feedback

### 2. Shrink tweak payloads aggressively

For tweak mode, stop sending the full pretty-printed component object.

Instead send:

- component `id`
- component `type`
- only editable props that are actually present
- parent container basics if layout matters
- a few nearby sibling style hints if needed
- canvas width and height

Do not send:

- default values that can be inferred
- large nested data that is unrelated to the tweak
- pretty-printed JSON with indentation

Why:

- smaller input means faster requests
- smaller context usually means better focus

This is likely the single most important real latency fix for tweak mode.

### 3. Set `maxOutputTokens`

Right now the routes do not constrain output size.

Add small output budgets:

- tweak route: low cap
- full chat route: moderate cap
- screenshot/page-build route: higher cap

Why:

- reduces worst-case latency
- reduces runaway responses
- gives predictable credit economics

Suggested starting point:

- tweak: 300-800 output tokens
- chat: 800-2000 output tokens

The exact number should be tuned from real usage logs.

### 4. Add `countTokens` preflight

Before calling the model:

- count the tokens for the full request
- reject or trim requests that exceed your target budget
- log the estimate by route type

Why:

- keeps large requests from becoming slow surprises
- enforces credit safety
- tells you which payload parts are actually expensive

### 5. Reuse one Gemini client per process

Move the `GoogleGenAI` client to a module-level singleton instead of constructing it inside every request call.

Why:

- low effort
- avoids repeated auth/client setup
- removes easy overhead

Expected impact:

- small by itself
- worth doing anyway

### Phase 2: Make Outputs Smaller And More Reliable

### 6. Replace prompt-only JSON rules with `responseJsonSchema`

Gemini structured output is a strong fit for this app.

Use it for:

- tweak response shape
- chat action/diff response shape

Why:

- lets you shorten the system prompt
- reduces parse failures
- reduces post-processing hacks
- gives the model a clearer target

Important note from Google docs:

- structured output guarantees syntactically valid JSON, but not semantically valid values
- you should still validate the result in app code

That matches your app well, because you already have schema and formula validation logic.

### 7. Return operations, not entire objects, when possible

For many tweak requests, you do not need the full modified component back.

A faster shape is something like:

- `setProps`
- `removeProps`
- `addChild`
- `removeChild`
- `reorder`

Why:

- smaller output
- easier validation
- lower token count
- easier undo/redo

For simple tweak mode, this can be much faster than regenerating a whole component object.

### 8. Split model selection by workload

Do not use one model choice for every route.

Better split:

- tweak route: fastest low-cost model
- full chat: better balanced model
- screenshot-heavy or complex redesigns: stronger model only when needed

That is a better fit than using a full agentic flow for every request.

### Phase 3: Product-Level Speedups

### 9. Add a deterministic fast path for common tweaks

For simple instructions, skip the model entirely.

Examples:

- change text
- change fill color
- make corners more rounded
- increase font size
- center align
- move left or right
- change icon

A lightweight classifier can decide whether a tweak is:

- deterministic
- AI-assisted

Why this matters:

- the fastest AI call is the one you do not make
- these simple edits should feel nearly instant
- this is the best path to making tweak mode feel premium

This is the one recommendation here that can turn a 20-second tweak into a sub-second action.

### 10. Treat screenshot chat as a separate class

Image requests should not share the same latency and budget assumptions as plain-text tweak requests.

If you keep screenshot support in the main chat route:

- downscale aggressively before sending
- apply a separate credit budget
- apply a separate token budget
- use lower media resolution if you adopt Gemini 3

Why:

- image tokens can increase latency quickly
- screenshot interpretation is a different workload from text-only editing

### Phase 4: Optional Model Upgrades

### 11. Use caching only where it makes sense

Prompt caching can help, but it is not the first fix I would make.

Good caching targets:

- large repeated system instructions
- stable schema descriptions
- static component/function catalogs

Bad caching target:

- highly dynamic canvas state

Notes from Google docs:

- Gemini supports explicit context caching on models like Gemini 2.0 Flash-Lite
- implicit caching is automatic on newer Gemini 2.5 models, but only after minimum token thresholds are met

So caching can help here, but only after you clean up prompt shape.

### 12. If you move to Gemini 2.5 or 3, control thinking for low-complexity tasks

On newer Gemini models:

- Gemini 2.5 Flash can use `thinkingBudget: 0` for lower latency
- Gemini 3 Flash can use lower `thinkingLevel`, and Google specifically recommends lower thinking levels for lower-latency responses

This matters if you later replace 2.0 Flash-Lite for tweak or chat.

For tweak requests, you usually do not need deep reasoning.

### 13. Provisioned throughput is only worth it after usage is stable

Vertex AI offers provisioned throughput for more predictable performance.

That is useful when:

- request volume is stable
- you need tighter latency predictability
- you already know your request patterns

It is not the first optimization to make here.

## Would An Agentic Flow Help?

For latency alone, not as the first move.

A planner model followed by an executor model can improve quality for large page edits, but it often makes tweak mode slower because it adds another round trip.

My recommendation:

- do not use a two-model pipeline for every tweak
- use a single fast model or deterministic fast path for tweaks
- reserve multi-step orchestration for expensive, higher-credit full-page jobs

Good use of an internal agentic flow:

- full-page redesign
- screenshot-to-canvas
- large multi-component changes
- retry/repair after validation failure

Bad use of an internal agentic flow:

- simple button restyle
- text change
- one-property edits

## Best Order To Implement

If the goal is to reduce real user wait time quickly, I would do the work in this order:

1. add timing instrumentation
2. shrink tweak payloads
3. add `maxOutputTokens`
4. add streaming
5. add `countTokens` preflight and request budgets
6. adopt `responseJsonSchema`
7. split model choice by route
8. add deterministic fast path for common tweaks
9. add caching if prompts are still large enough to benefit
10. only then consider a multi-step planner/executor flow for complex chat jobs

## Suggested Success Metrics

Track these separately for tweak and chat:

- p50 latency
- p95 latency
- time to first token
- total input tokens
- total output tokens
- cached input tokens
- parse failure rate
- validation failure rate
- retries per user-visible action
- average backend cost per request

For the tweak route, the target should be much more aggressive than today.

Good initial goals:

- p50 tweak latency under 5 seconds
- time to first token under 2 seconds
- simple deterministic tweaks under 1 second

## Concrete Recommendations For This Repo

### Highest priority

- stop pretty-printing tweak component JSON
- trim tweak payloads to only relevant props and nearby layout context
- add `maxOutputTokens`
- add streaming
- add end-to-end timing logs
- reuse a singleton Gemini client

### Next priority

- move to `responseJsonSchema`
- return diffs or operations instead of full objects where possible
- add `countTokens` preflight and hard request budgets
- separate image-heavy chat from normal chat

### Later

- add deterministic tweak commands for the top 10 or 20 simple edit intents
- add caching for stable repeated prompt prefixes
- use multi-step orchestration only for high-credit, high-complexity requests

## References

Official Google sources used:

- Gemini token counting: [https://ai.google.dev/gemini-api/docs/tokens](https://ai.google.dev/gemini-api/docs/tokens)
- Gemini structured output: [https://ai.google.dev/gemini-api/docs/structured-output](https://ai.google.dev/gemini-api/docs/structured-output)
- Gemini context caching: [https://ai.google.dev/gemini-api/docs/caching](https://ai.google.dev/gemini-api/docs/caching)
- Gemini text generation and streaming: [https://ai.google.dev/gemini-api/docs/text-generation](https://ai.google.dev/gemini-api/docs/text-generation)
- Gemini thinking controls: [https://ai.google.dev/gemini-api/docs/thinking](https://ai.google.dev/gemini-api/docs/thinking)
- Vertex AI content generation parameters: [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters)
- Gemini 2.0 Flash-Lite model details: [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash-lite](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash-lite)
- Gemini 3 prompting guidance: [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide)
- Vertex AI provisioned throughput: [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput/szpt](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput/szpt)

Repo areas reviewed:

- `src/lib/gemini.ts`
- `src/lib/prompts.ts`
- `src/app/api/tweak-component/route.tsx`
- `src/app/api/renderer-chat/route.tsx`
- `src/RendererPage/index.tsx`
