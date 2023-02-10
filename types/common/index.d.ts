interface Mercury {
  schemaList: Array<schemaType>;
  roles: Array<string>;
  adminRole: string;
  adapter: DbAdapter;
  path: string;
}

type DbAdapter = "mongoose";

declare interface String {
  toProperCase: () => string;
}
