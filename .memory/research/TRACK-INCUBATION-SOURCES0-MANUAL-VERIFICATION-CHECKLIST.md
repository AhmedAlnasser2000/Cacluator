# TRACK INCUBATION-SOURCES0 Manual Verification Checklist

primary_agent: codex  
primary_agent_model: gpt-5.5  
milestone: INCUBATION-SOURCES0  
date: 2026-05-01

## Scope

- `playground/sources/` exists as the controlled source-mirror registry.
- `playground/sources/metadata/` contains planned context metadata for:
  - FriCAS
  - SymPy
  - Maxima
  - SageMath
  - Giac / XCAS
  - SymEngine
- `playground/sources/mirrors/` is ignored for local clone payloads.
- No external repository is cloned or committed in this milestone.

## Boundary Checks

1. Confirm `playground/sources/README.md` states that mirrors are context only.
2. Confirm `playground/sources/INDEX.md` lists all six registered mirrors.
3. Confirm every metadata file includes upstream URL, license, intended value, allowed use, forbidden use, contamination risk, local mirror path, capture placeholders, and downstream notes.
4. Confirm `playground/sources/mirrors/.gitkeep` is the only intended tracked file under `mirrors/`.
5. Confirm stable `src/` code does not reference `playground/sources`.
6. Confirm there are no submodules and no cloned third-party payloads in the committed tree.

## Commands

```bash
npm run test:source-mirrors
npm run test:memory-protocol
npm run lint
npm run build
git check-ignore playground/sources/mirrors/fricas/.probe
git ls-files playground/sources/mirrors
```

## Expected Result

- Metadata validates.
- Mirror payloads are ignored.
- Stable app code does not import or read source mirrors.
- `FRICAS-CTX0` may start only after this guardrail exists.
- Any mirror-derived idea must pass through Playground/incubation as a Calcwiz-native bounded rewrite before stable adoption.
