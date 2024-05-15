const user_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "username",
      "email",
      "password",
      "total_study_hours",
      "points",
      "pets_owned",
      "current_pet",
    ],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "must be an ObjectId and is required",
      },
      username: {
        bsonType: "string",
        description: "must be a string and is required",
      },
      email: {
        bsonType: "string",
        pattern: "^.+@.+..+$",
        description: "must be a string and match the email pattern",
      },
      password: {
        bsonType: "string",
        description: "must be a string and is requireda",
      },
      total_study_hours: {
        bsonType: "int",
        description: "must be a number and is required",
      },
      points: {
        bsonType: "int",
        description: "must be a number and is required",
      },
      pets_owned: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of pet IDs and is required",
      },
      friends: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of friends' IDs",
      },
      individual_sessions: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description:
          "must be an array of session IDs for individual study sessions",
      },
      group_sessions: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of session IDs for group study sessions",
      },
      current_pet: {
        bsonType: "objectId",
        description: "must be an ObjectId",
      },
      study_streak: {
        bsonType: "int",
        description: "must be a number",
      },
      equip_profile_image: {
        bsonType: "string",
        description: "must be a string",
      },
      achievements: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of achievement IDs",
      },
    },
  },
};

module.exports = user_schema;
