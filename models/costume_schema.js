const costume_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["name", "cost", "compatibility", "description"],
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
        description: "must be a number and is required",
      },
      description: {
        bsonType: "string",
        description: "must be a string and is required",
      },
    },
  },
};

module.exports = costume_schema;
