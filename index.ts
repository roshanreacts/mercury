import Create from "./lib/Create";
import _ from "lodash";
import mongoose from "mongoose";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
// @ts-ignore
import nconf from "nconf";
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
  }
  
  input whereDateTime {
    is: String
    isNot: String
    lt: String
    lte: String
    gt: String
    gte: String
    in: [String]
    notIn: [String]
  }`,
  ];
  private _resolvers: any = ScalarResolver;
  private _dbModels: { [key: string]: any } = {};
  private _roles: Array<string> = [];
  private _adminRole: string = "";

  adapter: DbAdapter;
  path: string;

  constructor() {
    nconf.argv().env().file({ file: "mercury.config.json" });
    this.adapter = "mongoose";
    this.path = nconf.get("dbPath")
      ? nconf.get("dbPath")
      : "mongodb://localhost:27017/mercuryapp";
    this._roles = nconf.get("roles")
      ? nconf.get("roles")
      : ["SUPERADMIN", "USER", "ANONYMOUS"];
    this._adminRole = nconf.get("adminRole")
      ? nconf.get("adminRole")
      : "SUPERADMIN";
    if (nconf.get("dbPath")) {
      this.connect(this.path);
    }
  }

  get schema(): any {
    return mergeTypeDefs(this._schema);
  }

  get resolvers() {
    return this._resolvers;
  }

  get db() {
    return this._dbModels;
  }

  public get roles() {
    return this._roles;
  }

  public get adminRole() {
    return this._adminRole;
  }

  // public set adminRole(role: string) {
  //   this._adminRole = role;
  // }

  // public set roles(rolesArray: Array<string>) {
  //   this._roles = rolesArray;
  // }
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
  createList(name: string, schema: listSchema) {
    const regexPascal = /^[A-Z][A-Za-z]*$/; //Pascalcase regex
    if (!regexPascal.test(name) || name.slice(-1) === "s") {
      throw new Error(
        "Invalid name, should be PascalCase and should not have 's' at the end"
      );
    }
    if (!_.has(schema, "access")) {
      schema.access = {
        default: true,
        acl: this._roles.map((role: string) => ({
          [role]: true,
        })),
      };
    }
    if (!_.has(schema, "public")) {
      schema.public = false;
    }
    const create = new Create(this);
    const createModel = create.createList({ _model: name, ...schema });
    this._schema.push(createModel.schema);
    this._resolvers = mergeResolvers([this._resolvers, createModel.resolver]);
    this._dbModels[name] = createModel.models.newModel;
  }
}

const mercury = new Mercury();

export default mercury;
