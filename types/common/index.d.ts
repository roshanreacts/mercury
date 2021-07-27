interface Mercury {
  roles: Array<string>;
  adminRole: string;
  adapter: DbAdapter;
  path: string;
}

type DbAdapter = "mongoose";

declare interface String {
  toProperCase: () => string;
}
