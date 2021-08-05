import _ from "lodash";
import graphqlFields from "graphql-fields";

class Resolvers {
  _list: Array<schemaType>;
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
    this._list = base._mercury.schemaList;
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

        let populateSchema: any = {
          path: item,
          select: select.join(" "),
        };
        let childPopulate: { path: string; select: string }[] = [];
        const findModelName = pickRef[item].ref;
        let childListModel = _.find(this._list, ["_model", findModelName]);
        const pickRefChild = _.pickBy(childListModel?.fields, (list) =>
          _.has(list, "ref")
        );
        if (!_.isEmpty(pickRefChild)) {
          const populateChildFields = _.keys(pickRefChild);
          _.map(populateChildFields, (childItem) => {
            if (_.includes(select, childItem)) {
              const childSelect = _.keys(parentFields[item][childItem]);
              childPopulate.push({
                path: childItem,
                select: childSelect.join(" "),
              });
            }
          });
          if (childPopulate) populateSchema.populate = childPopulate;
        }
        populate.push(populateSchema);
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
          const populate = this.resolvePopulate(resolveInfo);
          const findAll = await Model.paginate(
            this.whereInputCompose(args.where),
            { populate: populate }
          );
          await this.validateAccess("read", {
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
          const populate = this.resolvePopulate(resolveInfo);
          const findOne = await Model.findOne(
            this.whereInputCompose(args.where)
          ).populate(populate);
          await this.validateAccess("read", {
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
        return async (
          root: any,
          args: { data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          const populate = this.resolvePopulate(resolveInfo);
          await this.validateAccess("create", { root, args, ctx });
          const newModel = new Model(args.data);
          await newModel.save();
          return await newModel.populate(populate).execPopulate();
        };
        break;

      case `create${this.modelName}s`:
        return async (
          root: any,
          args: { data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          const populate = this.resolvePopulate(resolveInfo);
          await this.validateAccess("create", { root, args, ctx });
          const allRecords = await Model.insertMany(args.data);
          return await allRecords.populate(populate).execPopulate();
        };
        break;

      case `update${this.modelName}`:
        return async (
          root: any,
          args: { id: string; data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          const populate = this.resolvePopulate(resolveInfo);
          await this.validateAccess("update", { root, args, ctx });
          return await Model.findByIdAndUpdate(args.id, args.data, {
            new: true,
          })
            .populate(populate)
            .execPopulate();
        };
        break;

      case `update${this.modelName}s`:
        return async (
          root: any,
          args: { data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          const populate = this.resolvePopulate(resolveInfo);
          await this.validateAccess("update", { root, args, ctx });
          let updatedRecords: any[] = [];
          await Promise.all(
            _.map(args.data, async (record: any) => {
              const updateRecord = await Model.findByIdAndUpdate(
                record.id,
                record.data,
                { new: true }
              )
                .populate(populate)
                .execPopulate();
              updatedRecords.push(updateRecord);
            })
          );
          return updatedRecords;
        };
        break;

      case `delete${this.modelName}`:
        return async (root: any, args: { id: string; data: any }, ctx: any) => {
          await this.validateAccess("delete", { root, args, ctx });
          await Model.findByIdAndDelete(args.id);
          return true;
        };
        break;

      case `delete${this.modelName}s`:
        return async (root: any, args: { ids: any }, ctx: any) => {
          await this.validateAccess("delete", { root, args, ctx });
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

  async validateAccess(
    accessType: "read" | "create" | "update" | "delete",
    args: any
  ): Promise<boolean> {
    const { ctx } = args;
    const role = ctx.user.role;
    const getAclMatrix = await this.mergeAcl(args);
    const accessItem = _.find(getAclMatrix.acl, role);
    const checkAccess = accessItem ? accessItem[role][accessType] : false;
    if (!checkAccess) {
      throw new Error("Unauthorised access");
    }
    return true;
  }

  async mergeAcl(args: any) {
    const defaultVal =
      this.schema.access && this.schema.access.default != null
        ? this.schema.access.default
        : true;
    const defaultAcl = this.generateDefaultAcl(defaultVal);
    const updatedAcl = await Promise.all(
      _.map(defaultAcl.acl, async (item) => {
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
                  ? await accessItemValue(args)
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
      })
    );

    // Verbose field level Function
    const verboseUpdatedAcl = await Promise.all(
      _.map(updatedAcl, async (item) => {
        const getKeys = _.keys(item);
        const roleName: string = getKeys[0];
        const accessItem = item[roleName];

        accessItem.read =
          typeof accessItem.read === "function"
            ? await accessItem.read(args)
            : accessItem.read;
        accessItem.create =
          typeof accessItem.create === "function"
            ? await accessItem.create(args)
            : accessItem.create;
        accessItem.update =
          typeof accessItem.update === "function"
            ? await accessItem.update(args)
            : accessItem.update;
        accessItem.delete =
          typeof accessItem.delete === "function"
            ? await accessItem.delete(args)
            : accessItem.delete;

        return { [roleName]: accessItem };
      })
    );
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
      switch (field) {
        case "AND":
          querySchema = {
            $and: _.map(fieldReq, (item) => this.whereInputCompose(item)),
          };
          break;
        case "OR":
          querySchema = {
            $or: _.map(fieldReq, (item) => this.whereInputCompose(item)),
          };
          break;
        default:
          querySchema = this.whereInputMap(input);
          break;
      }
    });
    return querySchema;
  }

  whereInputMap(input: any) {
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
