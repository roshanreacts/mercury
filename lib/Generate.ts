import _ from "lodash";
import { Schema, model } from "mongoose";
import { Schema as RealmSchema, Model as RealmModel } from "realmoose";
import Resolvers from "./Resolvers";

const fieldsTypeMap = [
  { type: "string", value: "String" },
  { type: "number", value: "Int" },
  { type: "boolean", value: "Boolean" },
];

const mongoFieldsTypeMap = [
  { type: "string", value: "String" },
  { type: "number", value: "Number" },
  { type: "boolean", value: "Boolean" },
];
const realmFieldsTypeMap = [
  { type: "string", value: "string" },
  { type: "number", value: "int" },
  { type: "boolean", value: "bool" },
];

class Generate {
  adapter: DbAdapter;
  modelName: string;
  modelFields: FieldsMap;
  constructor(schema: schemaType, adapter: DbAdapter) {
    this.adapter = adapter;
    this.modelName = schema._model;
    this.modelFields = schema.fields;
  }

  Resolvers(): Resolvers {
    return new Resolvers(this);
  }

  grpahqlSchema() {
    const genSchema: Array<string> = [];
    const queries: Array<string> = [];
    const mutation: Array<string> = [];

    genSchema.push(``);

    // ********* Generate Queries **********
    genSchema.push(`type Query {`);
    // get All of the Model
    genSchema.push(
      `  all${this.modelName}s(where: where${this.modelName}Input): [${this.modelName}]`
    );
    // get one item from the model
    genSchema.push(
      `  get${this.modelName}(where: where${this.modelName}Input): ${this.modelName}`
    );
    genSchema.push(`}`);
    genSchema.push(``);

    // Queries whereInput types
    genSchema.push(`input where${this.modelName}Input {`);
    genSchema.push(this.generateWhereInput("id", "ID"));
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      const fieldType = this.getFieldType(fieldObj.type);
      if (fieldType) {
        genSchema.push(this.generateWhereInput(fieldName, fieldType));
      }
    });
    genSchema.push(`  AND: [where${this.modelName}Input]`);
    genSchema.push(`  OR: [where${this.modelName}Input]`);
    genSchema.push(`}`);
    genSchema.push(``);

    // Queries
    queries.push(`all${this.modelName}s`);
    queries.push(`get${this.modelName}`);

    // ********* Generate Mutations **********
    genSchema.push(`type Mutation {`);
    // mutate model with Create, Update, Delete
    genSchema.push(
      `  create${this.modelName}(data: create${this.modelName}Input!): ${this.modelName}`
    );
    genSchema.push(
      `  create${this.modelName}s(data: [create${this.modelName}Input!]!): [${this.modelName}]`
    );
    genSchema.push(
      `  update${this.modelName}(id: ID!, data: update${this.modelName}Schema!): ${this.modelName}`
    );
    genSchema.push(
      `  update${this.modelName}s(data: [update${this.modelName}Input!]!): [${this.modelName}]`
    );
    genSchema.push(`  delete${this.modelName}(id: ID!): Boolean`);
    genSchema.push(`  delete${this.modelName}s(ids: [ID!]): Boolean`);
    genSchema.push(`}`);
    genSchema.push(``);

    // Mutations
    mutation.push(`create${this.modelName}`);
    mutation.push(`create${this.modelName}s`);
    mutation.push(`update${this.modelName}`);
    mutation.push(`update${this.modelName}s`);
    mutation.push(`delete${this.modelName}`);
    mutation.push(`delete${this.modelName}s`);

    // ********* Declare Model type **********
    genSchema.push(`type ${this.modelName} {`);
    // Add Id
    genSchema.push(`  id: ID!`);

    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      genSchema.push(
        `  ${fieldName}: ${this.getFieldType(fieldObj.type)}${
          fieldObj.isRequired ? "!" : ""
        }`
      );
    });

    // Close type
    genSchema.push(`}`);
    genSchema.push(``);

    // ********* Declare Model Input type **********
    genSchema.push(`input create${this.modelName}Input {`);
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      genSchema.push(
        `  ${fieldName}: ${this.getFieldType(fieldObj.type)}${
          fieldObj.isRequired ? "!" : ""
        }`
      );
    });
    // Close input type
    genSchema.push(`}`);

    // ********* Declare Model Update Input type **********
    genSchema.push(`input update${this.modelName}Schema {`);
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      genSchema.push(`  ${fieldName}: ${this.getFieldType(fieldObj.type)}`);
    });
    // Close input type
    genSchema.push(`}`);

    // Update Input
    genSchema.push(``);
    genSchema.push(`input update${this.modelName}Input {`);
    genSchema.push(`  id: ID!`);
    genSchema.push(`  data: update${this.modelName}Schema!`);
    genSchema.push(`}`);

    return {
      schema: this.arrToString(genSchema),
      query: queries,
      mutation: mutation,
    };
  }

  getFieldType(fieldType: string, ref: "gql" | "mongo" | "realm" = "gql") {
    let refType;
    if (ref === "gql") refType = fieldsTypeMap;
    if (ref === "mongo") refType = mongoFieldsTypeMap;
    if (ref === "realm") refType = realmFieldsTypeMap;
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

      default:
        return `  ${Field}: ${type}`;
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
      Query[query] =
        this.adapter === "realmoose"
          ? this.Resolvers().mapRealmResolvers(query, dbModel)
          : this.Resolvers().mapMongoResolver(query, dbModel);
    });

    //   Mutations
    _.map(mutation, (mutate) => {
      Mutation[mutate] =
        this.adapter === "realmoose"
          ? this.Resolvers().mapRealmResolvers(mutate, dbModel)
          : this.Resolvers().mapMongoResolver(mutate, dbModel);
    });
    return { Query, Mutation };
  }

  // Mongoose model generator
  mongoModel() {
    const mongoSchemaObj: any = {};
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      let fieldSchema: any = {
        type: this.getFieldType(fieldObj.type, "mongo"),
      };
      if (_.has(fieldObj, "isRequired"))
        fieldSchema.required = fieldObj.isRequired;
      if (_.has(fieldObj, "default")) fieldSchema.default = fieldObj.default;

      mongoSchemaObj[fieldName] = fieldSchema;
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

  // Realmoose model generator
  realmModel() {
    const realmSchemaObj: any = {};
    _.mapKeys(this.modelFields, (fieldObj, fieldName) => {
      let fieldSchema: any = {
        type: this.getFieldType(fieldObj.type, "realm"),
      };
      if (_.has(fieldObj, "isRequired"))
        fieldSchema.required = fieldObj.isRequired;
      if (_.has(fieldObj, "default")) fieldSchema.default = fieldObj.default;

      realmSchemaObj[fieldName] = fieldSchema;
    });
    const newSchema = RealmSchema(realmSchemaObj);
    const newModel = RealmModel(this.modelName, newSchema);
    return {
      newSchema,
      newModel,
    };
  }
}

export default Generate;
