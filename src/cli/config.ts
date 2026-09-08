import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, parse as parsePath } from 'node:path';
import { homedir } from 'node:os';

export const CONFIG_FILENAME = '.gh-like-diffrc';

/**
 * Defaults a project or a user can set once instead of retyping flags.
 *
 * Deliberately a subset of the CLI options: anything that selects *what* to diff (refs,
 * --staged, -f) stays on the command line, because a config file that silently changed the
 * comparison would be far more surprising than one that changes appearance.
 */
export interface FileConfig {
  style?: 'side' | 'line';
  colorScheme?: 'auto' | 'dark' | 'light';
  context?: number;
  ignore?: string[];
  singleView?: boolean;
  noOpen?: boolean;
}

const KNOWN_KEYS: (keyof FileConfig)[] = [
  'style', 'colorScheme', 'context', 'ignore', 'singleView', 'noOpen',
];

export interface ConfigLoadResult {
  config: FileConfig;
  /** Absolute path the settings came from, or null when no file was found. */
  path: string | null;
  /** Human-readable problems; the CLI prints these rather than failing outright. */
  warnings: string[];
}

/**
 * Nearest config wins: walk up from `startDir` to the filesystem root, then fall back to
 * `~/.gh-like-diffrc`. Only the first file found is read — merging several layers would
 * make it hard to tell where a setting came from.
 */
export function findConfigFile(startDir: string, home: string = homedir()): string | null {
  let dir = startDir;
  const { root } = parsePath(dir);
  for (;;) {
    const candidate = join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) return candidate;
    if (dir === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const global = join(home, CONFIG_FILENAME);
  return existsSync(global) ? global : null;
}

function validate(raw: unknown, warnings: string[]): FileConfig {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    warnings.push('config must be a JSON object; ignoring it');
    return {};
  }
  const input = raw as Record<string, unknown>;
  const out: FileConfig = {};

  for (const key of Object.keys(input)) {
    if (!KNOWN_KEYS.includes(key as keyof FileConfig)) {
      warnings.push(`unknown option "${key}"`);
    }
  }

  if (input.style !== undefined) {
    if (input.style === 'side' || input.style === 'line') out.style = input.style;
    else warnings.push('style must be "side" or "line"');
  }
  if (input.colorScheme !== undefined) {
    if (input.colorScheme === 'auto' || input.colorScheme === 'dark' || input.colorScheme === 'light') {
      out.colorScheme = input.colorScheme;
    } else warnings.push('colorScheme must be "auto", "dark" or "light"');
  }
  if (input.context !== undefined) {
    if (typeof input.context === 'number' && Number.isInteger(input.context) && input.context >= 0) {
      out.context = input.context;
    } else warnings.push('context must be a non-negative integer');
  }
  if (input.ignore !== undefined) {
    if (Array.isArray(input.ignore) && input.ignore.every(v => typeof v === 'string')) {
      out.ignore = input.ignore;
    } else warnings.push('ignore must be an array of strings');
  }
  if (input.singleView !== undefined) {
    if (typeof input.singleView === 'boolean') out.singleView = input.singleView;
    else warnings.push('singleView must be a boolean');
  }
  if (input.noOpen !== undefined) {
    if (typeof input.noOpen === 'boolean') out.noOpen = input.noOpen;
    else warnings.push('noOpen must be a boolean');
  }

  return out;
}

/**
 * Never throws: a malformed config must not stop someone from reading a diff. Problems are
 * returned as warnings and the offending settings are dropped.
 */
export function loadConfig(startDir: string = process.cwd(), home: string = homedir()): ConfigLoadResult {
  const path = findConfigFile(startDir, home);
  if (!path) return { config: {}, path: null, warnings: [] };

  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    return { config: {}, path, warnings: [`could not parse ${path}: ${(e as Error).message}`] };
  }
  return { config: validate(raw, warnings), path, warnings };
}
