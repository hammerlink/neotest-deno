import { assert } from '@std/assert/assert';
import { assertEquals } from '@std/assert/equals';
import { dirname, fromFileUrl, join } from 'jsr:@std/path';
import Parser, { Language } from 'npm:tree-sitter';
import TsTypeScript from 'npm:tree-sitter-typescript';

const parser = new Parser();
parser.setLanguage(TsTypeScript.typescript as Language);

const QUERY_DIR = join(dirname(fromFileUrl(import.meta.url)), '../lua/ts-discover-positions.txt');
const QUERY = await Deno.readTextFile(QUERY_DIR);
const query = new Parser.Query(TsTypeScript.typescript as Language, QUERY);

async function validateTestQuery(testRelativePath: string, testOptions?: { name?: string }) {
    const TEST_DIR = join(dirname(fromFileUrl(import.meta.url)), testRelativePath);
    const TEST = await Deno.readTextFile(TEST_DIR);
    const tree = parser.parse(TEST);
    assert(tree !== null, 'Tree is null');

    const matches = query.matches(tree.rootNode);
    assertEquals(matches.length, 1);
    if (testOptions?.name) {
        assertEquals(matches[0].captures.find((x) => x.name === 'test.name')?.node.text, testOptions.name);
    }
}

Deno.test('Tree-sitter - Function name', async () => {
    await validateTestQuery('./tree-sitter-examples/deno-function.test.ts', { name: 'DenoFunction' });
});
Deno.test('Tree-sitter - Async Function name', async () => {
    await validateTestQuery('./tree-sitter-examples/deno-async-function.test.ts', { name: 'DenoAsyncFunction' });
});
