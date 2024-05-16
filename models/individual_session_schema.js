const individual_session_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["user_id", "hours_spent", "date", "points_earned"],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "must be an ObjectId and is required",
      },
      user_id: {
        bsonType: "objectId",
        description: "must be the ObjectId of the user and is required",
      },
      hours_spent: {
        bsonType: "int",
        description: "must be a number and is required",
      },
      date: {
        bsonType: "date",
        description: "must be a date and is required",
      },
      points_earned: {
        bsonType: "int",
        description: "must be a number and is required",
      },
    },
  },
};

module.exports = individual_session_schema;
