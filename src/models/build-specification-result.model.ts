export type TestStatus = 'skipped' | 'passed' | 'failed' | 'filtered';

/**
 * Represents the result of a specific test
 */
export interface TestResult {
    errors: TestErrorLine[];
    /** Path to file containing full output data */
    output?: string;
    status: TestStatus;
}

export interface TestErrorLine {
    message: string;
    line?: number;
}

/**
 * Represents the result of a test directory
 */
export interface TestDirectoryResult {
    short?: string;
    status: TestStatus;
}

/**
 * Represents the build specification result
 * Maps test paths or directory paths to their respective results
 *
 * Examples:
 *
 * Specific test:
 * {
 *   "/home/user/project/test.ts::testName": {
 *     errors: {},
 *     status: "passed"
 *   }
 * }
 *
 * Test directory:
 * {
 *   "/home/user/project/tests": {
 *     short: "Error parsing test results",
 *     status: "failed"
 *   }
 * }
 */
export interface BuildSpecificationResult {
    [path: string]: TestResult | TestDirectoryResult;
}
