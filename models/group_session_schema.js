const group_session_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["group_id", "participants", "points_earned", "duration", "date"],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "must be an ObjectId and is required",
      },
      group_id: {
        bsonType: "objectId",
        description: "must be an ObjectId and is required",
      },
      participants: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of user IDs",
      },
      points_earned: {
        bsonType: "int",
        description: "must be a number and is required",
      },
      duration: {
        bsonType: "int",
        description: "must be a number and is required",
      },
      date: {
        bsonType: "date",
        description: "must be a date and is required",
      },
    },
  },
};

module.exports = group_session_schema;
