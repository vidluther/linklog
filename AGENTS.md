# AGENTS.md - Linkblog Development Guide

Linkblog is a personal bookmarking API built with NestJS + TypeScript + Supabase. It publishes an RSS feed and includes a browser extension.

## Commands

### Core

```bash
pnpm start:dev      # Dev server with hot reload
pnpm build          # Production build
pnpm start:prod     # Run production build
```

### Testing

```bash
pnpm test              # Run all tests (Vitest)
pnpm test --watch      # Watch mode
pnpm test --run        # Single run (CI mode)
pnpm test src/links/  # Run tests in directory
pnpm test links        # Run tests matching pattern
pnpm test src/links/links.controller.spec.ts  # Run specific file
pnpm test:cov         # Run with coverage
```

### Linting & Formatting

```bash
pnpm lint         # Run oxlint
pnpm lint:fix     # Auto-fix lint issues
pnpm fmt          # Run oxfmt (format)
pnpm fmt:check    # Check formatting
```

### Extension

```bash
pnpm build:extension    # Build browser extension
```

## Code Style

### General

- **Package Manager**: Use `pnpm` (not npm/yarn/bun)
- **Node Version**: >=22.0.0
- **TypeScript**: strict mode enabled - avoid `any`

### Imports

Order: NestJS → external libs → local imports. Use path aliases (`@/`) and `.js` extension for relative imports.

```typescript
import { Controller, Get } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { LinksService } from "./links.service.js";
import { CreateLinkDto } from "./dto/create-link.dto.js";
```

### Naming

- Files: kebab-case (`links.controller.ts`)
- Classes: PascalCase (`LinksController`)
- Methods/Variables: camelCase
- Interfaces: PascalCase (no "I" prefix)
- DTOs: `<Entity>Dto` pattern (`CreateLinkDto`)

### TypeScript

- Use explicit return types for service methods
- Use `!` for definite assignment (class properties set by DI)
- Prefer interfaces over types for object shapes

### NestJS Patterns

**Controllers**: Thin route handlers - delegate to services. Use `@Public()` for public endpoints.

```typescript
@Controller("links")
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Public()
  @Get()
  findAll() {
    return this.linksService.findAll();
  }
}
```

**Services**: Always return `Promise<T>`. Handle Supabase errors with proper NestJS exceptions.

```typescript
@Injectable()
export class LinksService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findOne(id: number): Promise<Link> {
    const { data, error } = await this.supabase
      .from("links")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`Link #${id} not found`);
      }
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }
}
```

### Error Handling

Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `InternalServerErrorException`, `UnauthorizedException`. Always check Supabase `error` before using `data`.

### Testing (Vitest)

- Place `*.spec.ts` alongside the file being tested
- Use `vi.fn()` and `vi.mocked()` (not Jest's `jest.fn()`)
- Instantiate controllers manually (not `Test.createTestingModule`) due to Vitest + esbuild incompatibility

```typescript
const service = { findAll: vi.fn() } as unknown as LinksService;
const controller = new LinksController(service);
vi.mocked(service.findAll).mockResolvedValue([mockLink]);
```

### Supabase Client

Always check `{ data, error }`. Use `.single()` for single rows, `.order()` for sorting, `.eq()` for filtering.

## Module Structure

```
src/
├── app.module.ts
├── config/           # Configuration
├── supabase/         # Supabase client
├── auth/             # Auth guards, decorators
├── links/            # Links CRUD
├── feed/             # RSS feed
└── health/           # Health check
```

## Browser Extension

The extension lives in `browser-extension/` and uses `browser.*` namespace. Build with `pnpm build:extension`.

## CI/CD

CI runs on PRs to `main`: install, lint, fmt:check, build, test.

## Gotchas

- Supabase queries always return `{ data, error }` - check error first
- Browser extension uses different build system (not NestJS)
