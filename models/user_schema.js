const user_schema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["username", "email", "display_name", "password", "current_pet"],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "must be an ObjectId and is required",
      },
      display_name: {
        bsonType: "string",
        description: "the display name of the user and is required",
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
        description: "must be a hashed string and is required",
      },
      total_study_hours: {
        bsonType: "int",
        description: "must be a number",
      },
      points: {
        bsonType: "int",
        description: "must be a number",
      },
      pets_owned: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of pet IDs",
      },
      friends: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
        },
        description: "must be an array of user objectIds",
      },
      incoming_requests: {
        bsonType: "array",
        items: {
          bsonType: "string",
        },
        description: "must be an array of user usernames",
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
      current_pet_name: {
        bsonType: "string",
        description: "must be a string.",
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
      status: {
        bsonType: "string",
        description: "must be a string of either 'online' or 'offline'",
      },
      study_session: {
        bsonType: "object",
        properties: {
          inSession: {
            bsonType: "bool",
            description:
              "indicates if the user is currently in a study session",
          },
        },
        description: "contains the current study session information",
      },
      hours_per_day: {    // I add this
        bsonType: "int",
        description: "stores the total hours study per day, must be a number"
      },
      study_history: {
        bsonType: "array",
        description: "Store the hours study per day in an array",
        items: {
          bsonType: "object"
        }
      },
      groups: {
        bsonType: "array",
        items: {
          bsonType: "objectId",
          description: "refers to the group",
        },
        description: "an array that holds the groups the user is in.",
      },
    },
  },
};

module.exports = user_schema;
