import Generate from "../../lib/Generate";
import {
  TodoSchema,
  TodoGql,
  UserSchema,
  UserGql,
  baseTypedefs,
} from "../sampleModel.mock";

describe("shoudl validate generate", () => {
  let generate: any;
  beforeAll(() => {
    generate = new Generate({
      _model: "User",
      ...UserSchema,
    });
  });
  it("should get type for gql", () => {
    const getString = generate.getFieldType("string");
    const getMongoInt = generate.getFieldType("number", "mongo");

    expect(getString).toBe("String");
    expect(getMongoInt).toBe("Number");
  });

  it("should generate gql schema", () => {
    const { schema } = generate.grpahqlSchema();

    expect(schema).toBe(UserGql);
  });

  it("should generate resolvers", () => {
    const queries = ["allTodos", "getTodo"];
    const mutations = [
      "createTodo",
      "updateTodo",
      "deleteTodo",
      "createTodos",
      "updateTodos",
      "deleteTodos",
    ];
    const resolvers = generate.graphqlResolver(queries, mutations);

    expect(typeof resolvers.Query.allTodos).toBe("function");
    expect(typeof resolvers.Query.getTodo).toBe("function");
    expect(typeof resolvers.Mutation.createTodo).toBe("function");
  });

  it("should generate Mongo Model", async () => {
    const { mongoSchema, mongoModel } = generate.mongoModel();
    // console.log(mongoSchema, mongoModel);
    expect(mongoSchema).toBeDefined();
    expect(mongoModel).toBeDefined();
  });

  it("should generate where input ID", () => {
    const genWhereInput = generate.generateWhereInput("id", "ID");
    expect(genWhereInput).toBe(`  id: whereID`);
  });
  it("should generate where input string", () => {
    const genWhereInput = generate.generateWhereInput("name", "String");
    expect(genWhereInput).toBe(`  name: whereString`);
  });
  it("should generate where input Int", () => {
    const genWhereInput = generate.generateWhereInput("orgUsers", "Int");
    expect(genWhereInput).toBe(`  orgUsers: whereInt`);
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
    const getWhereSchema = generate.whereInputCompose(input);
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
});