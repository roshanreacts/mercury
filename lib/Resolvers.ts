import _ from "lodash";
import graphqlFields from "graphql-fields";

class Resolvers {
  _adminRole: string;
  _roles: Array<string>;
  schema: schemaType;
  modelName: string;
  modelFields: FieldsMap;
  generate: Generate;
  constructor(base: Generate) {
    this.schema = base.schema;
    this.generate = base;
    this._roles = base._mercury.roles;
    this._adminRole = base._mercury.adminRole;
    this.modelName = base.modelName;
    this.modelFields = base.modelFields;
  }

  resolvePopulate(resolveInfo: any): PopulateType {
    const pickRef = _.pickBy(this.modelFields, (item) => _.has(item, "ref"));
    const populateFields = _.keys(pickRef);
    const parentFields = graphqlFields(resolveInfo);
    let populate: PopulateType = [];
    _.map(populateFields, (item) => {
      if (_.has(parentFields, item)) {
        const select = _.keys(parentFields[item]);
        populate.push({
          path: item,
          select: select.join(" "),
        });
      }
    });
    return populate;
  }

  hooks(name: string) {
    switch (name) {
      case "afterCreate":
        break;
      default:
        break;
    }
  }

  mapMongoResolver(name: string, Model: any) {
    // createModel resolver
    switch (name) {
      // Queries
      case `all${this.modelName}s`:
        return async (
          root: any,
          args: { where: any },
          ctx: any,
          resolveInfo: any
        ) => {
          this.checkPublic("read", ctx);
          const populate = this.resolvePopulate(resolveInfo);
          const findAll = await Model.paginate(
            this.whereInputCompose(args.where),
            { populate: populate }
          );
          this.validateAccess("read", {
            root,
            args,
            ctx,
            resolveInfo,
            populate,
            docs: findAll,
          });
          return findAll.docs;
        };
        break;
      case `get${this.modelName}`:
        return async (
          root: any,
          args: { where: any },
          ctx: any,
          resolveInfo: any
        ) => {
          this.checkPublic("read", ctx);
          const populate = this.resolvePopulate(resolveInfo);
          const findOne = await Model.findOne(
            this.whereInputCompose(args.where)
          ).populate(populate);
          this.validateAccess("read", {
            root,
            args,
            ctx,
            resolveInfo,
            populate,
            docs: findOne,
          });
          return findOne;
        };
        break;
      // Mutations
      case `create${this.modelName}`:
        return async (root: any, args: { data: any }, ctx: any) => {
          this.checkPublic("create", ctx);
          this.validateAccess("create", { root, args, ctx });
          const newModel = new Model(args.data);
          await newModel.save();
          return newModel;
        };
        break;

      case `create${this.modelName}s`:
        return async (root: any, args: { data: any }, ctx: any) => {
          this.checkPublic("create", ctx);
          this.validateAccess("create", { root, args, ctx });
          const allRecords = await Model.insertMany(args.data);
          return allRecords;
        };
        break;

      case `update${this.modelName}`:
        return async (root: any, args: { id: string; data: any }, ctx: any) => {
          this.checkPublic("update", ctx);
          this.validateAccess("update", { root, args, ctx });
          return await Model.findByIdAndUpdate(args.id, args.data, {
            new: true,
          });
        };
        break;

      case `update${this.modelName}s`:
        return async (root: any, args: { data: any }, ctx: any) => {
          this.checkPublic("update", ctx);
          this.validateAccess("update", { root, args, ctx });
          let updatedRecords: any[] = [];
          await Promise.all(
            _.map(args.data, async (record: any) => {
              const updateRecord = await Model.findByIdAndUpdate(
                record.id,
                record.data,
                { new: true }
              );
              updatedRecords.push(updateRecord);
            })
          );
          return updatedRecords;
        };
        break;

      case `delete${this.modelName}`:
        return async (root: any, args: { id: string; data: any }, ctx: any) => {
          this.checkPublic("delete", ctx);
          this.validateAccess("delete", { root, args, ctx });
          await Model.findByIdAndDelete(args.id);
          return true;
        };
        break;

      case `delete${this.modelName}s`:
        return async (root: any, args: { ids: any }, ctx: any) => {
          this.checkPublic("delete", ctx);
          this.validateAccess("delete", { root, args, ctx });
          await Promise.all(
            _.map(args.ids, async (id: any) => {
              await Model.findByIdAndDelete(id);
            })
          );
          return true;
        };
        break;

      default:
        return (root: any, args: { data: any }, ctx: any) => {};
        break;
    }
  }

