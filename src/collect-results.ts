import { BuildSpecificationResult } from './models/build-specification-result.model.ts';
import { BuildSpecification } from './models/build-specification.model.ts';

try {
    const args = Deno.args;

    if (args.length !== 2) {
        throw new Error('Invalid number of arguments provided. Please provide exactly two arguments.');
    }

    const outputFilePath = await Deno.readTextFile(args[0]);

    const input: BuildSpecification = JSON.parse(args[1]);

    const output: BuildSpecificationResult = {
        [input.context.position_id]: {
            status: 'passed',
            errors: {},
        },
    };

    console.log(JSON.stringify(output));
} catch (error) {
    console.error(error);
    Deno.exit(1);
}
