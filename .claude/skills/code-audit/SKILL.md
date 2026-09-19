---
description: Audit codebase for coding standards, duplication, logging hygiene, security, test quality, and dependency freshness
---

Run a comprehensive code quality audit of this project. If the user provided a path argument, scope the audit to that subdirectory only: `$ARGUMENTS`

## Step 1: Project context (pre-detected — don't re-derive)

Python 3.12+ (Vercel Fluid Compute, `@vercel/python` runtime), single external dependency (`requests>=2.31` in `requirements.txt`). Source lives in `api/*.py` (serverless functions behind `vercel.json` routes) and `scripts/*.py` (backtest/compute-week CLI tools). No pytest — tests are plain assert-based scripts with an `if __name__ == "__main__":` runner (e.g. `api/test_conformal.py`), invoked directly with `python api/test_conformal.py`. `package.json` carries no dependencies — it's Vercel build metadata only, not a Node ecosystem to audit. No linter config, no CLAUDE.md in this repo.

Pass this paragraph verbatim to each subagent as project context.

## Step 2: Launch 6 parallel audit agents

Launch ALL 6 of the following Task agents in a SINGLE message so they run in parallel. Agents 1-5 MUST use `subagent_type: "Explore"`. Agent 6 MUST use `subagent_type: "general-purpose"` (it needs Bash to run CLI tools). Each agent receives the Step 1 context paragraph.

If `$ARGUMENTS` is non-empty, tell each agent to restrict its search to that path. Otherwise, agents search `api/` and `scripts/` (excluding `__pycache__`, `.vercel`, `.worktrees`, `graphify-out`, `.git`).

**CRITICAL output constraint for EVERY agent**: Return ONLY a structured bullet list of findings. Each finding must follow this exact format:
```
- [HIGH|MEDIUM|LOW] <short description> — <file:line> (and <file:line> if comparing two locations)
```
Maximum 15 findings per agent. No prose, no preamble, no summary paragraph — just the bullet list. If no issues found, return `- No issues found.`

Report file:line, not a vague area — that's the standard this project's owner expects from any finding (see Step 3 tone note).

### Agent 1: Coding Standards & Consistency

```
You are auditing: <context>.

Check that the codebase follows consistent coding standards and patterns. Look for:

1. NAMING: Inconsistent naming — mixing camelCase/snake_case where Python convention (snake_case) is expected. Check function names, module-level constants (should be SCREAMING_SNAKE_CASE), and file names.
2. PATTERNS: Inconsistent application of project patterns — e.g. some hub-api handlers building responses one way, others another; some modules importing shared constants, others redefining them locally.
3. ERROR HANDLING: Inconsistent error handling — some functions raise, some return None/empty dict, some swallow exceptions silently (bare `except:` or `except Exception: pass`). Flag deviations from the dominant pattern per module.
4. STYLE: Inconsistent style within the same project — e.g. mixing f-strings with `.format()`/`%`, inconsistent type-hint usage (some functions annotated, siblings not), inconsistent import ordering (stdlib vs local).

Use Glob to find source files under api/ and scripts/, Read to examine them, Grep to find patterns.
Return findings as: - [HIGH|MEDIUM|LOW] description — file:line (and file:line)
Max 15 findings. No prose.
```

### Agent 2: Code Duplication

```
You are auditing: <context>.

Scan source files under api/ and scripts/ (NOT test_*.py files) for duplication. Look for:

1. NEAR-IDENTICAL FUNCTIONS: Functions across different files that do essentially the same thing with minor variations (different variable names, slight parameter differences) — this project has already deduplicated constant tables once (see recent commit history), check whether new duplication has crept back in.
2. COPY-PASTED BLOCKS: 3+ lines of similar code appearing in multiple places that could be extracted into a shared helper.
3. REPEATED LOGIC: The same pattern of Sleeper/nflverse API calls, data transformations, or error handling repeated across api/*.py or scripts/*.py.
4. DUPLICATED CONSTANTS: Magic strings/numbers (position lists, scoring weights, thresholds) repeated in multiple files instead of a single source (e.g. check nothing duplicates `POS_WIDTH_FACTORS`, `POS_RESIDUALS`, or similar tables already consolidated in `conformal.py`/`scoring.py`).

Use Glob to find source files, Read to examine them, Grep to find repeated string literals and similar function names.
Return findings as: - [HIGH|MEDIUM|LOW] description — file:line (and file:line)
Max 15 findings. No prose.
```

### Agent 3: Logging Hygiene & Debug Artifacts

