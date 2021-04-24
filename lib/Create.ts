import _ from "lodash";
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
    let mergedResolver = getResolver;
    if (reqSchema.resolvers != null) {
      mergedResolver = this.replaceresolvers(reqSchema.resolvers, getResolver);
    }
    return {
      schema: getSchema.schema,
      resolver: mergedResolver,
      models: dbModels,
    };
  }

  replaceresolvers(
    customResolvers: ModelResolvers,
    defaultResolvers: ModelResolvers
  ): ModelResolvers {
    const mergeQuery = _.assign(defaultResolvers.Query, customResolvers.Query);
    const mergeMutation = _.assign(
      defaultResolvers.Mutation,
      customResolvers.Mutation
    );
    return { Query: mergeQuery, Mutation: mergeMutation };
  }
}

export default Create;
