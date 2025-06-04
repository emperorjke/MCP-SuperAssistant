# MCP SuperAssistant Development Guidelines

## Project Overview
- **Purpose**: Chrome extension integrating Model Context Protocol (MCP) with AI platforms
- **Tech Stack**: TypeScript, React, Vite, pnpm monorepo, Chrome Extension Manifest V3
- **Core Function**: Detect MCP tool calls in AI responses and execute them via MCP server

## Project Architecture

### Directory Structure
```
/
├── chrome-extension/     # Extension manifest and configuration
├── pages/content/       # Content script with platform adapters
├── src/                 # Core logic and platform implementations
├── packages/            # Additional packages
├── public/             # Static assets
└── scripts/            # Build scripts
```

### Key Components
- **Adapters**: `pages/content/src/adapters/` - Platform-specific implementations
- **Platforms**: `src/platforms/` - Complex platform logic (optional)
- **MCP Client**: `src/client/` - MCP server communication
- **Components**: `pages/content/src/components/` - React UI components

## Platform Addition Rules

### **DO** When Adding New Platform:
1. **ADD** host permissions in `chrome-extension/manifest.ts`:
   ```typescript
   '*://*.example.com/*',
   '*://*.www.example.com/*',
   ```
2. **CREATE** adapter file `pages/content/src/adapters/exampleAdapter.ts`
3. **REGISTER** adapter in `pages/content/src/adapters/index.ts`:
   ```typescript
   { AdapterClass: ExampleAdapter, hostnames: ['example.com'] },
   ```
4. **EXPORT** adapter function in `pages/content/src/adapters/index.ts`:
   ```typescript
   export const exampleAdapter = () => initializeAdapter(ExampleAdapter);
   ```
5. **CREATE** platform in `src/platforms/ExamplePlatform.ts` (only if complex logic needed)

### **DON'T**:
- **NEVER** edit manifest.json directly
- **NEVER** forget to add all URL variants (with/without www)
- **NEVER** skip adapter registration

## Build and Deployment Rules

### **MANDATORY** Build Sequence:
```bash
pnpm install
pnpm -r run ready
pnpm --filter chrome-extension build
pnpm --filter @extension/content-script build
pnpm zip
```

### **DO**:
- **USE** only pnpm (not npm or yarn)
- **RUN** `pnpm -r run ready` before any builds
- **TEST** extension in Chrome developer mode before release

### **DON'T**:
- **NEVER** use npm or yarn commands
- **NEVER** edit files in dist/ or build/ directories
- **NEVER** commit pnpm-lock.yaml changes without reviewing

## Code Standards

### TypeScript Rules
- **EXTEND** SiteAdapter interface for all adapters
- **USE** strict typing (no `any` unless absolutely necessary)
- **PLACE** types in `src/types/` for shared types
- **IMPLEMENT** required methods: `getInputElement()`, `getSubmitButton()`, `getResponseElement()`

### React Component Rules
- **USE** functional components with hooks
- **STYLE** with Tailwind CSS classes only
- **PLACE** in `pages/content/src/components/`
- **WRAP** in Shadow DOM for style isolation

### Testing Rules
- **CREATE** test file as `{name}.test.ts` or `{name}.test.tsx`
- **USE** Jest and @testing-library/react
- **TEST** each new adapter with mock DOM
- **RUN** tests with `pnpm test`

## File Coordination Requirements

### **WHEN** Adding Platform Support:
1. `chrome-extension/manifest.ts` → Add host_permissions
2. `pages/content/src/adapters/{platform}Adapter.ts` → Create adapter
3. `pages/content/src/adapters/index.ts` → Register adapter
4. `src/platforms/{Platform}Platform.ts` → Create if needed

### **WHEN** Updating Version:
1. `/package.json` → Update version
2. `chrome-extension/package.json` → Match version
3. `README.md` → Update changelog section

### **WHEN** Modifying Build Process:
1. `vite.config.ts` → Root config
2. `chrome-extension/vite.config.mts` → Extension config
3. `pages/content/vite.config.mts` → Content script config

## MCP Integration Rules

### **DO**:
- **USE** `mcpHandler` for all tool calls
- **CALL** tools via `mcpHandler.callTool(toolName, args, callback)`
- **INSERT** results into platform UI using adapter methods
- **HANDLE** connection status changes in adapters

### **DON'T**:
- **NEVER** call MCP server directly
- **NEVER** modify tool results before insertion
- **NEVER** assume MCP connection is always available

## Prohibited Actions

### **CRITICAL - NEVER DO**:
1. **NEVER** edit `manifest.json` directly (only `manifest.ts`)
2. **NEVER** use npm or yarn (only pnpm)
3. **NEVER** modify generated files in dist/
4. **NEVER** commit without running tests
5. **NEVER** add dependencies without updating all package.json files
6. **NEVER** use CSS files (only Tailwind classes)
7. **NEVER** create class components (only functional)
8. **NEVER** skip adapter registration in index.ts

## Debugging and Error Handling

### **WHEN** Extension Not Loading:
1. **CHECK** manifest.ts for syntax errors
2. **VERIFY** all hostnames in host_permissions
3. **RUN** `pnpm -r run ready` and rebuild
4. **INSPECT** Chrome extension errors (chrome://extensions)

### **WHEN** Platform Not Detected:
1. **VERIFY** hostname matches in adapter registration
2. **CHECK** adapter implements all required methods
3. **CONFIRM** adapter is exported in index.ts
4. **TEST** with console.log in adapter constructor

### **WHEN** Build Fails:
1. **DELETE** node_modules and pnpm-lock.yaml
2. **RUN** `pnpm install`
3. **EXECUTE** `pnpm -r run ready`
4. **RETRY** build commands

## AI Decision Rules

### **WHEN** User Requests Platform Support:
1. **CHECK** if adapter already exists in `pages/content/src/adapters/`
2. **VERIFY** if platform is in manifest.ts host_permissions
3. **CREATE** adapter following naming convention
4. **TEST** with actual platform website

### **WHEN** User Reports Bug:
1. **REPRODUCE** issue locally first
2. **CHECK** browser console for errors
3. **VERIFY** MCP server connection
4. **INSPECT** adapter implementation

### **WHEN** Ambiguous Request:
1. **ASSUME** user wants full platform integration
2. **IMPLEMENT** both adapter and manifest changes
3. **CREATE** tests for new functionality
4. **DOCUMENT** changes in commit message