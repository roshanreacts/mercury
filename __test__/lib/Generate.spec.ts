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
    generate = new Generate(
      {
        _model: "User",
        ...UserSchema,
      },
      "mongoose"
    );
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
    const { newSchema, newModel } = generate.mongoModel();
    expect(newSchema).toBeDefined();
    expect(newModel).toBeDefined();
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
});
