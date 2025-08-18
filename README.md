# Kernel Documentation

<p align="left">
  <img alt="GitHub License" src="https://img.shields.io/github/license/onkernel/docs">
  <a href="https://discord.gg/FBrveQRcud"><img src="https://img.shields.io/discord/1342243238748225556?logo=discord&logoColor=white&color=7289DA" alt="Discord"></a>
  <a href="https://x.com/juecd__"><img src="https://img.shields.io/twitter/follow/juecd__" alt="Follow @juecd__"></a>
  <a href="https://x.com/rfgarcia"><img src="https://img.shields.io/twitter/follow/rfgarcia" alt="Follow @rfgarcia"></a>
</p>

This is the documentation for the Kernel platform. It's connected to [docs.onkernel.com](https://docs.onkernel.com).

## Code Snippets

In order to sync our code snippets in our docs ( not playground ) with the OpenAPI spec, we put `<OpenAPICodeGroup>[get|put|post|delete] [path]` in the docs.

For example, if we want to add a code snippet for the `GET /api/v1/users` endpoint, we would put `<OpenAPICodeGroup>get /api/v1/users` in the docs.

We then use a GitHub Action to generate the code snippets from the docs and push them to the `gh_action_generated_docs` branch. Mintlify will then deploy the docs from that branch.

## Local Development

To run the docs locally, you can use the following command:

```bash
mintlify dev
```

## Contributing

We welcome contributions to the documentation. Please feel free to submit a pull request with your changes. See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