```
You are auditing: <context>.

Check for improper logging practices and leftover debug artifacts. Look for:

1. RAW PRINT CALLS: Any use of `print(...)` in api/*.py (production request-handling code) outside of the `if __name__ == "__main__":` self-check blocks in test_*.py files. `print` in a Vercel serverless handler goes nowhere useful — flag every instance in non-test source.
2. DEBUG LEFTOVERS: Commented-out print/debug statements, TODO/FIXME/HACK/XXX comments referencing debugging, temporary variables only used for printing.
3. SENSITIVE DATA IN LOGS/PRINTS: Any print or error message that could output `SLEEPER_LEAGUE_ID`, full request/response bodies, or other env-derived values.
4. INCONSISTENT ERROR SURFACING: Check `hub_news()`/`hub_meta()`-style soft-fail handlers — confirm failures are surfaced consistently (same shape) rather than some swallowing errors and others re-raising.

Use Grep to search for `print(`, `# TODO`, `# FIXME`, `# HACK`, `# XXX`. Read surrounding context to assess severity.
Return findings as: - [HIGH|MEDIUM|LOW] description — file:line
Max 15 findings. No prose.
```

### Agent 4: Security — Secrets & Environment Handling

```
You are auditing: <context>.

Check for security issues related to secrets, environment variables, and sensitive data handling. Look for:

1. HARDCODED SECRETS: Any hardcoded API keys, tokens, or credentials in source code. This project's only required secret is `SLEEPER_LEAGUE_ID` (and optionally `FFANALYTICS_DB_PATH`) — confirm neither appears as a literal value anywhere.
2. ENV VALIDATION: `os.environ`/`os.getenv` calls scattered ad-hoc through api/*.py without a single validated config point. Flag if `SLEEPER_LEAGUE_ID` is read in more than one place with different fallback/validation behavior.
3. GITIGNORE GAPS: Read `.gitignore` — it currently covers `.env`, `.vercel`, `__pycache__`, `.pyc`, `.DS_Store`, `.worktrees`, `graphify-out`, `.claude/settings.local.json`. Flag anything sensitive that's missing (e.g. `data/*.db` if it can contain league-identifying data, credential/key file patterns).
4. SECRET EXPOSURE: Check error handlers in api/index.py and hubapi.py for what they expose in HTTP responses — a raw exception message reaching the client can leak internal paths or the league ID.
5. COMMITTED SECRETS: Confirm no `.env` or credential file is actually tracked in git (not just gitignored).

Use Glob/Grep for `os.environ`, `os.getenv`, hardcoded-looking tokens. Read `.gitignore` and compare against tracked files.
Return findings as: - [HIGH|MEDIUM|LOW] description — file:line
Max 15 findings. No prose.
```

### Agent 5: Test Quality & Coverage

```
You are auditing: <context>.

This project's test convention: plain assert-based scripts (`test_*.py`) with an `if __name__ == "__main__":` runner — NOT pytest, NOT fixtures/mocks-heavy suites. Evaluate against that convention. Look for:

1. COVERAGE GAPS: Source files in api/ or scripts/ with no corresponding `test_*.py`. List each untested source file (e.g. does `hubapi.py`, `nfl_state.py`, `rosters.py`, `league.py`, `projections.py` have a test file? Cross-check against the existing set: test_analytics_smoke.py, test_conformal.py, test_hub_news.py, test_stat_projector.py, test_weather.py, test_compute_week.py, test_backtest.py).
2. SUPERFLUOUS TESTS: Tests that only check truthiness, or duplicate another test with trivially different inputs.
3. MISSING SELF-CHECK RUNNER: Any `test_*.py` file missing the `if __name__ == "__main__":` block that runs its asserts directly — that's the project's required "one runnable check" convention, not optional.
4. FRAGILE TESTS: Tests asserting on exact string/float output that will break on legitimate projection-model tuning, rather than on structural/contract correctness.
5. MISSING EDGE CASES: Test files only covering the happy path for functions with obvious edge cases (empty roster, missing position, bye week, empty residuals list).

Use Glob to find all test_*.py and all source files. Read test files to assess quality. Grep to check whether each source module has an obvious counterpart test.
Return findings as: - [HIGH|MEDIUM|LOW] description — file:line
Max 15 findings. No prose.
```

### Agent 6: Dependency Freshness & Security

**IMPORTANT: This agent MUST use `subagent_type: "general-purpose"` (NOT "Explore") because it needs Bash access to run CLI tools.**

```
You are auditing: <context>.

This project has exactly one ecosystem to check: Python, via requirements.txt (`requests>=2.31`). package.json has zero dependencies — do not run npm audit/outdated, there is nothing there to check.

1. Run `pip-audit --format=json 2>/dev/null` (or `pip-audit -r requirements.txt --format=json 2>/dev/null` if that's more reliable) — flag critical/high vulnerabilities as HIGH, moderate as MEDIUM.
2. Run `pip list --outdated --format=json 2>/dev/null` and cross-reference against requirements.txt — flag `requests` 2+ major versions behind as MEDIUM, 1 major as LOW.
3. Check whether requirements.txt pins exact or minimum versions only (`>=2.31` is a floor, not a lock). Flag the absence of a lock file (no `requirements.lock`, no `poetry.lock`) as LOW given this is a $0/solo project — not MEDIUM, since the project explicitly avoids tooling overhead (see project conventions: vanilla by default, no dependency/tooling for what isn't needed).
4. If `pip-audit` isn't installed, note it as a LOW finding rather than failing silently.

Do NOT flag pre-release/alpha/beta versions as outdated. Do NOT recommend adding a dependency-locking tool as a fix — this project's stated policy is $0/solo, vanilla-by-default; a missing lockfile is a LOW note, not a MEDIUM problem to solve with new tooling.

Return findings as: - [HIGH|MEDIUM|LOW] description — package@version (current -> latest)
For lockfile/tooling issues, use a descriptive identifier instead of package@version.
Max 15 findings. No prose.
```

## Step 3: Aggregate and report

After ALL 6 agents return their findings:

1. Collect all findings into a single list
2. Deduplicate: if two agents flagged the same file:line or essentially the same issue, merge them into one finding and note which categories flagged it
3. Group by severity: HIGH first, then MEDIUM, then LOW
4. Within each severity group, organize by category: Standards, Duplication, Logging, Security, Testing, Dependencies

Tone note: write findings the way this project's owner wants to be talked to — direct, short, concrete, exact `file:line`, no em dashes, no AI-vocabulary padding (delve, robust, comprehensive, nuanced, leverage, seamless). If something's broken, say so plainly.

Output the final report in this exact format:

```markdown
# Code Audit Report

**Project**: <detected project type>
**Scope**: <full project or scoped path>
**Findings**: <N total> (<H> high, <M> medium, <L> low)

---

## High Priority

### <Category>
- <finding> — `file:line` or `package@version (current -> latest)`
- <finding> — `file:line` or `package@version (current -> latest)`

## Medium Priority

### <Category>
- <finding> — `file:line` or `package@version`

## Low Priority

### <Category>
- <finding> — `file:line` or `package@version`
```

If there are no findings at a severity level, omit that entire section. Do NOT add any recommendations or action items — just the findings.

## Step 4: Generate implementation plan

After presenting the audit report from Step 3, generate an implementation plan to fix the findings. Categorize each finding by estimated effort and provide a suggested fix order.

1. Take the aggregated findings from Step 3
2. Group each finding into one of three effort categories:
   - **Quick Wins** (< 30 min each): simple renames, import reordering, adding missing gitignore entries, removing debug artifacts (`print` leftovers), updating patch/minor dependency versions
   - **Medium Effort** (30 min - 2 hours each): extracting shared helpers, deduplicating functions, standardizing error-handling patterns, adding a missing `test_*.py` with its `__main__` self-check runner
   - **Complex** (> 2 hours each): architectural refactors, cross-cutting hub/scoring contract changes, resolving a vulnerability chain requiring a coordinated dependency upgrade
3. For each finding, identify the file(s) involved and write a brief fix description
4. Determine a suggested fix order: shared/constants code first, then refactors, then tests, then cosmetic changes
5. Add a verification checklist that matches this project's own completion vocabulary (`docs/references/architecture.md`) — a task is only **DONE** once tests pass and evidence is given; use **DONE_WITH_CONCERNS**, **BLOCKED**, or **NEEDS_CONTEXT** if it isn't fully closed out. Per project rule, bug fixes ship a regression test in the same commit — not "later".

Output the implementation plan in this exact format, appended after the audit report:

```markdown
# Implementation Plan

## Quick Wins (< 30 min each)
| # | Finding | File(s) | Fix |
|---|---------|---------|-----|
| 1 | <finding description> | `file:line` | <brief fix description> |

## Medium Effort (30 min - 2 hours each)
| # | Finding | File(s) | Fix |
|---|---------|---------|-----|
| 1 | <finding description> | `file:line` | <brief fix description> |

## Complex (> 2 hours)
| # | Finding | File(s) | Fix |
|---|---------|---------|-----|
| 1 | <finding description> | `file:line` | <brief fix description> |

## Suggested Fix Order
1. <category>: <rationale>
2. ...

## Verification
- [ ] Every touched module imports cleanly (`python -c "import <module>"`)
- [ ] All `test_*.py` self-checks pass (`python api/test_*.py`, `python scripts/test_*.py`)
- [ ] New/updated tests cover previously-untested files or the regression just fixed
- [ ] Status marked DONE only with evidence — DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT otherwise
```

If a category has no findings, omit that table. The user can then discuss the plan and ask you to implement it.
