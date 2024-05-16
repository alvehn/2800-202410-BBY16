const study_group_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["group_name", "members", "sessions"],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "must be an ObjectId and is required",
      },
      group_name: {
        bsonType: "string",
        description: "must be a string and is required",
      },
      members: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of user IDs",
      },
      sessions: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of group study session IDs",
      },
    },
  },
};

module.exports = study_group_schema;
