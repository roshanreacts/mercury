export const TodoSchema = {
  fields: {
    name: {
      type: "string",
      isRequired: true,
    },
    isCompleted: {
      type: "boolean",
      default: false,
    },
  },
  resolvers: {
    getTodo: (root: any, args: any, schema: any) => {
      return { id: "NS2343", name: "Roshan", isCompleted: false };
    },
  },
};

export const TodoGql = `
type Query {
  allTodos: [Todo]
  getTodo: Todo
}

type Mutation {
  createTodo: Todo
  createTodos: [Todo]
  updateTodo: Todo
  updateTodos: [Todo]
  deleteTodo: Todo
  deleteTodos: [Todo]
}

type Todo {
  id: ID!
  name: String!
  isCompleted: Boolean
}
`;

export const UserSchema = {
  fields: {
    firstName: {
      type: "string",
      isRequired: true,
    },
    lastName: {
      type: "string",
    },
    todosCount: {
      type: "number",
      default: 0,
    },
    isAdmin: {
      type: "boolean",
      default: false,
    },
  },
};

export const baseTypedefs = `
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
}`;

export const UserGql = `
type Query {
  allUsers(where: whereUserInput): [User]
  getUser(where: whereUserInput): User
}

input whereUserInput {
  id: whereID
  firstName: whereString
  lastName: whereString
  todosCount: whereInt
  isAdmin: Boolean
  AND: [whereUserInput]
  OR: [whereUserInput]
}

type Mutation {
  createUser(data: createUserInput!): User
  createUsers(data: [createUserInput!]!): [User]
  updateUser(id: ID!, data: updateUserSchema!): User
  updateUsers(data: [updateUserInput!]!): [User]
  deleteUser(id: ID!): Boolean
  deleteUsers(ids: [ID!]): Boolean
}

type User {
  id: ID!
  firstName: String!
  lastName: String
  todosCount: Int
  isAdmin: Boolean
}

input createUserInput {
  firstName: String!
  lastName: String
  todosCount: Int
  isAdmin: Boolean
}
input updateUserSchema {
  firstName: String
  lastName: String
  todosCount: Int
  isAdmin: Boolean
}

input updateUserInput {
  id: ID!
  data: updateUserSchema!
}
`;
