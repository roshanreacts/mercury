export interface Generate {
  _mercury: Mercury;
  schema: schemaType;
  modelName: string;
  modelFields: FieldsMap;
  getFieldType: Function;
}
