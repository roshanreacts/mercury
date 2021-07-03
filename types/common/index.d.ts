interface Mercury {
  adapter: DbAdapter;
  path: string;
}

type DbAdapter = "mongoose";

declare interface String {
  toProperCase: () => string;
}
