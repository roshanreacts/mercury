import Mercury from "../index";
import { TodoSchema, TodoGql, UserSchema, UserGql } from "./sampleModel.mock";
describe("Init mercury", () => {
  // Init the mercury config
  let mercury: any;
  beforeAll(() => {
    mercury = new Mercury({
      db: { adapter: "realmoose", path: "test.realm" },
    });
  });
  it("should initialize mercury", () => {
    expect(mercury.resolvers).toBeUndefined();
  });
  it("should create list", () => {
    mercury.createList("Todo", TodoSchema);
    mercury.createList("User", UserSchema);

    expect(mercury.schema).toBeDefined();
    expect(mercury.resolvers).toBeDefined();
    expect(mercury.dataModels.Schemas).toBeDefined();
    expect(mercury.dataModels.Models).toBeDefined();
  });
});
