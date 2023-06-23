# Postgrest OpenAPI specification to Zapier `FieldSchema`

This script generates Zapier `FieldSchema`s from Postgrest OpenAPI specification
files.

Zapier `FieldSchema`:
https://github.com/zapier/zapier-platform/blob/main/packages/schema/docs/build/schema.md#fieldschema

Postgrest OpenAPI:
https://postgrest.org/en/stable/references/api/openapi.html

First, place a file named `spec.json` to the repository directory containing the
OpenAPI specification.

Next, run `node .` to run the script.
