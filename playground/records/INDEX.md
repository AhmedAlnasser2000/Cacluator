# Playground Experiment Index

| experiment_id | lane | level | status | owner | record | manifest | last_reviewed | next_step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sym-search-planner-ordering` | `symbolic-search` | `level-0-research` | `active` | `unassigned` | [Record](./sym-search-planner-ordering.md) | [Manifest](../manifests/sym-search-planner-ordering.yaml) | `2026-04-14` | Keep the symbolic-search result unchanged while reusing it as the first external-compute remote workload proof. |
| `ext-compute-ssh-foundations` | `external-compute` | `level-0-research` | `promoted` | `unassigned` | [Record](./ext-compute-ssh-foundations.md) | [Manifest](../manifests/ext-compute-ssh-foundations.yaml) | `2026-04-14` | Foundations are complete; the follow-on work is now the real SSH VM pilot. |
| `ext-compute-ssh-vm-pilot` | `external-compute` | `level-2-bounded-prototypes` | `promoted` | `unassigned` | [Record](./ext-compute-ssh-vm-pilot.md) | [Manifest](../manifests/ext-compute-ssh-vm-pilot.yaml) | `2026-04-14` | The VM-first SSH transport proof is complete; the follow-on work is now hardening and adoption gating. |
| `ext-compute-ssh-vm-hardening` | `external-compute` | `level-3-integration-candidates` | `active` | `unassigned` | [Record](./ext-compute-ssh-vm-hardening.md) | [Manifest](../manifests/ext-compute-ssh-vm-hardening.yaml) | `2026-04-14` | The hardening gate is now proven on `calcwiz-box`; the next review is provider-host expansion versus keeping the VM-first lane internal-only / no-adopt. |
