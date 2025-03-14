export const DenoResultType = {
    OK: 'ok',
    FAILED: 'FAILED',
    IGNORED: 'ignored',
} as const;
export type DenoResultType = typeof DenoResultType[keyof typeof DenoResultType];
const denoResultTypes = Object.values(DenoResultType);
type TestPathLine = { testPath: string; count: number };
type TestNameLine = TestNameLineBegin | TestNameLineEnd;
type TestNameLineBegin = { testName: string; isBegin: true };
type TestNameLineEnd = { testName: string; isBegin: false; type: DenoResultType; durationMs: number };

export type TestOutput = {
    testFiles: {
        [testPath: string]: TestPathLine & {
            tests: {
                [testName: string]: TestNameLineEnd & {
                    logs?: string;
                    errors?: string; // todo might need error lines & logs
                };
            };
        };
    };
};

// keep running this, if no encounters -> no results
export function parsePathLine(line: string): TestPathLine | null {
    const match = line.match(/^running (\d+) tests? from (.+)$/);
    if (!match) return null;
    const [_line, testCount, testPath] = match;
    return { testPath, count: parseInt(testCount, 10) };
}

export function parseTestNameLine(line: string): TestNameLine | null {
    const match = line.match(/^(.+?)\s\.\.\./);
    if (!match) return null;
    const [testMatch, testName] = match;
    const endMatch = line.replace(testMatch, '').match(/^\s(FAILED|ok|ignored)\s\((\d+)ms\)$/);
    if (!endMatch) {
        return { testName, isBegin: true };
    }
    const [_, type, durationMs] = endMatch;
    if (!denoResultTypes.includes(type as DenoResultType)) {
        throw new Error(`Unknown test result type: ${type}`);
    }
    return { testName, isBegin: false, type: type as DenoResultType, durationMs: parseInt(durationMs, 10) };
}

export function parseTestOutput(text: string): TestOutput {
    const output: TestOutput = { testFiles: {} };
    const lines = text.split('\n');

    let lineIndex = 0;
    let hasEncounteredPaths = false;

    for (lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const pathLine = parsePathLine(line);
        if (pathLine) {
            hasEncounteredPaths = true;
            const { testPath, count } = pathLine;
            output.testFiles[testPath] = { testPath, count, tests: {} };
            const testFile = output.testFiles[testPath];

            for (let i = 0; i < count; i++) {
                const testNameLine = parseTestNameLine(lines[++lineIndex]);
                if (!testNameLine) throw new Error(`Expected test name line`);
                let logs: string | undefined = undefined;
                const testResult: TestNameLineEnd = testNameLine.isBegin
                    ? (() => {
                        if (!lines[++lineIndex].includes('------- post-test output -------')) {
                            throw new Error('Expected post-test output');
                        }
                        while (lineIndex < lines.length) {
                            const logLine = lines[++lineIndex];
                            if (logLine.includes('----- post-test output end -----')) break;
                            logs = logs !== undefined ? logs + '\n' + logLine : logLine;
                        }
                        const endLine = lines[++lineIndex];
                        const endTestNameLine = parseTestNameLine(endLine);
                        if (!endTestNameLine) throw new Error(`Expected end test name line`);
                        if (endTestNameLine.testName !== testNameLine.testName) {
                            throw new Error('Expected test name to match');
                        }
                        if (endTestNameLine.isBegin) throw new Error('Expected end test name line to be end');
                        return endTestNameLine;
                    })()
                    : testNameLine;
                testFile.tests[testResult.testName] = { ...testResult, logs };

                //const { testName, isBegin, ...rest } = testNameLine;
                //testFile.tests[testName] = {
                //    testName,
                //    type: 'ignored',
                //    durationMs: 0,
                //    logs: '',
                //    errors: '',
                //    isBegin: false,
                //};
                //if (isBegin) {
                //    // capture logs
                //    output.testFiles[testPath].tests[testName] = { testName, ...rest, logs: '', errors: '' };
                //} else {
                //    const test = output.testFiles[testPath].tests[testName];
                //    if (!test) throw new Error('Expected test to exist');
                //    output.testFiles[testPath].tests[testName] = { ...test, ...rest };
                //}
            }
        }
    }
    if (!hasEncounteredPaths) throw new Error('No test paths found in output');
    // todo handle errors

    return output;
}
