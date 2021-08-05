interface FieldsMap {
  [name: string]: {
    type: string;
    isRequired?: boolean;
    default?: any;
    ignoreGraphql?: verboseAccessType;
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

interface verboseAccessType {
  create?: boolean | Function;
  read?: boolean | Function;
  update?: boolean | Function;
  delete?: boolean | Function;
}

interface ResolversMap {
  [name: string]: Function;
}

interface ModelResolvers {
  Query?: ResolversMap;
  Mutation?: ResolversMap;
}

type AccessFunctionType = (args: any) => verboseAccessType | boolean;

interface AccessType {
  default?: boolean;
  acl: Array<{
    [key: string]: boolean | AccessFunctionType | verboseAccessType;
  }>;
}

interface HookType {
  beforeCreate?: Function;
  afterCreate?: Function;
  beforeUpdate?: Function;
  afterUpdate?: Function;
  beforeDelete?: Function;
  afterDelete?: Function;
}
interface listSchema {
  access?: AccessType;
  fields: FieldMap;
  resolvers?: ModelResolvers;
  typeDefs?: string;
  public?: boolean | Function | verboseAccessType;
  hooks?: HookType;
}

interface _model {
  _model: string;
}
type schemaType = _model & listSchema;
