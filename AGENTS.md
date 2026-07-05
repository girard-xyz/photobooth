<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.


## Project: Photobooth v4

PHP 8.4 + vanilla JS web app for photo booths on Linux/Windows/Raspberry Pi.

### Quick-start commands

| Task | Command |
|------|---------|
| Full build | `npm run build` (composer install + gulp + HEAD) |
| Watch assets | `npm run watch:gulp` |
| JS lint | `npm run eslint` |
| JS format | `npm run format` (prettier + eslint fix + lang JSON sort) |
| PHP code style | `composer cgl` (runs `tools/php-cs-fixer`) |
| PHP syntax | `composer lint` (runs `tools/phplint`) |
| PHP static analysis | `composer phpstan` (level 8) |
| PHP unit tests | `composer phpunit` |
| QA (CI order) | JS lint → build → cgl → lint → phpstan → phpunit |
| DDEV startup | `ddev start` |
| DDEV QA | `ddev qa` (cgl → lint → phpstan → phpunit) |
| DDEV pre-commit | `ddev pre-commit` (eslint → build → qa) |

### Important project conventions

- **Composer**: NOT globally installed. Use `php bin/composer` (a vendored copy in `bin/`).
- **Tooling**: php-cs-fixer, phplint, phpunit, and phpstan are isolated composer projects under `tools/`. Install them with `composer install` (post-install hook).
- **PHP namespace**: `Photobooth\` maps to `src/` and `private/src/`. Services use a pseudo-Singleton via `$GLOBALS[ServiceClass::class]` (see `lib/boot.php`). Tests namespace: `Photobooth\Tests\` → `tests/`.
- **Admin panel config**: Defined in a large PHP array returned by `lib/configsetup.inc.php` — edit that file to add/change admin settings.
- **Service pattern**: `ServiceClass::getInstance()` returns the shared singleton — always use this, never `new`.
- **Config**: Runtime config lives in `config/config.inc.php` (gitignored). Defaults come from `ConfigurationService`.
- **Entry points**: `index.php` (main app), `admin/`, `api/`, `gallery/`, `slideshow/`, `login/`, `chroma/`, `welcome/`.
- **Private files**: `private/` is gitignored (except README). Users place custom frames, fonts, backgrounds, etc. there.
- **CSRF**: All state-changing requests need a CSRF token from `$_SESSION['csrf']`. Use `checkCsrForFail()` from `lib/boot.php` for validation.
- **Build artifacts**: SCSS→`resources/css/`, JS (via Babel)→`resources/js/`, Tailwind admin→`resources/css/tailwind.admin.css`. These are gitignored — must run build before testing.
- **Session lifetime**: 48 hours (kiosk use). Session files stored outside web root (`../sessions/`).
- **EditorConfig**: 4-space indent for PHP, 2-space for SCSS/CSS/JSON/YAML, tab for .htaccess and .neon files.
- **Prettier config**: Single quotes, no semicolons (semi off for JS). ESLint also enforces single quotes.
- **.nvmrc**: Node.js 20. `.npmrc` enforces `engine-strict=true` with lockfile v3.
- **DDEV notes**: GET request helper auto-starts on port 9100. Asset watcher auto-starts (`gulp watch`). No DB container needed (`omit_containers: [db, dba]`).
