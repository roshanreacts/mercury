export interface FieldsMap {
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

export type AccessFields = Array<string | null>;
export type AccessKeys = "read" | "create" | "update" | "delete";

export interface verboseAccessFieldType {
  create: AccessFields;
  read: AccessFields;
  update: AccessFields;
  delete: AccessFields;
}

export interface verboseAccessType {
  create?: boolean | AccessFunctionType | AccessFields;
  read?: boolean | AccessFunctionType | AccessFields;
  update?: boolean | AccessFunctionType | AccessFields;
  delete?: boolean | AccessFunctionType | AccessFields;
}

export interface ResolversMap {
  [name: string]: Function;
}

export interface ModelResolvers {
  Query?: ResolversMap;
  Mutation?: ResolversMap;
}

export type VerboseAccessFunctionType = (args: any) => verboseAccessType | boolean;
export type AccessFunctionType = (args: any) => boolean | AccessFields;

export interface AccessType {
  default?: boolean;
  acl: Array<{
    [key: string]:
      | boolean
      | VerboseAccessFunctionType
      | AccessFunctionType
      | verboseAccessType;
  }>;
}

export interface HookType {
  beforeCreate?: Function;
  afterCreate?: Function;
  beforeUpdate?: Function;
  afterUpdate?: Function;
  beforeDelete?: Function;
  afterDelete?: Function;
}
export interface listSchema {
  access?: AccessType;
  fields: FieldMap;
  resolvers?: ModelResolvers;
  typeDefs?: string;
  public?: boolean | Function | verboseAccessType;
  hooks?: HookType;
}

export interface _model {
  _model: string;
}
export type schemaType = _model & listSchema;
