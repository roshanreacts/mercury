import _ from "lodash";
import graphqlFields from "graphql-fields";

class Resolvers {
  modelName: string;
  modelFields: FieldsMap;
  generate: Generate;
  constructor(base: Generate) {
    this.generate = base;
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
        const refModel = this.modelFields[item].ref;
        const select = _.keys(parentFields[item]);
        populate.push({
          path: item,
          select: select.join(" "),
        });
      }
    });
    return populate;
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
          const findAll = await Model.find(
            this.whereInputCompose(args.where)
          ).populate(populate);
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
          const populate = this.resolvePopulate(resolveInfo);
          const findOne = await Model.findOne(
            this.whereInputCompose(args.where)
          ).populate(populate);
          return findOne;
        };
        break;
      // Mutations
      case `create${this.modelName}`:
        return async (root: any, args: { data: any }, ctx: any) => {
          const newModel = new Model(args.data);
          await newModel.save();
          return newModel;
        };
        break;

      case `create${this.modelName}s`:
        return async (root: any, args: { data: any }, ctx: any) => {
          const allRecords = await Model.insertMany(args.data);
          return allRecords;
        };
        break;

      case `update${this.modelName}`:
        return async (root: any, args: { id: string; data: any }, ctx: any) => {
          return await Model.findByIdAndUpdate(args.id, args.data, {
            new: true,
          });
        };
        break;

      case `update${this.modelName}s`:
        return async (root: any, args: { data: any }, ctx: any) => {
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
          await Model.findByIdAndDelete(args.id);
          return true;
        };
        break;

      case `delete${this.modelName}s`:
        return async (root: any, args: { ids: any }, ctx: any) => {
          await Promise.all(
            _.map(args.ids, async (id: any) => {
              const deleteRecord = await Model.findByIdAndDelete(id);
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
