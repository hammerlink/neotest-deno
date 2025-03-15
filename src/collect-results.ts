import { join } from 'jsr:@std/path/join';
import { parseTestOutput } from './engine/test-output.engine.ts';
import { BuildSpecificationResult, TestErrorLine, TestStatus } from './models/build-specification-result.model.ts';
import { BuildSpecification } from './models/build-specification.model.ts';
import { ansiRegex } from './engine/text.engine.ts';
import { dirname, fromFileUrl } from 'jsr:@std/path';

const FILE_DIR = dirname(fromFileUrl(import.meta.url));
const OUTPUT_DIR = join(FILE_DIR, './data/output/');
// TOGGLE TO INSPECT DENO TEST OUTPUT
const TOGGLE_TEST_OUTPUT_CAPTURE = false;

try {
    const args = Deno.args;

    if (args.length !== 2) {
        throw new Error('Invalid number of arguments provided. Please provide exactly two arguments.');
    }

    let testOutputText = await Deno.readTextFile(args[0]);
    testOutputText = testOutputText.replace(ansiRegex(), '').replace(/\r\n/g, '\n');

    // write output

    if (TOGGLE_TEST_OUTPUT_CAPTURE) {
        Deno.mkdirSync(OUTPUT_DIR, { recursive: true });
        Deno.writeTextFileSync(
            join(OUTPUT_DIR, `deno-test-log-${new Date().toISOString().replace(/\s/g, '')}`),
            testOutputText,
        );
    }

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
                errors: test.errorLine
                    ? [
                        {
                            message: test.errorLine.message,
                            line: test.errorLine.line - (test.errorLine.line > 0 ? 1 : 0),
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
