import _ from "lodash";
import { Schema, model } from "mongoose";
import Resolvers from "./Resolvers";

const fieldsTypeMap = [
  { type: "string", value: "String" },
  { type: "number", value: "Int" },
  { type: "boolean", value: "Boolean" },
  { type: "float", value: "Float" },
  { type: "enum", value: "enum" },
  { type: "date", value: "DateTime" },
  { type: "relationship", value: "relationship" },
];

const mongoFieldsTypeMap = [
  { type: "string", value: "String" },
  { type: "number", value: "Number" },
  { type: "float", value: Schema.Types.Decimal128 },
  { type: "boolean", value: "Boolean" },
  { type: "date", value: Date },
  { type: "enum", value: "enum" },
  { type: "relationship", value: Schema.Types.ObjectId },
];

class Generate {
  adapter: DbAdapter;
  modelName: string;
  modelFields: FieldsMap;
  genSchema: Array<string>;
  addGrpahqlSchema: string[];
  constructor(schema: schemaType, adapter: DbAdapter) {
    this.adapter = adapter;
    this.modelName = schema._model;
    this.modelFields = schema.fields;
    this.genSchema = [];
    this.addGrpahqlSchema = [];
  }

  Resolvers(): Resolvers {
    return new Resolvers(this);
  }

