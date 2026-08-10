/**
 * @file cli.ts
 * @description `heyapi-grab` command: generate a typed SDK from an OpenAPI
 * spec and wire it to the grab-powered Hey API client.
 */

import {
  CLIENT_PACKAGE,
  generateFromOpenAPI,
  rewireGeneratedClient,
} from "./generate";

const HELP = `
heyapi-grab — generate an OpenAPI SDK that sends its requests with grab

Usage
  npx heyapi-grab <spec> [output] [options]

Options
  -i, --input <path|url>   OpenAPI spec to generate from
  -o, --output <dir>       Where to write the SDK        default ./src/client
  -c, --client <name>      Hey API client to generate against
                                                default @hey-api/client-fetch
  --rewire-only            Skip generation, only rewire an existing output dir
  --no-rewire              Generate without swapping in the grab client
  -h, --help               Show this message

Any other option is forwarded to the openapi-ts CLI.

Examples
  npx heyapi-grab https://petstore3.swagger.io/api/v3/openapi.json ./src/api
  npx heyapi-grab -i ./openapi.yaml -o ./src/client
  npx heyapi-grab --rewire-only ./src/client
`;

/**
 * Parses argv into generation options, treating unknown flags as passthrough.
 *
 * @param argv - Arguments after the command name.
 */
const parseArgs = (argv: string[]) => {
  const positional: string[] = [];
  const passthrough: string[] = [];
  let input = "";
  let output = "";
  let client = "";
  let rewire = true;
  let rewireOnly = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "-h":
      case "--help":
        help = true;
        break;
      case "-i":
      case "--input":
        input = argv[++i];
        break;
      case "-o":
      case "--output":
        output = argv[++i];
        break;
      case "-c":
      case "--client":
        client = argv[++i];
        break;
      case "--no-rewire":
        rewire = false;
        break;
      case "--rewire-only":
        rewireOnly = true;
        break;
      default:
        if (arg.startsWith("-")) {
          passthrough.push(arg);
          // Keep the flag's value with it when one follows.
          if (argv[i + 1] && !argv[i + 1].startsWith("-")) passthrough.push(argv[++i]);
        } else {
          positional.push(arg);
        }
    }
  }

  return {
    client,
    help,
    input: input || positional[0] || "",
    output: output || (input ? positional[0] : positional[1]) || "",
    passthrough,
    rewire,
    rewireOnly,
  };
};

/** Runs the CLI. */
export const main = async (argv: string[] = process.argv.slice(2)) => {
  const options = parseArgs(argv);

  if (options.help || (!options.input && !options.rewireOnly)) {
    console.log(HELP);
    process.exit(options.help ? 0 : 1);
  }

  if (options.rewireOnly) {
    const target = options.output || options.input || "./src/client";
    const rewired = rewireGeneratedClient(target);
    console.log(
      `✓ Rewired ${rewired.length} file(s) in ${target} to use ${CLIENT_PACKAGE}`,
    );
    return;
  }

  const result = await generateFromOpenAPI({
    args: options.passthrough,
    client: options.client || undefined,
    input: options.input,
    output: options.output || undefined,
    rewire: options.rewire,
  });

  console.log(
    options.rewire
      ? `✓ Generated ${result.output} — requests are sent by grab (${result.rewired.length} file(s) rewired)`
      : `✓ Generated ${result.output}`,
  );
};

main().catch((error) => {
  console.error(`✗ ${error?.message || error}`);
  process.exit(1);
});
