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

type AccessFields = Array<string | null>;
type AccessKeys = "read" | "create" | "update" | "delete";

interface verboseAccessFieldType {
  create: AccessFields;
  read: AccessFields;
  update: AccessFields;
  delete: AccessFields;
}

interface verboseAccessType {
  create?: boolean | AccessFunctionType | AccessFields;
  read?: boolean | AccessFunctionType | AccessFields;
  update?: boolean | AccessFunctionType | AccessFields;
  delete?: boolean | AccessFunctionType | AccessFields;
}

interface ResolversMap {
  [name: string]: Function;
}

interface ModelResolvers {
  Query?: ResolversMap;
  Mutation?: ResolversMap;
}

type VerboseAccessFunctionType = (args: any) => verboseAccessType | boolean;
type AccessFunctionType = (args: any) => boolean | AccessFields;

interface AccessType {
  default?: boolean;
  acl: Array<{
    [key: string]:
      | boolean
      | VerboseAccessFunctionType
      | AccessFunctionType
      | verboseAccessType;
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
