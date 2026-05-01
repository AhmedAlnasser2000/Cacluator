# Playground Sources

`playground/sources/` is the controlled registry for external repository mirrors used as Calcwiz research context.

It is for codebase context, not product dependency.

## Purpose

Use this area to track external CAS or math-system repositories that Calcwiz studies for:

- architecture lessons
- algorithm families
- benchmark and correctness examples
- design tradeoffs
- incubation candidates

Source mirrors are not stable Calcwiz code. They are not inherited identity, runtime authority, or dependency shortcuts.

## Difference From `.memory/sources/`

- `.memory/sources/` preserves verbatim documents, roadmaps, and discussion exports.
- `playground/sources/` controls external codebase mirrors and their metadata.

Do not store large external repository payloads in `.memory/sources/`.

## Mirror Layout

Committed files:

- `INDEX.md`
- `metadata/*.yaml`
- `mirrors/.gitkeep`

Ignored local clone payloads:

- `mirrors/<mirror-id>/`

Every local clone must live under its registered mirror path, for example:

```bash
playground/sources/mirrors/fricas/
```

## Boundary Rules

- Do not clone external repositories outside the registered mirror area for Calcwiz research.
- Do not commit cloned third-party repository payloads into Calcwiz.
- Do not add source mirrors as git submodules.
- Do not import, execute, or depend on source mirrors from stable `src/` code.
- Do not copy code from source mirrors into Calcwiz by default.
- Any idea learned from a source mirror must be rewritten into a Calcwiz-native bounded form and pass through Playground/incubation before stable adoption.

## Code-Reuse Stop Rule

If direct code reuse is ever considered, stop and document:

- exact upstream source
- license implications
- why reuse is necessary
- why a Calcwiz-native rewrite is not preferred
- which Playground record owns the review

The default answer remains: understand, translate, and re-implement natively where appropriate.
