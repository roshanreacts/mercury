// @ts-ignore
import _ from "lodash";
import graphqlFields from "graphql-fields";
import Generate from "./Generate";

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

  async resolvePopulate(
    resolveInfo: any,
    validFields: AccessFields,
    args: any,
    operationType: AccessKeys,
    paginate = false
  ): Promise<PopulateType> {
    const pickRef = _.pickBy(this.modelFields, (item) => _.has(item, "ref"));
    const populateFields = _.keys(pickRef);
    let parentFields = graphqlFields(resolveInfo);

    // If pagination then skip request.docs
    if (paginate) {
      parentFields = parentFields.docs;
    }

    console.log("parentFields", parentFields);
    console.log("populateFields", populateFields);

    let populate: PopulateType = [];
    await Promise.all(
      _.map(populateFields, async (item) => {
        console.log("item", item);
        console.log(
          "_.includes(validFields, item)",
          _.includes(validFields, item)
        );

        if (_.includes(validFields, item)) {
          const findModelName = pickRef[item].ref;
          console.log("findModelName", findModelName);
          let parentListModel = _.find(this._list, ["_model", findModelName]);
          console.log("parentListModel", parentListModel);
          if (!parentListModel) return;
          const parentGenerate = new Generate(
            parentListModel,
            this.generate._mercury
          );
          const parentAllowedKeys = await parentGenerate
            .Resolvers()
            .validateAccess(operationType, args);
          console.log("parentAllowedKeys", parentAllowedKeys);
          const select = _.keys(parentFields[item]);
          const parentIntersection = _.intersection(parentAllowedKeys, select);
          let populateSchema: any = {
            path: item,
            select: parentIntersection.join(" "),
          };
          console.log("populateSchema", populateSchema);

          let childPopulate: { path: string; select: string }[] = [];
          let childListModel = _.find(this._list, ["_model", findModelName]);

          const pickRefChild = _.pickBy(childListModel?.fields, (list) =>
            _.has(list, "ref")
          );
          if (!_.isEmpty(pickRefChild)) {
            const populateChildFields = _.keys(pickRefChild);
            Promise.all(
              _.map(populateChildFields, async (childItem) => {
                if (_.includes(parentIntersection, childItem)) {
                  const findChildModelName = pickRefChild[childItem].ref;
                  let childFindListModel = _.find(this._list, [
                    "_model",
                    findChildModelName,
                  ]);
                  if (!childFindListModel) return;
                  const childGenerate = new Generate(
                    childFindListModel,
                    this.generate._mercury
                  );
                  const childAllowedKeys = await childGenerate
                    .Resolvers()
                    .validateAccess(operationType, args);
                  console.log("childAllowedKeys", childAllowedKeys);
                  const childSelect = _.keys(parentFields[item][childItem]);
                  const intersectionByAllowed = _.intersection(
                    childSelect,
                    childAllowedKeys
                  );
                  childPopulate.push({
                    path: childItem,
                    select: intersectionByAllowed.join(" "),
                  });
                }
              })
            );
            if (childPopulate) populateSchema.populate = childPopulate;
          }

          populate.push(populateSchema);
        }
      })
    );
    return populate;
  }

  async hooks(name: string, args: any) {
    switch (name) {
      case "beforeCreate":
        this.schema?.hooks?.beforeCreate
          ? await this.schema.hooks.beforeCreate(args)
          : true;
        break;
      case "afterCreate":
        this.schema?.hooks?.afterCreate
          ? await this.schema.hooks.afterCreate(args)
          : true;
        break;
      case "beforeUpdate":
        this.schema?.hooks?.beforeUpdate
          ? await this.schema.hooks.beforeUpdate(args)
          : true;
        break;
      case "afterUpdate":
        this.schema?.hooks?.afterUpdate
          ? await this.schema.hooks.afterUpdate(args)
          : true;
        break;
      case "beforeDelete":
        this.schema?.hooks?.beforeDelete
          ? await this.schema.hooks.beforeDelete(args)
          : true;
        break;
      case "afterDelete":
        this.schema?.hooks?.afterDelete
          ? await this.schema?.hooks?.afterDelete(args)
          : true;
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
          args: { where: any; offset: number; limit: number },
          ctx: any,
          resolveInfo: any
        ) => {
          let parentFields = _.keys(graphqlFields(resolveInfo).docs);
          const allowedKey = await this.validateAccess("read", {
            root,
            args,
            ctx,
            resolveInfo,
          });

          const populate = await this.resolvePopulate(
            resolveInfo,
            allowedKey,
            { root, args, ctx, resolveInfo },
            "read",
            true
          );
          const selectedKey = _.intersection(parentFields, allowedKey);
          console.log("populate", populate);
          console.log("selectedKey", selectedKey);
          console.log("allowedKey", allowedKey);
          console.log("parentFields", parentFields);
          const findAll = await Model.paginate(
            this.whereInputCompose(args.where),
            {
              select: selectedKey.join(" "),
              populate: populate,
              offset: args.offset,
              limit: args.limit,
            }
          );

          return findAll;
        };
        break;
      case `get${this.modelName}`:
        return async (
          root: any,
          args: { where: any },
          ctx: any,
          resolveInfo: any
        ) => {
          let parentFields = _.keys(graphqlFields(resolveInfo));
          const allowedKey = await this.validateAccess("read", {
            root,
            args,
            ctx,
            resolveInfo,
          });

          const populate = await this.resolvePopulate(
            resolveInfo,
            allowedKey,
            { root, args, ctx, resolveInfo },
            "read"
          );
          const selectedKey = _.intersection(parentFields, allowedKey);
          const findOne = await Model.findOne(
            this.whereInputCompose(args.where)
          )
            .select(selectedKey.join(" "))
            .populate(populate);
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
          let parentFields = _.keys(graphqlFields(resolveInfo));
          const allowedKey = await this.validateAccess("create", {
            root,
            args,
            ctx,
            resolveInfo,
          });

          const populate = await this.resolvePopulate(
            resolveInfo,
            allowedKey,
            { root, args, ctx, resolveInfo },
            "create"
          );
          const selectedKey = _.intersection(parentFields, allowedKey);
          this.hooks("beforeCreate", {
            root,
            args,
            ctx,
            resolveInfo,
            allowedKey,
          });
          const newModel = new Model(args.data);
          await newModel.save();
          this.hooks("afterCreate", {
            root,
            args,
            ctx,
            resolveInfo,
            populate,
            docs: newModel,
          });
          return await newModel
            .select(selectedKey.join(" "))
            .populate(populate)
            .execPopulate();
        };
        break;

      case `create${this.modelName}s`:
        return async (
          root: any,
          args: { data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          let parentFields = _.keys(graphqlFields(resolveInfo));
          const allowedKey = await this.validateAccess("create", {
            root,
            args,
            ctx,
            resolveInfo,
          });

          const populate = await this.resolvePopulate(
            resolveInfo,
            allowedKey,
            { root, args, ctx, resolveInfo },
            "create"
          );
          const selectedKey = _.intersection(parentFields, allowedKey);
          const allRecords: any = [];
          await Promise.all(
            _.map(args.data, async (record) => {
              this.hooks("beforeCreate", {
                root,
                args,
                ctx,
                resolveInfo,
                allowedKey,
              });
              const newRecord = await Model.create(record);
              await newRecord
                .select(selectedKey.join(" "))
                .populate(populate)
                .execPopulate();
              this.hooks("afterCreate", {
                root,
                args,
                ctx,
                resolveInfo,
                allowedKey,
                docs: newRecord,
              });
              allRecords.push(newRecord);
            })
          );

          return allRecords;
        };
        break;

      case `update${this.modelName}`:
        return async (
          root: any,
          args: { id: string; data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          let parentFields = _.keys(graphqlFields(resolveInfo));
          const allowedKey = await this.validateAccess("update", {
            root,
            args,
            ctx,
            resolveInfo,
          });

          const populate = await this.resolvePopulate(
            resolveInfo,
            allowedKey,
            { root, args, ctx, resolveInfo },
            "update"
          );
          const selectedKey = _.intersection(parentFields, allowedKey);
          const findModel = await Model.findById(args.id);
          if (!findModel) {
            throw new Error(`Record with id: ${args.id} not found`);
          }
          this.hooks("beforeUpdate", {
            root,
            args,
            ctx,
            resolveInfo,
            allowedKey,
            prevRecord: findModel,
          });
          const updateModel = await Model.findByIdAndUpdate(
            args.id,
            args.data,
            {
              new: true,
            }
          );
          await updateModel
            .select(selectedKey.join(" "))
            .populate(populate)
            .execPopulate();
          this.hooks("afterUpdate", {
            root,
            args,
            ctx,
            resolveInfo,
            allowedKey,
            prevRecord: findModel,
            docs: updateModel,
          });
          return updateModel;
        };
        break;

      case `update${this.modelName}s`:
        return async (
          root: any,
          args: { data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          let parentFields = _.keys(graphqlFields(resolveInfo));
          const allowedKey = await this.validateAccess("update", {
            root,
            args,
            ctx,
            resolveInfo,
          });

          const populate = await this.resolvePopulate(
            resolveInfo,
            allowedKey,
            { root, args, ctx, resolveInfo },
            "update"
          );
          const selectedKey = _.intersection(parentFields, allowedKey);
          let updatedRecords: any[] = [];
          await Promise.all(
            _.map(args.data, async (record: any) => {
              const findModel = await Model.findById(record.id);
              if (!findModel) {
                throw new Error(`Record with id: ${record.id} not found`);
              }
              this.hooks("beforeUpdate", {
                root,
                args,
                ctx,
                resolveInfo,
                allowedKey,
                prevRecord: findModel,
              });
              const updateRecord = await Model.findByIdAndUpdate(
                record.id,
                record.data,
                { new: true }
              );
              await updateRecord
                .select(selectedKey.join(" "))
                .populate(populate)
                .execPopulate();
              this.hooks("afterUpdate", {
                root,
                args,
                ctx,
                resolveInfo,
                allowedKey,
                prevRecord: findModel,
                docs: updateRecord,
              });
              updatedRecords.push(updateRecord);
            })
          );
          return updatedRecords;
        };
        break;

      case `delete${this.modelName}`:
        return async (
          root: any,
          args: { id: string; data: any },
          ctx: any,
          resolveInfo: any
        ) => {
          await this.validateAccess("delete", {
            root,
            args,
            ctx,
            resolveInfo,
          });
          const findModel = await Model.findById(args.id);
          this.hooks("beforeDelete", {
            root,
            args,
            ctx,
            resolveInfo,
            prevRecord: findModel,
          });
          const delRec = await Model.findByIdAndDelete(args.id);
          this.hooks("afterDelete", {
            root,
            args,
            ctx,
            resolveInfo,
            prevRecord: findModel,
            docs: delRec,
          });
          return true;
        };
        break;

      case `delete${this.modelName}s`:
        return async (
          root: any,
          args: { ids: any },
          ctx: any,
          resolveInfo: any
        ) => {
          await this.validateAccess("delete", {
            root,
            args,
            ctx,
            resolveInfo,
          });
          await Promise.all(
            _.map(args.ids, async (id: any) => {
              const findModel = await Model.findById(id);
              this.hooks("beforeDelete", {
                root,
                args,
                ctx,
                resolveInfo,
                prevRecord: findModel,
              });
              const delRec = await Model.findByIdAndDelete(id);
              this.hooks("afterDelete", {
                root,
                args,
                ctx,
                resolveInfo,
                prevRecord: findModel,
                docs: delRec,
              });
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
  ): Promise<AccessFields> {
    const { ctx } = args;
    const role: string = ctx.user.role;
    const getAclMatrix = await this.mergeAcl(role, args);
    const checkAccess: boolean =
      getAclMatrix.acl?.[accessType] || getAclMatrix.default;
    if (!checkAccess) {
      throw new Error("Unauthorised access");
    }
    return getAclMatrix.accessList[accessType];
  }

  async mergeAcl(
    role: string,
    args: any
  ): Promise<{
    default: boolean;
    acl: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    accessList: verboseAccessFieldType;
  }> {
    const defaultVal =
      this.schema.access && this.schema.access.default != null
        ? this.schema.access.default
        : true;
    let accessItem = _.find(this.schema.access?.acl, role);
    const defaultAcl = this.generateDefaultAcl(defaultVal);
    const findRoleItem = _.find(defaultAcl.acl, role);
    const item = findRoleItem?.[role];
    let updatedAcl: verboseAccessType = item || {
      read: defaultVal,
      create: defaultVal,
      delete: defaultVal,
      update: defaultVal,
    };

    if (accessItem != null) {
      const roleItem = accessItem[role];
      if (typeof roleItem === "object") {
        updatedAcl = _.merge(item, roleItem);
      } else if (typeof roleItem === "boolean") {
        updatedAcl = {
          read: roleItem,
          create: roleItem,
          delete: roleItem,
          update: roleItem,
        };
      } else if (typeof roleItem === "function") {
        const accessItemFunc = await roleItem(args);
        if (typeof accessItemFunc === "boolean") {
          updatedAcl = {
            read: accessItemFunc,
            create: accessItemFunc,
            delete: accessItemFunc,
            update: accessItemFunc,
          };
        } else if (typeof accessItemFunc === "object") {
          updatedAcl = _.merge(item, accessItemFunc);
        }
      } else {
        updatedAcl = {
          read: defaultVal,
          create: defaultVal,
          delete: defaultVal,
          update: defaultVal,
        };
      }
    }

    // Verbose field level Function
    const defaultAccessKeys = defaultVal ? _.keys(this.modelFields) : [];
    let accessList: {
      read: AccessFields;
      create: AccessFields;
      update: AccessFields;
      delete: AccessFields;
    } = {
      read: defaultAccessKeys,
      create: defaultAccessKeys,
      delete: defaultAccessKeys,
      update: defaultAccessKeys,
    };
    let verboseUpdatedAcl: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    } = {
      read: defaultVal,
      create: defaultVal,
      delete: defaultVal,
      update: defaultVal,
    };
    let accessItemVerbose = updatedAcl;

    if (accessItemVerbose) {
      _.map(["read", "create", "update", "delete"], async (key: AccessKeys) => {
        const accessIterateItem = accessItemVerbose[key];
        if (!accessIterateItem) return;
        let accessStatus: boolean;
        if (typeof accessIterateItem === "function") {
          const access = await accessIterateItem(args);
          accessStatus = _.isArray(access) ? true : access || defaultVal;
        } else {
          if (_.isArray(accessIterateItem)) {
            accessList[key] = accessIterateItem;
            accessStatus = true;
          } else {
            accessStatus = accessIterateItem || defaultVal;
          }
        }
        verboseUpdatedAcl[key] = accessStatus;
      });
    }
    return {
      default: defaultVal,
      acl: verboseUpdatedAcl,
      accessList: accessList,
    };
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
      let key: string | undefined | any;
      if (field !== "id") {
        key = this.generate.getFieldType(this.modelFields[field].type, "gql");
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
        case "relationship":
          querySchema[field] = _.has(fieldReq, "is")
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
        case "Boolean":
          querySchema[field] = { $eq: fieldReq };
          break;
        case "Int":
        case "DateTime":
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
