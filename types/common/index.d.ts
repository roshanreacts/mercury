export interface Mercury {
  schemaList: Array<schemaType>;
  roles: Array<string>;
  adminRole: string;
  adapter: DbAdapter;
  path: string;
}

export type DbAdapter = "mongoose";

export declare interface String {
  toProperCase: () => string;
}
