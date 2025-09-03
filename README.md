# Kernel Documentation

<p align="left">
  <img alt="GitHub License" src="https://img.shields.io/github/license/onkernel/docs">
  <a href="https://discord.gg/FBrveQRcud"><img src="https://img.shields.io/discord/1342243238748225556?logo=discord&logoColor=white&color=7289DA" alt="Discord"></a>
  <a href="https://x.com/juecd__"><img src="https://img.shields.io/twitter/follow/juecd__" alt="Follow @juecd__"></a>
  <a href="https://x.com/rfgarcia"><img src="https://img.shields.io/twitter/follow/rfgarcia" alt="Follow @rfgarcia"></a>
</p>

This is the documentation for the Kernel platform. It's connected to [docs.onkernel.com](https://docs.onkernel.com).

## Code Snippets

Code samples in the docs are generated from our OpenAPI spec so the examples stay in sync with the API. There are two ways the generator is invoked:

- Custom MDX tag: use `<OpenAPICodeGroup>get /api/v1/users</OpenAPICodeGroup>` (or omit the verb to use the default behavior).

How the generator works (current behavior):

- The script is `.github/scripts/generate_code_samples.ts` and is executed with Bun. It fetches the OpenAPI spec from the URL configured at the top of that script.
- It reads `x-codeSamples` entries for each operation and extracts samples for TypeScript/JavaScript and Python. Samples are normalized and may be transformed by simple "overrides" (see the script for the override parsing and injection heuristics).
- It writes snippet files under `snippets/openapi/` as MDX files containing a `<CodeGroup>` with the generated code fences. It also updates any MDX files under `apps/` and `browsers/` that contain the inline or tag forms by replacing them with the generated `<CodeGroup>` blocks.
- The generator can produce a base snippet and additional variant snippets controlled by `.github/scripts/code_samples.config.json` (variants are keyed by `"method /path"`).
- The script also removes stale snippet files matching the `-.mdx` suffix pattern.

How it affects the repository:

- New or updated files are created under `snippets/openapi/*.mdx`.
- MDX pages in `apps/` and `browsers/` may be modified in-place to replace `<OpenAPICodeGroup>`/mustache tags with generated `<CodeGroup>` blocks.
- A GitHub Action (`.github/workflows/generate_code_snippets.yaml`) runs the script on push (except to `main`), commits any changes, and pushes them to the `gh_action_generated_docs` branch so Mintlify can deploy the generated docs.

Notes and gotchas:

- The generator runs remotely against the OpenAPI URL defined in the script, so it needs network access and the spec to include `x-codeSamples` for useful output.
- The override parsing and code injection are heuristic — complex sample sources might not be transformed exactly as intended. See the script for details on how keys/`log` overrides are applied.
- The GitHub Action installs Bun and runs the script; if you run it locally, install Bun and run `bun run .github/scripts/generate_code_samples.ts` from the repo root.

Example: to add a snippet placeholder to a page, add `<OpenAPICodeGroup>get /api/v1/users</OpenAPICodeGroup>` and let the generator fill `snippets/openapi` and update the page during the next run.

## Local Development

To run the docs locally, you can use the following command:

```bash
mintlify dev
```

## Contributing

We welcome contributions to the documentation. Please feel free to submit a pull request with your changes. See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
