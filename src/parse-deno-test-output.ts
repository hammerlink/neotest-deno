// Script to parse Deno test output
// Usage: deno run parse-deno-test-output.ts <argument>

// Get command line arguments (excluding runtime and script name)
const args = Deno.args;

if (args.length === 0) {
    console.log('No arguments provided. Please provide an argument.');
    Deno.exit(1);
}
let text = await Deno.readTextFile(args[0]);
// Cleanse ISO control characters from the text
text = text.replace(ansiRegex(), '').replace(/\r\n/g, '\n');

type TestType = 'begin' | 'ignored' | 'failed' | 'ok';
interface TestData {
    logLines?: string[];
    logs?: string;
    type: TestType;
    durationMs?: number;
    errorLines?: string[];
    error?: string;
    testError?: TestErrorLine;
}
interface TestMap {
    [name: string]: TestData;
}

interface TestOutput {
    tests: TestMap;
    type: TestType;
    durationMs: number;
    text: string;
}

const TestMap: TestMap = {};

try {
    parseTestOutput(text);
    const hasFailures = Object.values(TestMap).some((test) => test.type === 'failed');
    const hasSuccess = Object.values(TestMap).some((test) => test.type === 'ok');
    const totalDurationMs = Object.values(TestMap).reduce((acc, test) => acc + (test.durationMs || 0), 0);
    const output: TestOutput = {
        tests: TestMap,
        type: hasFailures ? 'failed' : (hasSuccess ? 'ok' : 'ignored'),
        durationMs: totalDurationMs,
        text,
    };
    console.log(JSON.stringify(output, null, 2));
} catch (error) {
    console.log(JSON.stringify({ success: false, error: 'failed_to_parse' }, null, 2));
}

function parseTestOutput(text: string) {
    // Test variables
    const lines = text.split('\n');
    let logLines: string[] | null = null;
    let current: TestData | null = null;

    // Error variables
    let isErrorMode = false;
    let errorLines: string[] | null = null;
    let currentTestErrorLine: TestErrorLine | null = null;

    // line engine
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const testNameLine = isTestNameLine(line);
        if (testNameLine) {
            const { type, testName, durationMs } = testNameLine;
            if (type === 'begin') {
                TestMap[testName] = { logLines: [], type: 'begin' };
                current = TestMap[testName];
            } else {
                // reset
                logLines = null;
                current = null;

                const originalMap = TestMap[testName] || {};
                TestMap[testName] = {
                    ...originalMap,
                    type: testNameLine.type,
                    durationMs,
                    logs: originalMap.logLines?.join('\n'),
                    error: originalMap.errorLines?.join('\n'),
                };
            }
        } else if (line.includes('ERRORS')) { // HANDLE ERROR LOGS
            isErrorMode = true;
        } else if (isErrorMode) {
            const testErrorLine = isTestErrorLine(line, Object.keys(TestMap));
            if (testErrorLine && !currentTestErrorLine) {
                // start of error logs
                currentTestErrorLine = testErrorLine;

                const { testName, line: errorLine } = testErrorLine;
                const originalMap = TestMap[testName] || {};
                TestMap[testName] = {
                    ...originalMap,
                    errorLines: [...(originalMap.errorLines || []), errorLine],
                    testError: testErrorLine,
                };
                errorLines = TestMap[testName].errorLines!;
            } else if (testErrorLine && currentTestErrorLine) {
                // end of error logs
                currentTestErrorLine = null;
                errorLines = null;

                // store the error logs
                const originalMap = TestMap[testErrorLine.testName] || {};
                TestMap[testErrorLine.testName] = {
                    ...originalMap,
                    error: originalMap.errorLines?.join('\n'),
                };
            } else if (currentTestErrorLine) {
                // continue error logs
                errorLines?.push(line);
            }
        } else if (line.includes('------- output -------')) logLines = current?.logLines || null;
        else if (line.includes('----- output end -----')) logLines = null;
        else if (logLines) logLines?.push(line);
    }
}

function isTestNameLine(
    line: string,
): { type: TestType; durationMs: number; testName: string } | null {
    // example begin ignored: secondYTest ... ignored (0ms)
    // example begin failure/ok: secondTest ...
    // example end failure: secondTest ... FAILED (1ms)
    // example end ok: secondXTest ... ok (0ms)

    // Check for beginning of test (ends with "...")
    const beginMatch = line.match(/^(.+?)\s\.\.\.$/);
    if (beginMatch) {
        return {
            type: 'begin',
            durationMs: 0,
            testName: beginMatch[1].trim(),
        };
    }

    // Check for end of test with result
    const endMatch = line.match(/^(.+?)\s\.\.\.\s(FAILED|ok|ignored)\s\((\d+)ms\)$/);
    if (endMatch) {
        const testName = endMatch[1].trim();
        const resultType = endMatch[2].toLowerCase();
        const duration = parseInt(endMatch[3], 10);

        return {
            type: resultType === 'failed' ? 'failed' : (resultType as 'ignored' | 'ok'),
            durationMs: duration,
            testName: testName,
        };
    }

    return null;
}

type TestErrorLine = {
    testName: string;
    lineNumber: number;
    columnNumber: number;
    line: string;
};
function isTestErrorLine(line: string, testNames: string[]): TestErrorLine | null {
    for (let i = 0; i < testNames.length; i++) {
        const testName = testNames[i];
        const regex = new RegExp(`^${testName} => ([^:]+):(\d+):(\d+)$`);
        const match = line.match(regex);
        if (!match) continue;

        return {
            testName,
            lineNumber: parseInt(match[2], 10),
            columnNumber: parseInt(match[3], 10),
            line,
        };
    }
    return null;
}

export default function ansiRegex({ onlyFirst = false } = {}) {
    // Valid string terminator sequences are BEL, ESC\, and 0x9c
    const ST = '(?:\\u0007|\\u001B\\u005C|\\u009C)';
    const pattern = [
        `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
        '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
    ].join('|');

    return new RegExp(pattern, onlyFirst ? undefined : 'g');
}
