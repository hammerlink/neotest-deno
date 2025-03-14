import { assert, assertEquals } from '@std/assert';
import { parsePathLine, parseTestNameLine, parseTestOutput } from './test-output.engine.ts';
import { dirname, fromFileUrl, join } from 'jsr:@std/path';

Deno.test('parsePathLine', () => {
    (() => {
        const result = parsePathLine('running 1 test from ./sub/second.test.ts');
        assert(result !== null);
        assertEquals(result.count, 1);
        assertEquals(result.testPath, './sub/second.test.ts');
    })();
    //
    (() => {
        const result = parsePathLine('running 4 tests from ./sub/second_test.ts');
        assert(result !== null);
        assertEquals(result.count, 4);
        assertEquals(result.testPath, './sub/second_test.ts');
    })();

    (() => {
        const result = parsePathLine('running 200000 test from ./sub/1/second.test.ts');
        assert(result !== null);
        assertEquals(result.count, 200000);
        assertEquals(result.testPath, './sub/1/second.test.ts');
    })();

    assertEquals(parsePathLine('running x1 test from ./sub/second.test.ts'), null);

    assertEquals(parsePathLine('RUNNING 1 test from ./sub/second.test.ts'), null);
});

Deno.test('parseTestNameLine', () => {
    (() => {
        const result = parseTestNameLine('secondTest ...');
        assert(result !== null);
        assertEquals(result.testName, 'secondTest');
        assertEquals(result.isBegin, true);
    })();

    (() => {
        const result = parseTestNameLine('secondTest ... FAILED (504ms)');
        assert(result !== null);
        assertEquals(result.testName, 'secondTest');
        if (result.isBegin) throw new Error('Expected isBegin to be false');
        assertEquals(result.type, 'FAILED');
        assertEquals(result.durationMs, 504);
    })();

    (() => {
        const result = parseTestNameLine('secondTest ... ok (504ms)');
        assert(result !== null);
        assertEquals(result.testName, 'secondTest');
        if (result.isBegin) throw new Error('Expected isBegin to be false');
        assertEquals(result.type, 'ok');
        assertEquals(result.durationMs, 504);
    })();

    (() => {
        const result = parseTestNameLine('secondTest ... ignored (0ms)');
        assert(result !== null);
        assertEquals(result.testName, 'secondTest');
        if (result.isBegin) throw new Error('Expected isBegin to be false');
        assertEquals(result.type, 'ignored');
        assertEquals(result.durationMs, 0);
    })();
});

Deno.test('parseTestOutput', () => {
    const FILE_DIR = dirname(fromFileUrl(import.meta.url));
    const text = Deno.readTextFileSync(join(FILE_DIR, '../data/example-dir-output'));
    const result = parseTestOutput(text);
    const testFiles = Object.keys(result.testFiles);
    assertEquals(testFiles[0], './sub/second.test.ts');
    assertEquals(testFiles[1], './sub/second_test.ts');
    assertEquals(testFiles.length, 2);

    // check second.test.ts
    const secondTest = result.testFiles['./sub/second.test.ts'];
    const secondTestTests = Object.keys(secondTest.tests);
    assertEquals(secondTestTests.length, 1);
    assertEquals(secondTestTests[0], 'addTest');
    assertEquals(secondTest.tests['addTest'].type, 'ok');
    assertEquals(secondTest.tests['addTest'].durationMs, 0);
    assertEquals(secondTest.tests['addTest'].logs, undefined);

    // check second_test.ts
    const second_test = result.testFiles['./sub/second_test.ts'];
    const second_testTests = Object.keys(second_test.tests);
    assertEquals(second_testTests.length, 4);
    
    assertEquals(second_testTests[0], 'secondTest');
    let currentTest = second_test.tests['secondTest'];
    assertEquals(currentTest.type, 'FAILED');
    assertEquals(currentTest.durationMs, 504);
    assertEquals(currentTest.logs, ['custom log', 'custom log 1'].join('\n'));

    assertEquals(second_testTests[1], 'secondXTest');
    currentTest = second_test.tests['secondXTest'];
    assertEquals(currentTest.type, 'ok');
    assertEquals(currentTest.durationMs, 0);
    assertEquals(currentTest.logs, ['x x x'].join('\n'));

    assertEquals(second_testTests[2], 'second - YTest');
    currentTest = second_test.tests['second - YTest'];
    assertEquals(currentTest.type, 'ignored');
    assertEquals(currentTest.durationMs, 0);
    assertEquals(currentTest.logs, undefined);

    assertEquals(second_testTests[3], 'secondZTest');
    currentTest = second_test.tests['secondZTest'];
    assertEquals(currentTest.type, 'ignored');
    assertEquals(currentTest.durationMs, 0);
    assertEquals(currentTest.logs, undefined);
});
