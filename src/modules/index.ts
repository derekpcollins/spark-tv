/**
 * Registers every module: each file under src/modules registers itself on import.
 * Adding a module or variant is just a new file; nothing here or in the core changes.
 */
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./index.ts'], { eager: true });
