const achievement_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["achievement_name", "achievement_id", "description", "image"],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "must be an ObjectId",
      },
      achievement_name: {
        bsonType: "string",
        description: "must be a string and is required",
      },
      achievement_id: {
        bsonType: "string",
        description: "must be a string and is required",
      },
      description: {
        bsonType: "string",
        description: "must be a string and is required",
      },
      image: {
        bsonType: "string",
        description: "must be a string and is required",
      },
    },
  },
};

module.exports = achievement_schema;
