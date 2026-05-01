# Playground Source Mirror Index

This index lists external CAS/math-system repositories registered as Calcwiz research-context mirrors.

Mirror payloads are intentionally ignored. The committed source of truth is the metadata under `metadata/`.

| mirror_id | title | status | metadata | local mirror path | primary Calcwiz value |
| --- | --- | --- | --- | --- | --- |
| `fricas` | FriCAS | `planned` | [metadata](./metadata/fricas.yaml) | `playground/sources/mirrors/fricas/` | Deep CAS power, typed algebraic structures, symbolic integration, and broad exact capability context. |
| `sympy` | SymPy | `planned` | [metadata](./metadata/sympy.yaml) | `playground/sources/mirrors/sympy/` | Practical modern symbolic API, expression trees, assumptions, simplification, and Python-facing CAS usability. |
| `maxima` | Maxima | `planned` | [metadata](./metadata/maxima.yaml) | `playground/sources/mirrors/maxima/` | Classic CAS behavior, symbolic solving, calculus tradition, and historically simpler CAS architecture. |
| `sagemath` | SageMath | `planned` | [metadata](./metadata/sagemath.yaml) | `playground/sources/mirrors/sagemath/` | Ecosystem orchestration, broad math environment packaging, and multi-engine platform lessons. |
| `giac-xcas` | Giac / XCAS | `planned` | [metadata](./metadata/giac-xcas.yaml) | `playground/sources/mirrors/giac-xcas/` | Calculator-style CAS realism, performance-oriented symbolic math, and embedded/handheld tradeoffs. |
| `symengine` | SymEngine | `planned` | [metadata](./metadata/symengine.yaml) | `playground/sources/mirrors/symengine/` | Minimal fast symbolic core design, efficient expression representation, and lightweight engine boundaries. |

## Registry Rule

Register a source mirror here before using it for durable Calcwiz research. Local clones belong only under the matching ignored `mirrors/<mirror-id>/` path.
