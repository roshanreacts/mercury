# Realmoose

A mongoose like ORM for Realm DB.

## Installation

Use the package manager yarn to install realmoose.

```bash
npm install realmoose
```

Use the package manager yarn to install realmoose.

```bash
yarn add realmoose
```

## Usage

Realmoose is a [mongoose](https://www.npmjs.com/package/mongoose) like ORM built for [RealmDB](https://realm.io/).

The basic usage of realmoose in es6 goes like

```javascript
import {Schema, Model} from "realmoose";

const carSchema = new Schema({
    name: "Car",
    properties: {
        make: { type: "string" },
        model: { type: "string", indexed: true, unique: true },
        miles?: { type: "int", default: 0 },
    },
});

let carModel = new Model(carSchema, "vehicles.realm", 1);
```

This is almost similar to the mongoose model.

```javascript
const newCarSchema = { make: "BWM", model: "Good4" };
const newCar = carModel.create(newCarSchema); // Will create a rec with newCarSchema obj.
```

We have some key features in realmoose.

The most important of them is, you can use a **unique** key for the unique validation of the document (at first JSON node level).
As you know RealmDB doesn't support unique field validation out of the box. So we added this feature to make life better.

This package also has some more features like.

- Model-level DB path declaration (No need to import and merge your schemas).
- Has all the basic methods like find, findById, findOne, update, create... for the model.
- No need for Realm.write for write transactions.

## Roadmap

- Virtual fields
- Populate

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
