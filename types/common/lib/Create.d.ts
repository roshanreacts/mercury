interface FieldsMap {
  [name: string]: {
    type: string;
    isRequired?: boolean;
    default?: any;
    skipGraphql?: boolean;
    renameGraphql?: string;
    updatable?: boolean;
  };
}

interface ResolversMap {
  [name: string]: Function;
}

interface schemaType {
  _model: string;
  fields: FieldMap;
}
