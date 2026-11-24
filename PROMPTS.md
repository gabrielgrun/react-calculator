# Prompts

AI tool: Claude Code (Claude Opus 5.5).

This document shows how I worked with the AI, phase by phase.

## 1. Planning

> I want to plan the development of a full-stack calculator. Here are the requirements:
> *(assignment brief)*
>
> Let's plan before writing any code. Ask me about anything that isn't clear, such as whether we'll
> implement the optional items and which stack we'll use, and show me the plan before starting.

*The AI came back with clarifying questions (optional items, UI style, API shape, stack, priorities)
and a recommendation for each. My answers:*

> Yes to all the optional items, and include Docker so anyone can run the whole app easily. One
> endpoint per operation. We need plenty of tests.

## 2. Questioning the plan

*The AI suggested a classic keypad where each operator press immediately calls the API, like a
pocket calculator.*

> If the UI executes each operation as soon as it's pressed, won't it ignore the order of
> operations?

*To respect precedence, the AI proposed an extra `/evaluate` endpoint that receives the whole
expression.*

> Will the per-operation endpoints still exist if the UI only calls the expression endpoint?

## 3. Steering the design

> I think we're getting lost. If the brief asks for multiple endpoints and the UI only uses one,
> there's no reason for the others to exist. Also remember the user can type grouping symbols like
> () and []. Give me ideas on how to solve this.

> I like option A (the frontend parses the expression into a tree and calls one endpoint per
> operation).

> I agree with the proposed input rules (negative numbers, decimals, square root, percentage,
> on-screen and physical keyboard). Go ahead.

> Shouldn't there be a single Dockerfile for the whole project? It would be easier for anyone to
> just run `docker compose up` and have everything running.

*The AI agreed: Docker became the README's quick start, with the per-layer instructions kept below
it for development, as the brief requires.*

## 4. Implementation approach

*The AI wrote a 13-task implementation plan and offered to execute it directly in this session,
pausing for my review after the backend, the expression engine and the UI.*

> Write the tests first, make sure they fail, and only then write the implementation. Run it
> directly in this session.

> Are we making small commits for each part? Commit after every task, but only push at the end.

## 5. Reviewing the code

*At the first review pause (backend done), the AI asked whether to add Go doc comments, since I
only allow comments I approve.*

> Yes, add doc comments to the public functions of the calculator package.

> Did you follow my best-practices checklist?

*The AI audited the code against it and found one gap in input validation: typing `1e999` became
`Infinity`, which `JSON.stringify` sends as `null`, so the API answered with a misleading
"operand is required".*

> Yes, fix it (test first) and move on.

*Reviewing the state hook, I flagged this snippet:*

```ts
const base =
  state.display.kind === 'result'
    ? STARTS_WITH_OPERATOR.test(text)
      ? state.display.value
      : ''
    : state.expression
```

> This is ugly. We should use enums for this kind of branching. Also, for TypeScript, wouldn't a
> shared file for reusable types be a good idea?

*TypeScript `enum` is blocked by the project's `erasableSyntaxOnly` setting, so the AI proposed
const-object enums and a `types.ts` for types shared across layers (module-internal types stay
local).*

> Yes, go with the const-object enums and `types.ts`.

> Before we move on to Docker, review the whole code again. Do we have large nested ifs? Are we
> following the best practices, SOLID and Clean Code?

*The AI found no deep nesting but listed five improvements: a `useEffect` re-subscribing on every
render, an else-if chain in the tokenizer, a duplicated parsing loop, a repeated busy guard, and
magic numbers plus a non-extensible error `switch` in Go.*

> Yes, apply all five.

## 6. Testing it myself

> Where can I see the calculator running?

> *(screenshot)* It looks cramped on a large screen.

*The layout used a CSS grid that shrank the calculator to its minimum width; fixed and checked on
desktop and mobile widths.*

## 7. Independent review

> Launch a separate subagent to review the whole code independently, read-only, with no context
> from this session.

*The reviewer found two bugs: continuing from a negative result with `^` lost the sign (`-5`,
then `^2`, gave `-25`), and continuing from a result reused the rounded display value (`1÷3`,
then `×3`, gave `0.999999999999`). Both were fixed test-first, together with Enter on a focused
keypad key. Then I chose which of the minor findings to fix:*

> Fix the Node.js version in the README, the 400 that should be a 413, the error codes that are
> bare strings, the non-JSON 404/405 responses, the missing feedback at the length limit, and the
> server timeouts.
