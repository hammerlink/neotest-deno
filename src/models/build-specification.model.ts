/**
 * Interface representing a build specification for Deno tests
 */
export interface BuildSpecification {
    /**
     * Command to execute, including the program and its arguments
     */
    command: string[];

    /**
     * Current working directory
     */
    cwd: string;

    /**
     * Context information for the test
     */
    context: {
        /**
         * File path of the test
         */
        file: string;

        /**
         * Position identifier, which can be either:
         * - The file path (for running all tests in a file)
         * - The directory path (for running all tests in a directory)
         * - The file path followed by '::' and the test name (for running specific tests)
         * Example: "/path/to/file.test.ts" or "/path/to/file.test.ts::testName"
         */
        position_id: string;
    };

    /**
     * Strategy configuration for test execution
     */
    strategy: {
        /**
         * Height configuration value
         */
        height: number;

        /**
         * Width configuration value
         */
        width: number;
    };
}

// Example usage:
// const buildSpec: BuildSpecification = {
//   command: ["deno", "test", "--allow-all", "--reporter=pretty", "/home/hendrik/Projects/deno-dap/sub/second.test.ts"],
//   context: {
//     file: "/home/hendrik/Projects/deno-dap/sub/second.test.ts",
//     position_id: "/home/hendrik/Projects/deno-dap/sub/second.test.ts"
//   },
//   strategy: {
//     height: 40,
//     width: 120
//   }
// };
//
// dir sample
//
//  command = { "deno", "test", "--allow-all", "--reporter=pretty", "/home/hendrik/Projects/deno-dap/sub" },
//  context = {
//    file = "/home/hendrik/Projects/deno-dap/sub",
//    position_id = "/home/hendrik/Projects/deno-dap/sub"
//  },
//  strategy = {
//    height = 40,
//    width = 120
//  }
//}
// specific test example
//{   command = { "deno", "test", "--allow-all", "--reporter=pretty", "--filter", "addTest", "/home/hendrik/Projects/deno-dap/sub/second.test.ts" },
//  context = {
//    file = "/home/hendrik/Projects/deno-dap/sub/second.test.ts",
//    position_id = "/home/hendrik/Projects/deno-dap/sub/second.test.ts::addTest"
//  },
//  strategy = {
//    height = 40,
//    width = 120
//  }
//}
