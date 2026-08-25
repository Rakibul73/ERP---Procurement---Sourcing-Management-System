# DECISIONS.md

## Phase 1 Decisions

### 1. Go version: 1.23.5
- Used Go 1.23.5 (latest stable as of project scaffold)
- No reason to deviate from latest stable

### 2. Wails v2.15.0 (not v3)
- Wails v3 CLI is not yet released (only beta.12 exists, no cmd/wails package)
- Wails v2.15.0 is the current stable release
- Provides native Windows window with WebView2 backend
- Embeds frontend assets into the binary automatically
- Will upgrade to v3 when stable release is available

### 3. SQLite driver: modernc.org/sqlite
- Pure Go implementation, no CGO required for cross-compilation
- However, Docker build uses mingw-gcc for CGO_ENABLED=1 due to modernc.org/sqlite requirements
- WAL mode enabled for better concurrent read performance

### 4. Database location: %APPDATA%/ERP/data.db
- Uses standard Windows app data location
- Migrations run automatically on first launch
- WAL journal mode for reliability

### 5. Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Chosen for modern, fast development
- Tailwind CSS for professional admin dashboard look
- Vite for fast build times

### 6. Build approach: Docker cross-compilation
- Frontend built via npm (Node.js)
- Go backend cross-compiled in Docker container
- Uses mingw-gcc for CGO cross-compilation
- Produces single .exe for Windows

### 7. OCR/Document extraction: Vision LLM API
- NOT using Tesseract or native OCR
- Using OpenAI/Gemini/Anthropic vision API for structured extraction
- Provider configurable in Settings
- API key stored locally (encrypted at rest - to be implemented)
- App works offline except for extraction calls

### 8. FTS5 for global search
- SQLite FTS5 built-in, no external search service
- Virtual tables for suppliers, products, documents
- Keeps everything in one binary + one file

### 9. Project structure
- Follows the specification in erp-build-prompt.md
- Backend: Go with Wails
- Frontend: React with TypeScript
- Single-binary deliverable
