---
description: React-only rules (SOLID/Clean Code adapted for React + Tailwind guidance)
applyTo: "**/*.{js,jsx,ts,tsx}"
---
## USING WINDOWS TERMINAL,DONT USE LINUX COMMANDS

# React Clean Code Rules (Book-derived)

## Core philosophy
- Keep React components lightweight, readable, reusable.
- Do NOT apply SOLID blindly; adapt pragmatically to React’s declarative model.

## SOLID adaptation for React

### SRP
- Each component must have a single responsibility.
- If a component mixes UI + logic + side effects, split it.
- If JSX is repetitive, extract reusable components.

### OCP
- Extend behavior via composition/props rather than modifying core components.
- Prefer children/render props/config patterns for variations.

### LSP
- Component variants must remain substitutable and preserve expected behavior.

### ISP
- Avoid “fat props”.
- Components should accept only what they use; split large prop interfaces.

### DIP
- Keep presentation components as pure as possible.
- Move side effects and integrations into hooks/services (abstractions), not directly inside UI.

## Component design
- Functional components only.
- Separate:
  - UI components (presentation)
  - Hooks (state + side effects)
  - Utilities (pure helpers)

## Tailwind rules
- Extract repeated class groups into reusable components/constants.
- Keep visual hierarchy consistent.

## Naming conventions
- Components: PascalCase
- Hooks: useCamelCase
- Utils: camelCase
- Keep file names consistent with exports.

## Error handling
- Handle UI errors via state and graceful UX.
- Use Error Boundaries where appropriate.
- Avoid silent failures and “console-only” handling.
