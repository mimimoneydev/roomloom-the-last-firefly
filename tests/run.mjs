import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const directory = await mkdtemp(join(tmpdir(), 'roomloom-tests-'));
try {
  for (const name of ['progress', 'surfaces', 'placement', 'routes', 'obstacles', 'sanctuary', 'puzzle',
    'input', 'performance', 'presentation']) {
    const source = await readFile(new URL(`../src/roomloom-${name}.ts`, import.meta.url), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    await writeFile(join(directory, `roomloom-${name}.js`), output.replaceAll("'@iwsdk/core'", JSON.stringify(import.meta.resolve('@iwsdk/core'))));
  }
  const env = { ...process.env, ROOMLOOM_TEST_URL: pathToFileURL(`${directory}/`).href };
  for (const file of ['tests/roomloom.test.mjs', 'tests/competition.test.mjs']) {
    const result = spawnSync(process.execPath, [file], { stdio: 'inherit', env });
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
