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
  beforeAll(() => {
    const generate = new Generate(
      {
        _model: "User",
        ...UserSchema,
      },
      "mongoose"
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
});