  grpahqlSchema() {
    const queries: Array<string> = [];
    const mutation: Array<string> = [];

    this.genSchema.push(``);

    // ********* Generate Queries **********
    this.genSchema.push(`type Query {`);
    // get All of the Model
    this.genSchema.push(
      `  all${this.modelName}s(where: where${this.modelName}Input): [${this.modelName}]`
    );
    // get one item from the model
    this.genSchema.push(
      `  get${this.modelName}(where: where${this.modelName}Input): ${this.modelName}`
    );
    this.genSchema.push(`}`);
    this.genSchema.push(``);

    // Queries whereInput types
    this.genSchema.push(`input where${this.modelName}Input {`);
    this.genSchema.push(this.generateWhereInput("id", "ID"));
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      const fieldType = this.getFieldType(fieldObj.type);
      if (fieldType && fieldType !== "scalar" && typeof fieldType == "string") {
        this.genSchema.push(this.generateWhereInput(fieldName, fieldType));
      }
    });
    this.genSchema.push(`  AND: [where${this.modelName}Input]`);
    this.genSchema.push(`  OR: [where${this.modelName}Input]`);
    this.genSchema.push(`}`);
    this.genSchema.push(``);

    // Queries
    queries.push(`all${this.modelName}s`);
    queries.push(`get${this.modelName}`);

    // ********* Generate Mutations **********
    this.genSchema.push(`type Mutation {`);
    // mutate model with Create, Update, Delete
    this.genSchema.push(
      `  create${this.modelName}(data: create${this.modelName}Input!): ${this.modelName}`
    );
    this.genSchema.push(
      `  create${this.modelName}s(data: [create${this.modelName}Input!]!): [${this.modelName}]`
    );
    this.genSchema.push(
      `  update${this.modelName}(id: ID!, data: update${this.modelName}Schema!): ${this.modelName}`
    );
    this.genSchema.push(
      `  update${this.modelName}s(data: [update${this.modelName}Input!]!): [${this.modelName}]`
    );
    this.genSchema.push(`  delete${this.modelName}(id: ID!): Boolean`);
    this.genSchema.push(`  delete${this.modelName}s(ids: [ID!]): Boolean`);
    this.genSchema.push(`}`);
    this.genSchema.push(``);

    // Mutations
    mutation.push(`create${this.modelName}`);
    mutation.push(`create${this.modelName}s`);
    mutation.push(`update${this.modelName}`);
    mutation.push(`update${this.modelName}s`);
    mutation.push(`delete${this.modelName}`);
    mutation.push(`delete${this.modelName}s`);

    // ********* Declare Model type **********
    this.genSchema.push(`type ${this.modelName} {`);
    // Add Id
    this.genSchema.push(`  id: ID!`);

    _.mapKeys(
      this.modelFields,
      (fieldObj: { [key: string]: any }, fieldName: string) => {
        this.genSchema.push(
          `  ${fieldName}: ${this.getGraphqlField(fieldObj, fieldName)}${
            fieldObj.isRequired ? "!" : ""
          }`
        );
      }
    );

    // Close type
    this.genSchema.push(`}`);
    this.genSchema.push(``);

    // ********* Declare Model Input type **********
    this.genSchema.push(`input create${this.modelName}Input {`);
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      this.genSchema.push(
        `  ${fieldName}: ${this.getGraphqlField(
          fieldObj,
          fieldName,
          "create"
        )}${fieldObj.isRequired ? "!" : ""}`
      );
    });
    // Close input type
    this.genSchema.push(`}`);

    // ********* Declare Model Update Input type **********
    this.genSchema.push(`input update${this.modelName}Schema {`);
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      this.genSchema.push(
        `  ${fieldName}: ${this.getGraphqlField(fieldObj, fieldName, "update")}`
      );
    });
    // Close input type
    this.genSchema.push(`}`);

    // Update Input
    this.genSchema.push(``);
    this.genSchema.push(`input update${this.modelName}Input {`);
    this.genSchema.push(`  id: ID!`);
    this.genSchema.push(`  data: update${this.modelName}Schema!`);
    this.genSchema.push(`}`);

    return {
      schema: this.arrToString(_.concat(this.genSchema, this.addGrpahqlSchema)),
      query: queries,
      mutation: mutation,
    };
  }

  getGraphqlField(
    field: { [key: string]: any },
    fieldName: string,
    schemaType: string = "query"
  ) {
    switch (field.type) {
      case "string":
      case "boolean":
      case "number":
      case "float":
      case "date":
        return field.many
          ? `[${this.getFieldType(field.type)}]`
          : this.getFieldType(field.type);
        break;
      case "enum":
        // Push enum values to schema and create a type
        if (
          !_.includes(
            this.addGrpahqlSchema,
            `enum ${this.modelName}${fieldName.toProperCase()}EnumType {`
          )
        ) {
          this.addGrpahqlSchema.push(``);
          this.addGrpahqlSchema.push(
            `enum ${this.modelName}${fieldName.toProperCase()}EnumType {`
          );
          _.map(field.enum, (key) => {
            this.addGrpahqlSchema.push(`  ${key}`);
          });
          this.addGrpahqlSchema.push(`}`);
          this.addGrpahqlSchema.push(``);
        }
        return `${this.modelName}${fieldName.toProperCase()}EnumType`;
        break;
      case "date":
        return this.getFieldType(field.type);
        break;
      case "relationship":
        if (schemaType === "create") {
          return `create${field.ref}Input`;
        }
        if (schemaType === "update") {
          return `update${field.ref}Input`;
        }
        return field.many ? `[${field.ref}]` : field.ref;
        break;
      default:
        break;
    }
  }

  getFieldType(fieldType: string, ref: "gql" | "mongo" = "gql") {
    let refType;
    if (ref === "gql") refType = fieldsTypeMap;
    if (ref === "mongo") refType = mongoFieldsTypeMap;
    return _.find(refType, ["type", fieldType])?.value;
  }

  arrToString(arr: Array<string>) {
    let genString = "";
    _.map(arr, (line) => {
      genString += line;
      genString += "\n";
    });

    return genString;
  }

  generateWhereInput(Field: string, type: string) {
    switch (type) {
      case "ID":
        return `  ${Field}: whereID`;
        break;

      case "String":
        return `  ${Field}: whereString`;
        break;

      case "Int":
        return `  ${Field}: whereInt`;
        break;

      case "Boolean":
        return `  ${Field}: Boolean`;
        break;

      default:
        return ``;
        break;
    }
  }

  graphqlResolver(
    queries: Array<string>,
    mutation: Array<string>,
    dbModel: any
  ): ModelResolvers {
    let Query: any = {};
    let Mutation: any = {};

    //   Queries
    _.map(queries, (query) => {
      Query[query] = this.Resolvers().mapMongoResolver(query, dbModel);
    });

    //   Mutations
    _.map(mutation, (mutate) => {
      Mutation[mutate] = this.Resolvers().mapMongoResolver(mutate, dbModel);
    });
    return { Query, Mutation };
  }

  // Mongoose model generator
  mongoModel() {
    const mongoSchemaObj: any = {};
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      let fieldSchema: any = {
        type:
          this.getFieldType(fieldObj.type, "mongo") === "enum" &&
          fieldObj.enumType
            ? this.getFieldType(fieldObj.enumType, "mongo")
            : this.getFieldType(fieldObj.type, "mongo"),
      };
      if (_.has(fieldObj, "isRequired"))
        fieldSchema.required = fieldObj.isRequired;
      if (_.has(fieldObj, "default")) fieldSchema.default = fieldObj.default;
      if (_.has(fieldObj, "ref")) fieldSchema.ref = fieldObj.ref;
      if (_.has(fieldObj, "enum")) fieldSchema.enum = fieldObj.enum;
      mongoSchemaObj[fieldName] =
        _.has(fieldObj, "many") && fieldObj.many ? [fieldSchema] : fieldSchema;
    });
    const newSchema = new Schema(mongoSchemaObj, {
      timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" },
      toObject: { virtuals: true },
    });
    const newModel = model(this.modelName, mongoSchemaObj);
    return {
      newSchema,
      newModel,
    };
  }
}

export default Generate;
