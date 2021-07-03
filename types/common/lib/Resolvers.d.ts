interface Resolvers {
  generate: Generate;
  modelName: string;
  modelFields: FieldsMap;
}

type PopulateType = Array<{ path: string; select: string; options?: any }>;
