# @noma/config

Typed configuration contracts with explicit `./public` and `./server` entry points.

- Browser code may import only `@noma/config/public`.
- API and Worker code use `@noma/config/server`.
- This package defines shapes and boundaries; it never stores secret values.
- Environment parsing and startup validation are implemented in DEV-003.
