import mercury from "../index";
import { TodoSchema, TodoGql, UserSchema, UserGql } from "./sampleModel.mock";
describe("Init mercury", () => {
  // Init the mercury config
  it("should initialize mercury", () => {
    expect(mercury.resolvers).toBeDefined();
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