  checkPublic(accessType: "read" | "create" | "update" | "delete", ctx: any) {
    // Validate public
    if (
      typeof this.schema.public === "boolean" &&
      !this.schema.public &&
      ctx.user == null
    ) {
      throw new Error("Unauthorised access");
    }
    // If public is declared in function
    if (typeof this.schema.public === "function") {
      const publicFunc = this.schema.public;
      const validate =
        typeof publicFunc === "function" ? publicFunc(this.schema) : false;
      if (!validate && ctx.user == null) {
        throw new Error("Unauthorised access");
      }
    }
    // If verbose type are declared
    if (
      typeof this.schema.public === "object" &&
      typeof this.schema.public[accessType] === "boolean" &&
      !this.schema.public[accessType] &&
      ctx.user == null
    ) {
      throw new Error("Unauthorised access");
    }
    // If verbose type are declared in function
    if (
      typeof this.schema.public === "object" &&
      typeof this.schema.public[accessType] === "function"
    ) {
      const publicFunc = this.schema.public[accessType];
      const validate =
        typeof publicFunc === "function" ? publicFunc(this.schema) : false;
      if (!validate && ctx.user == null) {
        throw new Error("Unauthorised access");
      }
    }
  }

  validateAccess(
    accessType: "read" | "create" | "update" | "delete",
    args: any
  ): boolean {
    const { ctx } = args;
    const role = ctx.user.role;
    const getAclMatrix = this.mergeAcl(args);
    const accessItem = _.find(getAclMatrix.acl, role);
    const checkAccess = accessItem ? accessItem[role][accessType] : false;
    if (!checkAccess) {
      throw new Error("Unauthorised access");
    }
    return true;
  }

  mergeAcl(args: any) {
    const defaultVal =
      this.schema.access && this.schema.access.default != null
        ? this.schema.access.default
        : true;
    const defaultAcl = this.generateDefaultAcl(defaultVal);
    const updatedAcl = _.map(defaultAcl.acl, (item) => {
      const getKeys = _.keys(item);
      const roleName = getKeys[0];
      let accessItem = _.find(this.schema.access?.acl, roleName);
      if (accessItem != null) {
        switch (typeof accessItem[roleName]) {
          case "object":
            return _.merge(item, accessItem);
          case "boolean":
            const accessItemBoolean = accessItem[roleName];
            return {
              [roleName]: {
                read: accessItemBoolean,
                create: accessItemBoolean,
                delete: accessItemBoolean,
                update: accessItemBoolean,
              },
            };
          case "function":
            const accessItemValue = accessItem[roleName];
            const accessItemFunc =
              typeof accessItemValue === "function"
                ? accessItemValue(args)
                : defaultVal;
            if (typeof accessItemFunc === "boolean") {
              return {
                [roleName]: {
                  read: accessItemFunc,
                  create: accessItemFunc,
                  delete: accessItemFunc,
                  update: accessItemFunc,
                },
              };
            } else if (typeof accessItemFunc === "object") {
              return { [roleName]: _.merge(item[roleName], accessItemFunc) };
            }

          default:
            return {
              [roleName]: {
                read: defaultVal,
                create: defaultVal,
                delete: defaultVal,
                update: defaultVal,
              },
            };
        }
      } else {
        return item;
      }
    });

    // Verbose field level Function
    const verboseUpdatedAcl = _.map(updatedAcl, (item) => {
      const getKeys = _.keys(item);
      const roleName: string = getKeys[0];
      const accessItem = item[roleName];

      accessItem.read =
        typeof accessItem.read === "function"
          ? accessItem.read(args)
          : accessItem.read;
      accessItem.create =
        typeof accessItem.create === "function"
          ? accessItem.create(args)
          : accessItem.create;
      accessItem.update =
        typeof accessItem.update === "function"
          ? accessItem.update(args)
          : accessItem.update;
      accessItem.delete =
        typeof accessItem.delete === "function"
          ? accessItem.delete(args)
          : accessItem.delete;

      return { [roleName]: accessItem };
    });
    return { default: defaultVal, acl: verboseUpdatedAcl };
  }

