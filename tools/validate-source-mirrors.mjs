import { validateSourceMirrors } from './source-mirrors-core.mjs';

const registry = validateSourceMirrors();

console.log(`Source mirror registry is valid (${registry.length} mirror(s)).`);
