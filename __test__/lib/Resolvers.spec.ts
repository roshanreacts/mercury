import Generate from "../../lib/Generate";
import Resolvers from "../../lib/Resolvers";
import {
  TodoSchema,
  TodoGql,
  UserSchema,
  UserGql,
  baseTypedefs,
} from "../sampleModel.mock";

describe("Resolver Test", () => {
  let resolvers: any;
  let roles: Array<string> = ["ADMIN", "USER", "ANONYMOUS"];

  beforeAll(() => {
    const generate = new Generate(
      {
        _model: "User",
        ...UserSchema,
        access: {
          default: false,
          acl: [{ ADMIN: () => ({ read: () => true }) }],
        },
        public: false,
      },
      { adminRole: "ADMIN", roles, adapter: "mongoose", path: "./" }
    );
    resolvers = new Resolvers(generate);
  });
  it("should compose where input to schema", () => {
    const input = {
      id: {
        isNot: "687y787g637ge3e3y7823e",
      },
      firstName: {
        startsWith: "Roshan",
      },
      todosCount: { gt: 1 },
    };
    const getWhereSchema = resolvers.whereInputCompose(input);
    expect(getWhereSchema).toStrictEqual({
      _id: { $ne: "687y787g637ge3e3y7823e" },
      firstName: {
        $regex: "^Roshan",
        $options: "i",
      },
      todosCount: {
        $gt: 1,
      },
    });
  });

  it("should validate the access acl", () => {
    const accessMatrix = resolvers.validateAccess("read", {
      ctx: { user: { role: "ADMIN" } },
    });
    expect(accessMatrix).toBeTruthy();
  });

  it("should merge the access acl", () => {
    const access = resolvers.mergeAcl();
    const defaultAcl = {
      default: false,
      acl: [
        {
          ADMIN: { read: true, create: true, update: true, delete: true },
        },
        { USER: { read: false, create: false, update: false, delete: false } },
        {
          ANONYMOUS: {
            read: false,
            create: false,
            update: false,
            delete: false,
          },
        },
      ],
    };
    console.log(access);
    expect(access).toStrictEqual(defaultAcl);
  });
  it("should validate the access acl", () => {
    const access = resolvers.generateDefaultAcl(true);
    const accessFalsy = resolvers.generateDefaultAcl(false);
    const defaultAcl = {
      default: true,
      acl: [
        {
          ADMIN: { read: true, create: true, update: true, delete: true },
        },
        { USER: { read: true, create: true, update: true, delete: true } },
        { ANONYMOUS: { read: true, create: true, update: true, delete: true } },
      ],
    };
    const defaultAclFalsy = {
      default: false,
      acl: [
        {
          ADMIN: { read: true, create: true, update: true, delete: true },
        },
        { USER: { read: false, create: false, update: false, delete: false } },
        {
          ANONYMOUS: {
            read: false,
            create: false,
            update: false,
            delete: false,
          },
        },
      ],
    };
    expect(access).toStrictEqual(defaultAcl);
    expect(accessFalsy).toStrictEqual(defaultAclFalsy);
  });
});
