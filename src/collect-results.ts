import { join } from 'jsr:@std/path/join';
import { parseTestOutput } from './engine/test-output.engine.ts';
import { BuildSpecificationResult, TestErrorLine, TestStatus } from './models/build-specification-result.model.ts';
import { BuildSpecification } from './models/build-specification.model.ts';
import { ansiRegex } from './engine/text.engine.ts';

try {
    const args = Deno.args;

    if (args.length !== 2) {
        throw new Error('Invalid number of arguments provided. Please provide exactly two arguments.');
    }

    let testOutputText = await Deno.readTextFile(args[0]);
    testOutputText = testOutputText.replace(ansiRegex(), '').replace(/\r\n/g, '\n');

    const input: BuildSpecification = JSON.parse(args[1]);
    const positionId = input.context.position_id;
    const { testDir, testName } = (() => {
        const pieces = positionId.split('::');
        if (pieces.length === 1) {
            return { testDir: pieces[0], testName: undefined };
        } else {
            return { testDir: pieces[0], testName: pieces[1] };
        }
    })();
    const isSingleTest = testName !== undefined;

    const output: BuildSpecificationResult = {};

    const testOutput = parseTestOutput(testOutputText);
    for (const testFile of Object.values(testOutput.testFiles)) {
        const testFileAbsPath = join(input.cwd, testFile.testPath);
        if (!testFileAbsPath.includes(testDir)) continue;

        for (const test of Object.values(testFile.tests)) {
            if (isSingleTest && test.testName !== testName) continue;

            const positionId = `${testFileAbsPath}::${test.testName}`;

            output[positionId] = {
                status: ((): TestStatus => {
                    if (test.type === 'ok') return 'passed';
                    if (test.type === 'ignored') return 'skipped';
                    return 'failed';
                })(),
                errors: test.failureLine
                    ? [
                        {
                            message: 'Test Failed TODO extract error',
                            line: test.failureLine.line,
                        } satisfies TestErrorLine,
                    ]
                    : [],
            };
        }
    }

    console.log(JSON.stringify(output, null, 2));
} catch (error) {
    console.error(error);
    Deno.exit(1);
}
