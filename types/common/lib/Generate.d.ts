interface Generate {
  schema: schemaType;
  modelName: string;
  modelFields: FieldsMap;
  getFieldType: Function;
}
