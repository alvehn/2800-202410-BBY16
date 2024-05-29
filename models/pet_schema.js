const pet_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["name", "cost", "image", "description"],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "must be an ObjectId",
      },
      name: {
        bsonType: "string",
        description: "must be a string and is required",
      },
      cost: {
        bsonType: "int",
        description:
          "must be a number of the required amount of points and is required",
      },
      description: {
        bsonType: "string",
        description: "must be a string and is required",
      },
    },
  },
};

module.exports = pet_schema;
