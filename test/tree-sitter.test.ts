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

/**
 * Validates a Tree-sitter query against a test file.
 *
 * This helper function loads a test file, parses it using Tree-sitter,
 * and validates that the query matches as expected. It ensures:
 * 1. The query matches the expected number of times in the test file
 *    (defaults to 1 if no names are provided)
 * 2. If test names are provided in the options, it verifies that each 'test.name'
 *    capture matches one of the expected names
 */
async function validateTestQuery(testRelativePath: string, testOptions?: { names?: string[] }) {
    const TEST_DIR = join(dirname(fromFileUrl(import.meta.url)), testRelativePath);
    const TEST = await Deno.readTextFile(TEST_DIR);
    const tree = parser.parse(TEST);
    assert(tree !== null, 'Tree is null');

    const matches = query.matches(tree.rootNode);
    const expectedMatches = testOptions?.names?.length ?? 1;
    assertEquals(matches.length, expectedMatches);

    if (testOptions?.names) {
        testOptions.names.forEach((name) => {
            const match = matches.find((x) => x.captures.find((y) => y.name === 'test.name')?.node.text === name);
            assert(match !== null, `Could not find match with name ${name}`);
        });
    }
}

Deno.test('Tree-sitter - Function name', async () => {
    await validateTestQuery('./tree-sitter-examples/deno-function.test.ts', {
        names: ['DenoFunction', 'DenoAsyncFunction'],
    });
});
Deno.test('Tree-sitter - Arg Name Function', async () => {
    await validateTestQuery('./tree-sitter-examples/deno-arg-function.test.ts', {
        names: ['DenoArgFunction', 'DenoArgAsyncFunction', 'DenoArgArrowFunction', 'DenoArgArrowAsyncFunction'],
    });
});
