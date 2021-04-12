import Generate from "./Generate";

class Create {
  private mercury;
  constructor(mercury: Mercury) {
    this.mercury = mercury;
  }

  createList(reqSchema: schemaType) {
    const generate = new Generate(reqSchema);
    const getSchema = generate.grpahqlSchema();
    const dbModels = generate.mongoModel();
    const getResolver = generate.graphqlResolver(
      getSchema.query,
      getSchema.mutation,
      dbModels.mongoModel
    );
    return {
      schema: getSchema.schema,
      resolver: getResolver,
      models: dbModels,
    };
  }
}

export default Create;
