import Create from "./lib/Create";
import _ from "lodash";
import mongoose from "mongoose";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";

class Mercury {
  private _schema: string[] = [
    `
  input whereID {
    is: ID
    isNot: ID
    in: [ID!]
    notIn: [ID!]
  }
  
  input whereString {
    is: String
    isNot: String
    contains: String
    notContains: String
    startsWith: String
    notStartWith: String
    endsWith: String
    notEndsWith: String
    isIn: [String]
    notIn: [String]
  }
  
  input whereInt {
    is: Int
    isNot: Int
    lt: Int
    lte: Int
    gt: Int
    gte: Int
    in: [Int]
    notIn: [Int]
  }`,
  ];
  private _resolvers: any;
  private _dbModels: any[] = [];

  mongooseUri = "";
  realmoosePath = "";
  realmooseAppId = "";

  constructor(options: {
    db: { adapter: "mongoose" | "realmoose"; path: string; appId?: string };
  }) {
    const {
      db: { adapter, path, appId },
    } = options;
    this;
    mongoose.Promise = global.Promise;
    mongoose.connect(path, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
  }

  get schema(): any {
    return mergeTypeDefs(this._schema);
  }

  get resolvers() {
    return this._resolvers;
  }

  get dataModels() {
    return this._dbModels;
  }

  createList(
    name: string,
    schema: { fields: FieldsMap; resolvers?: ModelResolvers }
  ) {
    const regexPascal = /^[A-Z][A-Za-z]*$/; //Pascalcase regex
    if (!regexPascal.test(name) || name.slice(-1) === "s") {
      throw new Error(
        "Invalid name, should be PascalCase and should not have 's' at the end"
      );
    }
    const create = new Create(this);
    const createModel = create.createList({ _model: name, ...schema });
    this._schema.push(createModel.schema);
    this._resolvers = mergeResolvers([this._resolvers, createModel.resolver]);
    this._dbModels.push({ [`${name}Schema`]: createModel.models.mongoSchema });
    this._dbModels.push({ [`${name}Model`]: createModel.models.mongoModel });
  }
}

export default Mercury;
