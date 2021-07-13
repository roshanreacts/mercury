interface FieldsMap {
  [name: string]: {
    type: string;
    isRequired?: boolean;
    default?: any;
    ignoreGraphql?: ignoreGraphqlType;
    renameGraphql?: string;
    updatable?: boolean;
    many?: boolean;
    ref?: string;
    enum?: Array<string | number>;
    enumType?: string;
    unique?: boolean;
    bcrypt?: boolean;
    rounds?: boolean;
    graphqlType?: string;
    localField?: string;
    foreignField?: string;
  };
}

interface ignoreGraphqlType {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
}

interface ResolversMap {
  [name: string]: Function;
}

interface ModelResolvers {
  Query?: ResolversMap;
  Mutation?: ResolversMap;
}

interface schemaType {
  _model: string;
  fields: FieldMap;
  resolvers?: ModelResolvers;
  typeDefs?: string;
}
