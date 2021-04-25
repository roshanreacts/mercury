import _ from "lodash";
import { Schema, model, Query } from "mongoose";

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

class Generate {
  modelName: string;
  modelFields: FieldsMap;
  constructor(schema: schemaType) {
    this.modelName = schema._model;
    this.modelFields = schema.fields;
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

      default:
        return `  ${Field}: ${type}`;
        break;
    }
  }

  graphqlResolver(
    queries: Array<string>,
    mutation: Array<string>,
    model: any
  ): ModelResolvers {
    let Query: any = {};
    let Mutation: any = {};

    //   Queries
    _.map(queries, (query) => {
      Query[query] = this.mapMongoResolver(query, model);
    });

    //   Mutations
    _.map(mutation, (mutate) => {
      Mutation[mutate] = this.mapMongoResolver(mutate, model);
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
    const mongoSchema = new Schema(mongoSchemaObj, {
      timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" },
      toObject: { virtuals: true },
    });
    const mongoModel = model(this.modelName, mongoSchemaObj);
    return {
      mongoSchema,
      mongoModel,
    };
  }

  mapMongoResolver(name: string, Model: any) {
    // createModel resolver
    switch (name) {
      // Queries
      case `all${this.modelName}s`:
        return async (root: any, args: { where: any }, ctx: any) => {
          const findAll = await Model.find(this.whereInputCompose(args.where));
          return findAll;
        };
        break;
      case `get${this.modelName}`:
        return async (root: any, args: { where: any }, ctx: any) => {
          const findOne = await Model.findOne(
            this.whereInputCompose(args.where)
          );
          return findOne;
        };
        break;
      // Mutations
      case `create${this.modelName}`:
        return async (root: any, args: { data: any }, ctx: any) => {
          const newModel = new Model(args.data);
          await newModel.save();
          return newModel;
        };
        break;

      case `create${this.modelName}s`:
        return async (root: any, args: { data: any }, ctx: any) => {
          const allRecords = await Model.insertMany(args.data);
          return allRecords;
        };
        break;

      case `update${this.modelName}`:
        return async (root: any, args: { id: string; data: any }, ctx: any) => {
          return await Model.findByIdAndUpdate(args.id, args.data, {
            new: true,
          });
        };
        break;

      case `update${this.modelName}s`:
        return async (root: any, args: { data: any }, ctx: any) => {
          let updatedRecords: any[] = [];
          await Promise.all(
            _.map(args.data, async (record: any) => {
              const updateRecord = await Model.findByIdAndUpdate(
                record.id,
                record.data,
                { new: true }
              );
              updatedRecords.push(updateRecord);
            })
          );
          return updatedRecords;
        };
        break;

      case `delete${this.modelName}`:
        return async (root: any, args: { id: string; data: any }, ctx: any) => {
          await Model.findByIdAndDelete(args.id);
          return true;
        };
        break;

      case `delete${this.modelName}s`:
        return async (root: any, args: { ids: any }, ctx: any) => {
          await Promise.all(
            _.map(args.ids, async (id: any) => {
              const deleteRecord = await Model.findByIdAndDelete(id);
            })
          );
          return true;
        };
        break;

      default:
        return (root: any, args: { data: any }, ctx: any) => {
          console.log(root);
          console.log(args.data);
          console.log(ctx);
        };
        break;
    }
  }

  whereInputCompose(input: any) {
    let querySchema: any = {};
    _.mapKeys(input, (fieldReq: any, field: string) => {
      let key: string | undefined;
      if (field !== "id") {
        key = this.getFieldType(this.modelFields[field].type);
      } else {
        key = "ID";
      }
      switch (key) {
        case "ID":
          querySchema._id = _.has(fieldReq, "is")
            ? { $eq: fieldReq.is }
            : _.has(fieldReq, "isNot")
            ? { $ne: fieldReq.isNot }
            : _.has(fieldReq, "in")
            ? { $in: fieldReq.in }
            : _.has(fieldReq, "notIn")
            ? { $nin: fieldReq.notIn }
            : null;
          break;
        case "String":
          querySchema[field] = _.has(fieldReq, "is")
            ? { $eq: fieldReq.is }
            : _.has(fieldReq, "isNot")
            ? { $ne: fieldReq.isNot }
            : _.has(fieldReq, "contains")
            ? { $regex: `${fieldReq.contains}`, $options: "i" }
            : _.has(fieldReq, "notContains")
            ? { $regex: `^((?!${fieldReq.notContains}).)*$`, $options: "i" }
            : _.has(fieldReq, "startsWith")
            ? { $regex: `^${fieldReq.startsWith}`, $options: "i" }
            : _.has(fieldReq, "notStartWith")
            ? { $not: { $regex: `^${fieldReq.notStartWith}.*`, $options: "i" } }
            : _.has(fieldReq, "endsWith")
            ? { $regex: `.*${fieldReq.endsWith}$`, $options: "i" }
            : _.has(fieldReq, "notEndsWith")
            ? { $not: { $regex: `.*${fieldReq.notEndsWith}$`, $options: "i" } }
            : _.has(fieldReq, "in")
            ? { $in: fieldReq.in }
            : _.has(fieldReq, "notIn")
            ? { $nin: fieldReq.notIn }
            : null;
          break;
        case "Int":
          querySchema[field] = _.has(fieldReq, "is")
            ? { $eq: fieldReq.is }
            : _.has(fieldReq, "isNot")
            ? { $ne: fieldReq.isNot }
            : _.has(fieldReq, "lt")
            ? { $lt: fieldReq.lt }
            : _.has(fieldReq, "lte")
            ? { $lte: fieldReq.lte }
            : _.has(fieldReq, "gt")
            ? { $gt: fieldReq.gt }
            : _.has(fieldReq, "gte")
            ? { $gte: fieldReq.gte }
            : _.has(fieldReq, "in")
            ? { $in: fieldReq.in }
            : _.has(fieldReq, "notIn")
            ? { $nin: fieldReq.notIn }
            : null;
          break;
        default:
          break;
      }
    });
    return querySchema;
  }
}

export default Generate;