  generateDefaultAcl(defaultValue: boolean) {
    const defaultAcl = {
      default: defaultValue,
      acl: this._roles.map((item: string) => {
        if (item === this._adminRole) {
          return {
            [item]: {
              read: true,
              create: true,
              update: true,
              delete: true,
            },
          };
        } else {
          return {
            [item]: {
              read: defaultValue,
              create: defaultValue,
              update: defaultValue,
              delete: defaultValue,
            },
          };
        }
      }),
    };
    return defaultAcl;
  }

  whereInputCompose(input: any) {
    let querySchema: any = {};
    _.mapKeys(input, (fieldReq: any, field: string) => {
      let key: string | undefined;
      if (field !== "id") {
        key = this.generate.getFieldType(this.modelFields[field].type);
      } else {
        key = "ID";
      }
      switch (key) {
        case "ID":
          querySchema._id = _.has(fieldReq, "is")
            ? { $eq: fieldReq.is }
            : _.has(fieldReq, "isNot")
            ? { $ne: fieldReq.isNot }
            : _.has(fieldReq, "in")
            ? { $in: fieldReq.in }
            : _.has(fieldReq, "notIn")
            ? { $nin: fieldReq.notIn }
            : null;
          break;
        case "String":
          querySchema[field] = _.has(fieldReq, "is")
            ? { $eq: fieldReq.is }
            : _.has(fieldReq, "isNot")
            ? { $ne: fieldReq.isNot }
            : _.has(fieldReq, "contains")
            ? { $regex: `${fieldReq.contains}`, $options: "i" }
            : _.has(fieldReq, "notContains")
            ? { $regex: `^((?!${fieldReq.notContains}).)*$`, $options: "i" }
            : _.has(fieldReq, "startsWith")
            ? { $regex: `^${fieldReq.startsWith}`, $options: "i" }
            : _.has(fieldReq, "notStartWith")
            ? { $not: { $regex: `^${fieldReq.notStartWith}.*`, $options: "i" } }
            : _.has(fieldReq, "endsWith")
            ? { $regex: `.*${fieldReq.endsWith}$`, $options: "i" }
            : _.has(fieldReq, "notEndsWith")
            ? { $not: { $regex: `.*${fieldReq.notEndsWith}$`, $options: "i" } }
            : _.has(fieldReq, "in")
            ? { $in: fieldReq.in }
            : _.has(fieldReq, "notIn")
            ? { $nin: fieldReq.notIn }
            : null;
          break;
        case "enum":
          querySchema[field] = { $eq: fieldReq };
          break;
        case "Int":
        case "Date":
          querySchema[field] = _.has(fieldReq, "is")
            ? { $eq: fieldReq.is }
            : _.has(fieldReq, "isNot")
            ? { $ne: fieldReq.isNot }
            : _.has(fieldReq, "lt")
            ? { $lt: fieldReq.lt }
            : _.has(fieldReq, "lte")
            ? { $lte: fieldReq.lte }
            : _.has(fieldReq, "gt")
            ? { $gt: fieldReq.gt }
            : _.has(fieldReq, "gte")
            ? { $gte: fieldReq.gte }
            : _.has(fieldReq, "in")
            ? { $in: fieldReq.in }
            : _.has(fieldReq, "notIn")
            ? { $nin: fieldReq.notIn }
            : null;
          break;
        default:
          break;
      }
    });
    return querySchema;
  }
}

export default Resolvers;
