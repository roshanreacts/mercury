# Mercury

A modern low-code framework to auto generate your mongoose models, graphql API on the fly. Heavily inspired from KeystoneJs.

## Installation

Use the package manager npm to install mercury.

```bash
npm install @mercury-js/core
```

Use the package manager yarn to install mercury.

```bash
yarn add @mercury-js/core
```

## Usage

Mercury is really fast... Just need 3 variables to be defined in mercury.config.json file.

```json
{
  "roles": ["ADMIN", "USER", "ANONYMOUS"],
  "adminRole": "ADMIN",
  "dbUrl": "mongodb://localhost:27017/mercuryapp"
}
```

This is almost similar to the mongoose model.

```javascript
import jwt from "jsonwebtoken";
import mercury from "@mercury-js/core";
import { authenticateLocal } from "../Auth";
import _ from "lodash";

export const UserSchema = {
  fields: {
    firstName: {
      type: "string",
      isRequired: true,
    },
    lastName: {
      type: "string",
    },
    email: {
      type: "string",
      unique: true,
      isRequired: true,
    },
    password: {
      type: "string",
      isRequired: true,
      bcrypt: true,
      rounds: 10,
      ignoreGraphql: {
        read: true,
      },
    },
    role: {
      type: "enum",
      enumType: "string",
      enum: ["ADMIN", "USER", "ANONYMOUS"],
      isRequired: true,
    },
  },
  resolvers: {
    Mutation: {
      login: async (root, { username, password }, { req, res }) => {
        req.body = {
          ...req.body,
          username: username,
          password: password,
        };

        try {
          // data contains the accessToken, refreshToken and profile from passport
          const { data, info } = await authenticateLocal(req, res);
          if (data) {
            const token = await jwt.sign(
              {
                data: data,
              },
              "secret",
              { expiresIn: "1h" }
            );

            return { User: data, token: token };
          }
          return Error("server error");
        } catch (error) {
          return error;
        }
      },
    },
  },
  typeDefs: `
  type AuthUser {
    User: User
    token: String
  }
  type Mutation {
    login(username: String, password: String): AuthUser
  }
  `,
  access: {
    default: true,
    acl: [
      { ADMIN: { read: true, create: true, update: true, delete: true } },
      { USER: false },
    ],
  },
  public: {
    read: false,
    create: true,
    update: false,
    delete: false,
  },
};

mercury.createList("User", UserSchema);
```

We have some key features in mercury.

For the above model you we will get a CRUD graphql API's and a mongoose model.

Connect the mercury generated typedefs, resolvers and db models to apollo.

```javascript
import express from "express";
import { ApolloServer, AuthenticationError } from "apollo-server-express";
import { makeExecutableSchema } from "graphql-tools";
import { applyMiddleware } from "graphql-middleware";
import mongoose from "mongoose";
import mercury from "@mercury-js/core";
import _ from "lodash";
import session from "express-session";
import { v4 as uuid } from "uuid";
import passport from "passport";
import jwt from "jsonwebtoken";
// Import all your models
import "./User.js";

const app = express();
const PORT = 3030;
const SESSION_SECRECT = "bad secret";

mongoose.Promise = global.Promise;

// GraphQl Server
const schema = applyMiddleware(
  makeExecutableSchema({
    typeDefs: mercury.schema,
    resolvers: mercury.resolvers,
  })
);

app.use(
  session({
    genid: (req) => uuid(),
    secret: SESSION_SECRECT,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const server = new ApolloServer({
  schema,
  rootValue: mercury.db,
  context: async ({ req, res }) => {
    const token = req.headers.token;
    let parseToken;
    if (token) {
      parseToken = await jwt.verify(token, "secret");
    }
    const user =
      token && parseToken && parseToken.data ? parseToken.data : null;
    return { req, user: user, res };
  },
});
server.applyMiddleware({
  app: app,
  bodyParserConfig: {
    limit: "1mb",
  },
});

app.listen(PORT, () =>
  console.log(`Running API server at route ${PORT}${server.graphqlPath}`)
);

export default app;
```

That's it now you have new graphql server with models, crud api for all your schemas ready.
We are writing some detailed documentation for you, we will add up very soon.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
