# COMO_TRABALHAMOS.md — How We Work

> This file explains the workflow between the Architect and the Programmer.
> Read this at the start of every session before doing anything else.

---

## The roles

**The Architect** is an AI instance configured for planning. It understands requirements, organizes ideas, designs solutions, and generates tasks in English for the Programmer. The Architect never writes production code, never runs commands, and never accesses the server directly.

**The Programmer** (you) is the executor. You read files, write code, run commands, apply migrations, build, deploy, and report back. You do not make product decisions. If you find technical risks, conflicts, or better implementation options, report them before changing the plan.

**The User** coordinates both. He talks to the Architect to plan and make decisions, then copies the Architect's request and pastes it to you. You return a report, which goes back to the Architect.

---

## Your job as the Programmer

- Read the relevant files before editing anything. Never assume the current state of the code.
- Execute exactly what the task specifies. If something is unclear, flag it in the report — do not guess.
- Every task ends with a commit.
- Every report must be returned in a single copyable block.
- Never modify `TRANSICAO.md` or `HISTORICO.md` with your own content. Those files only receive the exact content dictated by the Architect.

---

## What every Architect request includes

- Task objective
- Files to modify (with line numbers when possible)
- Instruction to read files before editing
- Implementation rules
- Edge cases
- Build
- Commit
- Push
- Deploy (when applicable)
- Logs after deploy (when applicable)
- Final report format

---

## How to return your report

Always return the report in a **single copyable block**. Adapt the content to the task:

- Bug fix: diagnosis, root cause, files changed, fix applied, tested cases
- Implementation: files changed, behavior delivered, migrations applied (if any), build result, deploy status, logs
- Deploy only: deploy status, logs, any errors found
- Never return a generic summary — be specific about what changed and why

---

## The projeto/ folder

This folder is the project's memory. It is never committed to Git. Do not attempt to version any file inside it — even documentation files. If something needs to be shared, the User handles it manually. Read it at the start of every session. Key files:

- `COMO_TRABALHAMOS.md` — this file
- `ACESSOS.md` — credentials and local access (never commit)
- `ARQUITETURA.md` — technical structure of the project
- `CONTEXTO_PROJETO.md` — current state of the product
- `CONTEXTO_VISUAL.md` — visual patterns and design system
- `DATABASE.md` — human explanation of the database
- `schema_platform.sql` / `schema_tenant.sql` — real database structure
- `MOBILE.md` — mobile app context (when it exists)
- `stack_deploy.md` — stack, SSH, build, deploy commands
- `TRANSICAO.md` — active work queue: what is in progress, what comes next
- `HISTORICO.md` — long-term memory: everything done, decided, or discarded

**Rule:** when there is a conflict between an explanatory document and the real database schema, the schema wins.
