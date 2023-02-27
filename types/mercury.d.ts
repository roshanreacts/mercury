declare class Mercury {
  schemaList: Array<schemaType>
  roles: Array<string>
  adminRole: string
  adapter: DbAdapter
  path: string
  db: { [x: string]: any }
}

type DbAdapter = 'mongoose'

declare interface String {
  toProperCase: () => string
}
declare const mercury: Mercury
