import Create from "./lib/Create";
import _ from "lodash";
import mongoose from "mongoose";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import ScalarResolver from "./lib/Scalars";

String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};
class Mercury {
  private _schema: string[] = [
    `
  scalar DateTime
  scalar EncryptString
  scalar IntString
  scalar EmailAddress
  scalar NegativeFloat
  scalar NegativeInt
  scalar NonNegativeFloat
  scalar NonNegativeInt
  scalar NonPositiveFloat
  scalar NonPositiveInt
  scalar PhoneNumber
  scalar PositiveFloat
  scalar PositiveInt
  scalar PostalCode
  scalar UnsignedFloat
  scalar UnsignedInt
  scalar URL
  scalar BigInt
  scalar Long
  scalar GUID
  scalar HexColorCode
  scalar HSL
  scalar HSLA
  scalar IPv4
  scalar IPv6
  scalar ISBN
  scalar MAC
  scalar Port
  scalar RGB
  scalar RGBA
  scalar USCurrency
  scalar JSON
  scalar JSONObject
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
  private _resolvers: any = ScalarResolver;
  private _dbModels: { Schemas: any; Models: any } = {
    Schemas: {},
    Models: {},
  };

  adapter: DbAdapter;
  path: string;

  constructor() {
    this.adapter = "mongoose";
    this.path = "mongodb://localhost:27017/mercuryapp";
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
  connect(path: string) {
    this.path = path;
    mongoose.Promise = global.Promise;
    mongoose.connect(this.path, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
  }
  createList(
    name: string,
    schema: { fields: FieldsMap; resolvers?: ModelResolvers; typeDefs?: string }
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
    this._dbModels.Schemas[`${name}Schema`] = createModel.models.newSchema;
    this._dbModels.Models[`${name}Model`] = createModel.models.newModel;
  }
}

const mercury = new Mercury();

export default mercury;
