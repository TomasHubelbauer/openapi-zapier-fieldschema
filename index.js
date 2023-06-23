import fs from 'node:fs';

const data = JSON.parse(await fs.promises.readFile('spec.json'));

try {
  await fs.promises.rm('field-schemas', { recursive: true });
}
catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

await fs.promises.mkdir('field-schemas');

for (const collection in data.paths) {
  // Skip the introspection endpoint
  if (collection === '/') {
    continue;
  }

  // Skip RPCs as they do not map to a specific collection
  if (collection.startsWith('/rpc/')) {
    continue;
  }

  const ref = data.paths[collection].get?.responses?.['200']?.schema?.items?.$ref;
  if (!ref) {
    throw new Error(`Could not find a model reference for ${collection.slice('/'.length)}`);
  }

  if (!ref.startsWith('#/definitions/')) {
    throw new Error(`Unexpected reference format: ${ref}`);
  }

  const model = data.definitions?.[ref.slice('#/definitions/'.length)];
  if (!model) {
    throw new Error(`Could not find a model for ${ref}`);
  }

  if (model.type !== 'object') {
    throw new Error(`Unexpected model type '${model.type}', expected object`);
  }

  const schema = [];
  for (const property in model.properties) {
    const field = { key: property };

    // Note that the Postgrest OpenAPI spec does not contain user-friendly names
    field.label = undefined;

    field.helpText = model.properties[property].description;

    switch (model.properties[property].type) {
      // TODO: Distinguish between `string` and `text` based on `maxLength`
      case 'string': {
        // TODO: Handle `public.` references here somehow?  Maybe using `children`?
        switch (model.properties[property].format) {
          case 'text': {
            field.type = 'text';
            break;
          }
          case 'uuid': {
            // Note that Zapier FieldSchema does not have a special type for UUIDs
            field.type = 'text';
            break;
          }
          case 'timestamp with time zone': {
            field.type = 'datetime';
            break;
          }
          default: {
            throw new Error(`Unexpected string property format '${model.properties[property].format}' for ${property} in ${collection.slice('/'.length)}`);
          }
        }

        break;
      }
      case 'boolean': {
        field.type = 'boolean';
        break;
      }
      case 'integer': {
        field.type = 'integer';
        break;
      }
      case undefined: {
        switch (model.properties[property].format) {
          case 'jsonb': {
            field.type = 'file';
            break;
          }
          default: {
            throw new Error(`Unexpected undefined property format '${model.properties[property].format}' for ${property} in ${collection.slice('/'.length)}`);
          }
        }

        break;
      }
      default: {
        throw new Error(`Unexpected property type '${model.properties[property].type}' for ${property} in ${collection.slice('/'.length)}`);
      }
    }

    field.required = model.required?.includes(property);

    // Note that the Postgrest OpenAPI specification has no example values
    field.placeholder = undefined;

    // TODO: Hook up the rest of the `FieldSchema` properties
    // See https://github.com/zapier/zapier-platform/blob/main/packages/schema/docs/build/schema.md#fieldschema

    schema.push(field);
  }

  await fs.promises.writeFile(`field-schemas/${collection.slice('/'.length)}.json`, JSON.stringify(schema, null, 2));
  console.log(`Wrote field schemas for ${collection.slice('/'.length)} to field-schemas/${collection.slice('/'.length)}.json`);
}
