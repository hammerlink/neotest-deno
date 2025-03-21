export const DenoResultType = {
    OK: 'ok',
    FAILED: 'FAILED',
    IGNORED: 'ignored',
} as const;
export type DenoResultType = typeof DenoResultType[keyof typeof DenoResultType];
const denoResultTypes = Object.values(DenoResultType);
type TestPathLine = { testPath: string; count: number };
type TestNameLine = TestNameLineBegin | TestNameLineEnd;
type FailureLine = { testName: string; filePath: string; line: number; char: number };
type ErrorLine = FailureLine & { message: string; errorLog: string };
type TestNameLineBegin = { testName: string; isBegin: true };
type TestNameLineEnd = {
    testName: string;
    isBegin: false;
    type: DenoResultType;
    durationMs: number;
    failureLine?: FailureLine;
    errorLine?: ErrorLine;
};

export type TestOutput = {
    /** testPaths are relative to the working directory */
    testFiles: {
        [testPath: string]: TestPathLine & {
            tests: {
                [testName: string]: TestNameLineEnd & {
                    logs?: string;
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

export function parseFailureLine(line: string): FailureLine | null {
    const match = line.match(/^(.+) => (.+):([0-9]+):([0-9]+)$/);
    if (!match) return null;
    const [_line, testName, testPath, lineNumber, charNumber] = match;
    return { testName, filePath: testPath, line: parseInt(lineNumber, 10), char: parseInt(charNumber, 10) };
}

const isErrorsMarker = (line: string, lines: string[], lineIndex: number): boolean => {
    if (!line.startsWith(' ERRORS')) return false;
    if (lineIndex + 1 >= lines.length || lineIndex === 0) return false;
    return lines[lineIndex - 1].replace(/\s/g, '') === '' && lines[lineIndex + 1].replace(/\s/g, '') === '';
};
const isFailuresMarker = (line: string, lines: string[], lineIndex: number): boolean => {
    if (!line.startsWith(' FAILURES')) return false;
    if (lineIndex + 1 >= lines.length || lineIndex === 0) return false;
    return lines[lineIndex - 1].replace(/\s/g, '') === '' && lines[lineIndex + 1].replace(/\s/g, '') === '';
};

const readTestFileResult = (
    lines: string[],
    lineIndex: number,
    testOutput: TestOutput,
    pathLine: TestPathLine,
): { lineIndex: number } => {
    const { testPath, count } = pathLine;
    testOutput.testFiles[testPath] = { testPath, count, tests: {} };
    const testFile = testOutput.testFiles[testPath];

    for (let i = 0; i < count; i++) {
        const testNameLine = parseTestNameLine(lines[++lineIndex]);
        if (!testNameLine) throw new Error(`Expected test name line`);
        let logs: string | undefined = undefined;
        const testResult: TestNameLineEnd = testNameLine.isBegin
            ? (() => {
                if (!lines[++lineIndex].match(/------- (post-test )?output -------/)) {
                    throw new Error(`Expected post-test output ${lines.join('\n')}`);
                }
                while (lineIndex < lines.length) {
                    const logLine = lines[++lineIndex];
                    if (logLine.match(/----- (post-test )?output end -----/)) break;
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
    }
    return { lineIndex };
};

const readTestFilesBlock = (
    lines: string[],
    lineIndex: number,
    testOutput: TestOutput,
    pathLine: TestPathLine,
): { lineIndex: number } => {
    // once a test file path is encountered, keep reading test file paths
    let currentPathLine: TestPathLine | null = pathLine;
    while (currentPathLine) {
        lineIndex = readTestFileResult(lines, lineIndex, testOutput, currentPathLine).lineIndex;
        lineIndex++;
        currentPathLine = parsePathLine(lines[lineIndex]);
    }
    return { lineIndex };
};

const readErrorsBlock = (lines: string[], lineIndex: number, testOutput: TestOutput): { lineIndex: number } => {
    lineIndex += 2; // skip empty line

    let encounteredFailuresBlock = false;
    while (lineIndex < lines.length) {
        const failureLine = parseFailureLine(lines[lineIndex]);
        if (!failureLine) {
            // If we've reached a FAILURES marker or end of errors section, break
            if (isFailuresMarker(lines[lineIndex], lines, lineIndex)) {
                encounteredFailuresBlock = true;
                break;
            }
            lineIndex++;
            continue;
        }

        const { testName, filePath } = failureLine;

        // Move to the next line which should be the error message
        lineIndex++;
        const errorLine = lines[lineIndex];
        const message = errorLine.match(/error: (.+)/)?.[1] || 'Unknown error';

        // Collect the error message and stack trace
        const errorLines: string[] = [];

        // Continue collecting lines until we find the next failure or end of errors section
        while (lineIndex < lines.length) {
            const nextLine = lines[lineIndex];

            // Check if we've reached the next failure or end of errors section
            if (
                parseFailureLine(nextLine) ||
                isFailuresMarker(nextLine, lines, lineIndex)
            ) {
                encounteredFailuresBlock = isFailuresMarker(nextLine, lines, lineIndex);
                break;
            }

            errorLines.push(nextLine);
            lineIndex++;
        }
        // Find the line and char number of the error
        (() => {
            const rawPath = filePath.replace(/^\.\/?/, '');
            const lastMatch = errorLines.findLast((line) => line.includes(rawPath));
            if (!lastMatch) return;
            const match = lastMatch.match(/:([0-9]+):([0-9]+)\)?$/);
            if (!match) return;
            const [_line, lineNumber, charNumber] = match;
            failureLine.line = parseInt(lineNumber, 10);
            failureLine.char = parseInt(charNumber, 10);
        })();

        testOutput.testFiles[filePath].tests[testName].errorLine = {
            ...failureLine,
            message,
            errorLog: errorLines.join('\n'),
        };
    }

    if (encounteredFailuresBlock) lineIndex -= 1;

    return { lineIndex };
};
const readFailuresBlock = (lines: string[], lineIndex: number, testOutput: TestOutput): { lineIndex: number } => {
    lineIndex += 2; // skip empty line

    do {
        const failureLine = parseFailureLine(lines[lineIndex]);
        if (!failureLine) break;
        const { testName, filePath } = failureLine;
        testOutput.testFiles[filePath].tests[testName].failureLine = failureLine;

        lineIndex++;
    } while (lineIndex < lines.length);

    return { lineIndex };
};

export function parseTestOutput(text: string): TestOutput {
    // TODO handle errors because of tsc
    const output: TestOutput = { testFiles: {} };
    const lines = text.split('\n');

    let lineIndex = 0;

    for (lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const pathLine = parsePathLine(line);
        if (pathLine) {
            lineIndex = readTestFilesBlock(lines, lineIndex, output, pathLine).lineIndex;
        } else if (isErrorsMarker(line, lines, lineIndex)) {
            lineIndex = readErrorsBlock(lines, lineIndex, output).lineIndex;
        } else if (isFailuresMarker(line, lines, lineIndex)) {
            lineIndex = readFailuresBlock(lines, lineIndex, output).lineIndex;
        }
    }
    return output;
}
