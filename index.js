/*
    This part are all the dependencies of the project.
*/
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const ejs = require("ejs");
const cron = require("node-cron");
const socketIo = require('socket.io');
const nodemailer = require("nodemailer");
const axios = require("axios");
const cloudinary = require('cloudinary');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const app = express();
const { ObjectId } = require("mongodb"); // Use new ObjectId() to generate a new unique ID
const querystring = require("querystring");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/* 
    Importing database schema 
*/
const user_schema = require("./models/user_schema");
const individual_session_schema = require("./models/individual_session_schema");
const group_session_schema = require("./models/group_session_schema");
const study_group_schema = require("./models/group_schema");
const costume_schema = require("./models/costume_schema");
const achievement_schema = require("./models/achievement_schema");
const pet_schema = require("./models/pet_schema");

/*
    This part are all the static number for our project 
    (session expireTime, saltRounds etc)
*/
const expireTime = 24 * 60 * 60 * 1000; // Set to 1 day initially for sessions
const saltRounds = 12; // The level of encryption, trade off between security and performence.

/*
    This part are all the secret data.
*/

const port = process.env.PORT || 3000;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const mongodb_database = process.env.MONGODB_DATABASE; // We currently only have one database; We chould have many under one cluster.
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_host = process.env.MONGODB_HOST;
const email_account = process.env.EMAIL_ACCOUNT;
const email_password = process.env.EMAIL_PASSWORD;
const runScheduledTask = process.env.RUN_SCHEDULED_TASK === "true";
const cloudinary_name = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinary_key = process.env.CLOUDINARY_CLOUD_KEY;
const cloudinary_secret = process.env.CLOUDINARY_CLOUD_SECRET;

/*
    This part are for database connection.
*/
// retryWrites: write operation will retry if it fail for any reasons.
const atlasURL = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true`;
const mongoStore = require("connect-mongo"); // Use for storing session only.
const { start } = require("repl");
const mongoClient = require("mongodb").MongoClient; // Use for CRUD with the database.

// instance of mongoClient, similiar to express and app.
const database = new mongoClient(atlasURL);
const studyPals = database.db(mongodb_database); // The actual database we will interact with.

// All the collections
const usersCollection = studyPals.collection("users");
const petsCollection = studyPals.collection("pets");
const resetCodeCollection = studyPals.collection("reset_code");
const individual_sessionsCollection = studyPals.collection(
  "individual_sessions"
);
const group_sessionsCollection = studyPals.collection("group_sessions");
const groupsCollection = studyPals.collection("groups");
const costumesCollection = studyPals.collection("costumes");

/* Validating that when you try to update the database, it ensures that it doesn't violate these properties. */
studyPals.command({
  collMod: "users",
  validator: user_schema,
});

studyPals.command({
  collMod: "costumes",
  validator: costume_schema,
});

studyPals.command({
  collMod: "pets",
  validator: pet_schema,
});

/*
    This part are for common middlewares
*/
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));
app.use(
  session({
    secret: node_session_secret,
    saveUninitialized: false,
    resave: true,
    store: mongoStore.create({
      mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
      collection: "sessions",
      crypto: {
        secret: mongodb_session_secret,
      },
    }),
  })
);

function sessionValidation(endRoute) {
  // SessionValidation, I wraped the middleware function
  return function (req, res, next) {
    // in another function so that you can redirect the user
    if (req.session.authenticated) {
      // to different location depends on where the request route.
      next();
    } else {
      // res.redirect("/"); What is the purpose of the bottom line? If I try to access the home page without this line, the page will permanently be loading.
      if (endRoute === "profile") {
        res.redirect("/login");
      }
    }
  };
}

// Used in the signup page to check if the unique username or email is already in use.
function accountValidation() {
  return async function (req, res, next) {
    let username = req.body.username;
    let email = req.body.email;
    const nameInUse = await usersCollection.findOne({ username: username });

    const emailInUse = await usersCollection.findOne({ email: email });

    if (emailInUse || nameInUse) {
      let errorMessage = [];

      if (emailInUse) errorMessage.push("emailInUse=true");
      if (nameInUse) errorMessage.push("nameInUse=true");

      const errorQueryString = errorMessage.join("&");

      return res.redirect(`/signup?${errorQueryString}`);
    }
    next();
  };
}

// This is for verifying the token when a user logs in with their gmail.
async function verifyToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload;
}

/*
  This part is for mail transpoter
*/

const gmailTransporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: email_account,
    pass: email_password,
  },
});

/*
  This part is for cloudinary config for uploading files
  and the setting for multer
*/

cloudinary.config({
  cloud_name: cloudinary_name,
  api_key: cloudinary_key,
  api_secret: cloudinary_secret
})

const storage = multer.memoryStorage();
const upload = multer({ storage: storage});

/*
    Below are route handlers
*/
app.set("view engine", "ejs");

app.get("/googlesignin", (req, res) => {
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
  res.redirect(url);
});

// Handling google authorization API callback.
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;

  // Exchange authorization code for access token
  try {
    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      querystring.stringify({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }
    );

    const tokens = response.data;
    const idToken = tokens.id_token;

    // Verify the ID token and get user info
    const userInfo = await verifyToken(idToken);
    // Handle user info (e.g., create a session, store user data in the database)
    let user = await usersCollection.findOne({ email: userInfo.email });

    // Handles logging in with your gmail.
    if (user) {
      await usersCollection.updateOne(
        { email: userInfo.email },
        { $set: { status: "online" } }
      );
      req.session.authenticated = true;
      req.session.userID = user._id.toString();
      req.session.username = user.username;
      req.session.display_name = user.display_name;
      req.session.friends = user.friends;
      req.session.incoming_requests = user.incoming_requests;
      req.session.groups = user.groups;
      req.session.cookie.maxAge = expireTime;
      req.session.current_pet = await petsCollection.findOne({
        _id: user.current_pet,
      });
      req.session.current_costume = await costumesCollection.findOne({
        _id: user.current_costume,
      });

      await usersCollection.updateOne(
        { _id: new ObjectId(req.session.userID) },
        { $set: { current_pet_name: req.session.current_pet.name } }
      );

      return res.redirect("/home_page");
    } else {
      // Handles signing up for an account using the users email.
      return res.redirect(
        `/signup?email=${userInfo.email}&name=${userInfo.name}`
      );
    }
  } catch (error) {
    console.error("Error exchanging authorization code:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/", (req, res) => {
  const validSession = req.session.authenticated;
  let username;
  if (req.session.username) {
    username = req.session.username;
  }
  res.render("index", { hasValidSession: validSession, username});
});

app.get("/signup", (req, res) => {
  const { emailInUse, nameInUse } = req.query;
  const errors = {};
  let email = req.query.email;
  let name = req.query.name;

  if (emailInUse) errors.emailInUse = "Email is already in use";
  if (nameInUse) errors.nameInUse = "Username is already in use";

  res.render("signup", { errors, email, name });
});

app.post("/signupSubmit", accountValidation(), async (req, res) => {
  let username = req.body.username;
  let email = req.body.email;
  let password = req.body.password;
  let displayname = req.body.displayname;
  let usernameSchema = Joi.string().alphanum().max(20).required();
  let emailSchema = Joi.string().email().required();
  let passwordSchema = Joi.string().max(20).required();
  let displaynameSchema = Joi.string().alphanum().max(20).required();
  let error = {};

  let usernameValidation = usernameSchema.validate(username);
  let emailValidation = emailSchema.validate(email);
  let passwordValidation = passwordSchema.validate(password);
  let displaynameValidation = displaynameSchema.validate(displayname);
  if (usernameValidation.error != null) {
    error.username = true;
  }
  if (emailValidation.error != null) {
    error.email = true;
  }
  if (passwordValidation.error != null) {
    error.password = true;
  }
  if (displaynameValidation.error != null) {
    error.displayName = true;
  }
  if (error.username || error.email || error.password || error.displayName) {
    return res.render("signup", { validation: error });
  } else {
    let hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
      let user = await usersCollection.insertOne({
        username: username,
        email: email,
        password: hashedPassword,
        display_name: displayname,
        current_pet: new ObjectId("664d3a5cfd6cca06e79cc641"),
        current_pet_name: "fox",
        current_costume: null,
        friends: [],
        incoming_requests: [],
        groups: [],
        pets_owned: [new ObjectId("664d3a5cfd6cca06e79cc641")],
        costumes_owned: [],
        total_study_hours: 0, // Initialize with default values
        points: 0, // Initialize with default values
        study_streak: 0, // Initialize with default values
        equip_profile_image: "", // Initialize with default values
        achievements: [], // Initialize with default values
        individual_sessions: [], // Assuming individual_sessions for sessions
        group_sessions: [], // Assuming group_sessions for sessions
        study_session: {
          inSession: false,
          intervalId: 0,
          currentSessionID: null,
          group: false,
        },
        hours_per_day: 0,
        study_history: [],
        status: "online", // Assuming the user sign_up normally
      });

      req.session.authenticated = true;
      req.session.username = username;
      req.session.friends = [];
      req.session.groups = [];
      req.session.cookie.maxAge = expireTime;
      req.session.current_pet = await petsCollection.findOne({
        _id: new ObjectId("664d3a5cfd6cca06e79cc641"),
      });
      req.session.current_pet_name = "fox";
      req.session.userID = user.insertedId.toString();

      res.redirect("/home_page");
      return;
    } catch (err) {
      if (err.name === "MongoError" && err.code === 121) {
        console.log("Document validation error");
        return res.redirect("/sign_up");
      } else {
        console.log(err);
        return res.render("signup", {
          error: "Sign up failed, please try again.",
        });
      }
    }
  }
});

app.get("/groups", (req, res) => {
  res.render("groups", {
    currentPage: "groups",
    displayName: req.session.display_name,
    username: req.session.username
  });
});

app.get("/petinv", async (req, res) => {
  try {
    const currentPetId = req.session.current_pet._id;

    const user = await usersCollection.findOne({
      _id: new ObjectId(req.session.userID),
    });

    const ownedPetsPromises = user.pets_owned.map(async (pet) => {
      return await petsCollection.findOne({ _id: pet });
    });

    const ownedCostumesPromises = user.costumes_owned.map(async (costume) => {
      return await costumesCollection.findOne({ _id: costume });
    });

    const ownedPets = await Promise.all(ownedPetsPromises);
    const ownedCostumes = await Promise.all(ownedCostumesPromises);

    if (!currentPetId) {
      console.error("No current pet ID in session");
      return res.status(400).send("No current pet ID in session");
    }

    const currentPet = await petsCollection.findOne({
      _id: new ObjectId(currentPetId),
    });

    let equippedCostume = null;

    if (user.current_costume) {
      const costume = await costumesCollection.findOne({
        _id: new ObjectId(user.current_costume),
      });

      equippedCostume = costume ? costume.name : null;
    }

    if (currentPet) {
      res.render("petinv", {
        current_pet_name: req.session.current_pet.name,
        ownedPets,
        username: req.session.username,
        ownedCostumes,
        equippedCostume,
      });
    } else {
      console.error("No pet found with the given ID");
      res.status(404).send("No pet found with the given ID");
    }
  } catch (err) {
    console.log("error retrieving current pet: " + err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/update-pet", async (req, res) => {
  // Changes what pet the user has equipped.
  let result = await usersCollection.updateMany(
    { _id: new ObjectId(req.session.userID) },
    {
      $set: {
        current_pet: new ObjectId(req.body.newPetId),
        current_pet_name: req.body.newPetName,
      },
    }
  );

  req.session.current_pet = await petsCollection.findOne({
    _id: new ObjectId(req.body.newPetId),
  });

  if (result.acknowledged) {
    res.json({ success: true, message: "success updating pet" });
  } else {
    res.json({ success: false, message: "error updating pet" });
  }
});

app.post("/update-costume", async (req, res) => {
  let update;
  if (req.body.costumeId) {
    update = { current_costume: new ObjectId(req.body.costumeId) };
  } else {
    update = { current_costume: null };
  }

  let result = await usersCollection.updateMany(
    { _id: new ObjectId(req.session.userID) },
    {
      $set: update,
    }
  );

  if (req.body.costumeId) {
    req.session.current_costume = await costumesCollection.findOne({
      _id: new ObjectId(req.body.costumeId),
    });
  } else {
    req.session.current_costume = null;
  }

  if (result.acknowledged) {
    res.json({ success: true, message: "success updating costume" });
  } else {
    res.json({ success: false, message: "error updating costume" });
  }
});

app.get("/petshop", async (req, res) => {
  const user = await usersCollection.findOne({
    _id: new ObjectId(req.session.userID),
  });

  // Gets all the costumes from the costumes collection.
  const costumes = await costumesCollection.find({}).toArray();
  // Gets all the pets from the pets collection.
  const pets = await petsCollection.find({}).toArray();

  // Passing all the costumes and pets from the database.
  res.render("petshop", { user: user, costumes, pets, username: req.session.username });
});

app.get("/get-user-points", async (req, res) => {
  const userId = req.session.userID;
  const user = await usersCollection.findOne(
    { _id: new ObjectId(userId) },
    { projection: { points: 1 } }
  );

  if (!user) {
    return res.status(404).send("User not found");
  }

  res.json({ points: user.points });
});

app.get("/get-owned-items", async (req, res) => {
  const user = await usersCollection.findOne(
    { _id: new ObjectId(req.session.userID) },
    { projection: { pets_owned: 1, costumes_owned: 1 } }
  );

  if (user) {
    res.json({
      pets_owned: user.pets_owned || [],
      costumes_owned: user.costumes_owned || [],
    });
  }
});

// app.post('/buy-pet', async (req, res) => {
//   const user = await usersCollection.updateOne(
//     { _id: new ObjectId(req.session.userID) },  // Query to find the document
//     { $push: { pets_owned: new ObjectId(req.body.itemId) } }         // Update operation to push the new element
//   );

//   res.status(200).send('Item added to account');
// });

app.post("/buy-pet", async (req, res) => {
  const userId = req.session.userID;
  const petId = req.body.itemId;
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  const pet = await petsCollection.findOne({ _id: new ObjectId(petId) });
  if (user.points < pet.cost) {
    return res.status(400).send("Not enough points to buy this pet");
  }

  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $inc: { points: -pet.cost },
      $push: { pets_owned: new ObjectId(petId) },
    }
  );

  // res.status(200).send('Pet added to account');
});

app.post("/buy-item", async (req, res) => {
  const userId = req.session.userID;
  const costumeId = req.body.itemId;
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  const costume = await costumesCollection.findOne({
    _id: new ObjectId(costumeId),
  });
  if (user.points < costume.cost) {
    return res.status(400).send("Not enough points to buy this costume");
  }

  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $inc: { points: -costume.cost },
      $push: { costumes_owned: new ObjectId(costumeId) },
    }
  );

  res.status(200).send("Item added to account");
});

app.get("/login", (req, res) => {
  if (req.session.authenticated) {
    res.redirect("/home_page");
    return;
  }
  res.render("login");
});

app.post("/loggingin", async (req, res) => {
  console.log("loggingin route handler started");
  let username = req.body.username;
  let password = req.body.password;
  let usernameSchema = Joi.string().required();
  let passwordSchema = Joi.string().max(20).required();
  let usernameValidation = usernameSchema.validate(username);
  let passwordValidation = passwordSchema.validate(password);
  let error;
  if (usernameValidation.error == null && passwordValidation.error == null) {
    const result = await usersCollection
      .find({ username: username })
      .project({
        username: 1,
        password: 1,
        friends: 1,
        groups: 1,
        _id: 1,
        current_pet: 1,
        display_name: 1,
        current_costume: 1,
      })
      .toArray();
    if (result.length != 1) {
      error = "User not found.";
    } else if (await bcrypt.compare(password, result[0].password)) {
      await usersCollection.updateOne(
        { username: username },
        { $set: { status: "online" } }
      );
      req.session.authenticated = true;
      req.session.userID = result[0]._id.toString();
      req.session.username = result[0].username;
      req.session.display_name = result[0].display_name;
      req.session.friends = result[0].friends;
      req.session.incoming_requests = result[0].incoming_requests;
      req.session.groups = result[0].groups;
      req.session.cookie.maxAge = expireTime;
      req.session.current_pet = await petsCollection.findOne({
        _id: result[0].current_pet,
      });
      req.session.current_costume = await costumesCollection.findOne({
        _id: result[0].current_costume,
      });

      await usersCollection.updateOne(
        { _id: new ObjectId(req.session.userID) },
        { $set: { current_pet_name: req.session.current_pet.name } }
      );

      return res.redirect("/home_page");
    }
  }
  console.log(error);

  res.render("login", { error: error });
});

/*
  Password Resetting Section
  The following are handler for resetting user password through email
  during logining. 
*/
app.get("/forget_password", (req, res) => {
  res.render("forget_password", { userNotFound: 0 });
});

app.post("/reset_password", async (req, res) => {
  const { email } = req.body;
  const user = await usersCollection.findOne({ email: email });

  if (!user) {
    console.log("Wrong password");
    res.render("forget_password", { userNotFound: 1 });
  } else {
    res.render("reset_password", { email: email, codeError: 0 });
  }
});

app.post("/send_code", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.redirect("/forget_password");
    return;
  }
  console.log(email_account);
  console.log(email_password);

  console.log("valid email address");

  const resetCode = crypto.randomInt(1000, 9999).toString();
  console.log(resetCode);
  await resetCodeCollection.updateOne(
    { email: email },
    { $set: { resetCode: resetCode, codeExpiry: Date.now() + 60 * 1000 } },
    { upsert: true }
  );

  await gmailTransporter.sendMail({
    to: email,
    subject: "StudyPals: Password Reset Code",
    text: `Your password reset code is ${resetCode}`,
  });
  console.log("Code sent!");
  res.render("reset_password", { email: email, codeError: 0 });
});

app.post("/verify_code", async (req, res) => {
  const { email, code } = req.body;
  const validationResult = await resetCodeCollection.findOne({
    email: email,
    resetCode: code,
  });
  if (!validationResult || validationResult.codeExpiry < Date.now()) {
    res.render("reset_password", { email: email, codeError: 1 });
  } else {
    res.render("set_new_password", { email: email, error: 0 });
  }
});

app.post("/set_new_password", async (req, res) => {
  const { email, new_password, confirm_password } = req.body;
  if (new_password !== confirm_password) {
    res.render("set_new_password", { email: email, error: 1 });
  } else {
    const newHashedPassword = await bcrypt.hash(new_password, saltRounds);
    await usersCollection.updateOne(
      { email: email },
      { $set: { password: newHashedPassword } }
    );
    res.redirect("/login");
  }
});
/*
  End of Password Resetting Section
*/

app.get("/home_page", sessionValidation("home_page"), async (req, res) => {
  const user = await usersCollection.findOne({
    _id: new ObjectId(req.session.userID),
  });
  let equippedCostume = null;

  // Checks if there are any costumes equipped.
  if (
    req.session.current_costume !== null &&
    req.session.current_costume !== undefined
  ) {
    equippedCostume = req.session.current_costume.name;
  }

  res.render("home_page", {
    user: user,
    equippedCostume,
  });
});

/*
  The following handler are for starting individual stuy session.
*/
app.post(
  "/start_study_session",
  sessionValidation("start_study_session"),
  async (req, res) => {
    const isInSession = req.body.inSession === "true";
    const userID = new ObjectId(req.session.userID);

    if (isInSession) {
      res.redirect(`/study_session`);
      return;
    } else {
      const startTime = new Date();
      const newSession = {
        user_id: userID,
        start_time: startTime,
        end_time: null,
        duration: 0,
      };

      const result = await individual_sessionsCollection.insertOne(newSession);
      const newSessionId = result.insertedId;

      // Sets an interval function on server side to give players points periodically
      const interval = 60 * 1000; // 1 minute in milliseconds
      async function updateCoins(userID) {
        let amount = Math.floor(Math.random() * 11 + 45.5); // random points between 45 and 55
        try {
          await usersCollection.updateOne(
            { _id: userID },
            { $inc: { points: amount } }
          );
        } catch (err) {
          console.log(err);
        }
      }
      // Setup and runs interval function
      const intervalId = setInterval(async () => {
        await updateCoins(userID);
      }, interval);

      try {
        await usersCollection.updateOne(
          { _id: userID },
          {
            $set: {
              study_session: {
                inSession: true,
                intervalId: Math.floor(intervalId),
                currentSessionID: newSessionId,
                group: false
              },
            },
            $push: {
              individual_sessions: newSessionId,
            },
          }
        );
      } catch (err) {
        console.log(err);
      }

      res.redirect(`/study_session`);
    }
  }
);

app.get(
  "/study_session",
  sessionValidation("study_session"),
  async (req, res) => {
    console.log("Directed to study_session");
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.session.userID),
    });
    if (!user.study_session.inSession) {
      console.log("Direct" + user.username + " out of study_session");
      res.redirect("/home_page");
    } else {
      const petName = user.current_pet_name;

      let equippedCostume = null;
      if (user.current_costume) {
        const costume = await costumesCollection.findOne({
          _id: new ObjectId(user.current_costume),
        });

        equippedCostume = costume ? costume.name : null;
      }
      const intervalId = user.study_session.intervalId;
      const sessionId = new ObjectId(user.study_session.currentSessionID);
      let studySession;
      let members;
      if (user.study_session.group) {
        studySession = await group_sessionsCollection.findOne({
          _id: sessionId,
        });
        members = studySession.members;
        // Splices out the current user from the members array
        var indexToRemove = members.findIndex(id => id.equals(new ObjectId(req.session.userID)));
        if (indexToRemove !== -1) {
          members.splice(indexToRemove, 1);
        }
      } else {
        studySession = await individual_sessionsCollection.findOne({
          _id: sessionId,
        });
      }
      const startTime = studySession.start_time;
      let membersPet = [];
      if (members) {
        for (let member of members) {
          let pet = await usersCollection.findOne(
            { _id: member },
            { projection: { current_pet_name: 1 } }
          );
          membersPet.push(pet.current_pet_name);
        }
      }
      console.log("got to rendering study_session");
      try {
        res.render("study_session", {
          startTime: startTime.toISOString(),
          petName: petName,
          sessionId: sessionId,
          intervalId: intervalId,
          equippedCostume,
          membersPet: membersPet,
          username: req.session.username
        });
        res.render("study_session", {
          startTime: startTime.toISOString(),
          petName: petName,
          sessionId: sessionId,
          intervalId: intervalId,
          equippedCostume,
          membersPet: membersPet,
          username: req.session.username
        });
        console.log("Rendered study_session");
      } catch (err) {
        console.error("Error rendering study_session:", error);
      }
      
    }
  }
);

/*
  The following handler is for starting a group study session.
*/
app.post(
  "/start_group_session",
  sessionValidation("start_group_session"),
  async (req, res) => {
    const isInSession = req.body.inSession === "true";
    const userID = new ObjectId(req.session.userID);
    const group = req.body.group;
    const groupId = new ObjectId(group);
    // Need to get members from database for selected Group
    const members = await groupsCollection.findOne(
      { _id: groupId },
      { projection: { members: 1 } }
    );

    const joined = [userID]

    if (isInSession) {
      res.redirect(`/study_session`);
      return;
    } else {
      const startTime = new Date();
      const newSession = {
        group_id: groupId,
        start_time: startTime,
        end_time: null,
        duration: 0,
        members: members.members,
        joined: joined
      };

      const result = await group_sessionsCollection.insertOne(newSession);
      const newSessionId = result.insertedId;

      // Sets an interval function on server side to give players points periodically
      const interval = 60 * 1000; // 1 minute in milliseconds
      async function updateCoins(userID) {
        let amount = Math.floor(Math.random() * 5) + 3; // random points between 45 and 55
        try {
          await usersCollection.updateOne(
            { _id: userID },
            { $inc: { points: amount } }
          );
        } catch (err) {
          console.log(err);
        }
      }
      // Setup and runs interval function
      const intervalId = setInterval(async () => {
        await updateCoins(userID);
      }, interval);

      try {
        await usersCollection.updateOne(
          { _id: userID },
          {
            $set: {
              study_session: {
                inSession: true,
                intervalId: Math.floor(intervalId),
                currentSessionID: newSessionId,
                group: true
              },
            },
            $push: {
              group_sessions: newSessionId,
            },
          }
        );
      } catch (err) {
        console.log(err);
      }

      // Invite group members to join the group session
      var indexToRemove = members.members.findIndex(id => id.equals(new ObjectId(req.session.userID)));
      if (indexToRemove !== -1) {
        members.members.splice(indexToRemove, 1);
      }
      for (let member of members.members) {
        let username = await usersCollection.findOne(
          { _id: member },
          { projection: { username: 1 } }
        );
        sendNotificationToUser(username.username, newSessionId);
      }

      res.redirect(`/study_session`);
    }
  }
);

app.get("/get_points", sessionValidation("study_session"), async (req, res) => {
  const user = await usersCollection.findOne({
    _id: new ObjectId(req.session.userID),
  });
  if (!user.study_session.inSession) {
    res.redirect("/home_page");
  } else {
    let points = await usersCollection.findOne(
      { _id: new ObjectId(req.session.userID) },
      { projection: { points: 1 } }
    );
    res.send(points);
  }
});

app.post("/end_session", sessionValidation("end_session"), async (req, res) => {
  const userId = new ObjectId(req.session.userID);
  const sessionId = new ObjectId(req.body.sessionId);
  const startTime = new Date(req.body.startTime);
  const endTime = new Date();
  const duration = Math.floor((endTime - startTime) / 1000);

  // Closes the interval function on server side that gave players points
  const intervalId = req.body.intervalId;
  clearInterval(intervalId);

  await individual_sessionsCollection.updateOne(
    { _id: sessionId },
    {
      $set: {
        end_time: endTime,
        duration: duration,
      },
    }
  );

  await usersCollection.updateOne(
    { _id: userId },
    {
      $set: {
        study_session: {
          inSession: false,
          currentSessionID: null,
        },
      },
      $inc: {
        total_study_hours: duration,
        hours_per_day: duration,
      },
    }
  );
  res.redirect("/home_page");
});
/*
  The End of study session handler
*/

app.get("/friends", (req, res) => {
  console.log("friend route handler started");
  console.log("Session Display Name:", req.session.display_name);
  res.render("friends", {
    currentPage: "friends",
    displayName: req.session.display_name,
    username: req.session.username
  });
});

app.get("/profile", sessionValidation("profile"), async (req, res) => {
  const result = await usersCollection.findOne({
    _id: new ObjectId(req.session.userID),
  });

  const cloudinaryBaseUrl = `https://res.cloudinary.com/${cloudinary_name}/image/upload/`;
  const defaultProfileImageUrl = '/profile_images/profile1.png';
  const profileImageUrl = result.equip_profile_image ? cloudinaryBaseUrl + result.equip_profile_image : defaultProfileImageUrl;
  res.render("profile", { user: result, profileImageUrl: profileImageUrl });
});

app.get(
  "/update_profile",
  sessionValidation("update_profile"),
  async (req, res) => {
    const result = await usersCollection.findOne({
      _id: new ObjectId(req.session.userID),
    });

    const cloudinaryBaseUrl = `https://res.cloudinary.com/${cloudinary_name}/image/upload/`;
    const defaultProfileImageUrl = '/profile_images/profile1.png';
    const profileImageUrl = result.equip_profile_image ? cloudinaryBaseUrl + result.equip_profile_image : defaultProfileImageUrl;
    res.render("update_profile", { user: result, profileImageUrl: profileImageUrl });
  }
);

app.post(
  "/updating_profile",
  upload.single('profile_image'),
  sessionValidation("updating_profile"),
  async (req, res) => {
    const { display_name, username, email } = req.body;
    const userId = new ObjectId(req.session.userID);
    const userIdStr = userId.toString();

    let updateData = {
      display_name: display_name,
      username: username,
      email: email
    }

    if(req.file){
      const buffer = req.file.buffer;
      const dataURI = `data:${req.file.mimetype};base64,${buffer.toString('base64')}`;

      try {
        const publicId = `profile_${userIdStr}`; // Use the string version of userId
        const result = await cloudinary.uploader.upload(dataURI, { public_id: publicId });
        console.log("image update sucessfully");
        updateData.equip_profile_image = result.public_id;
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return res.status(500).send('Error uploading image');
      }
    }

    await usersCollection.updateOne(
      {_id: userId},
      { $set: updateData}
    );

    res.redirect('/profile');
  }
);

app.get(
  "/change_password",
  sessionValidation("change_password"),
  async (req, res) => {
    res.render("change_password", { error: null, username: req.session.username});
  }
);

app.post(
  "/changing_password",
  sessionValidation("changing_password"),
  async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    const { password: user_password } = await usersCollection.findOne({
      _id: new ObjectId(req.session.userID),
    });
    if (await bcrypt.compare(current_password, user_password)) {
      if (new_password === confirm_password) {
        const newPassword = await bcrypt.hash(new_password, saltRounds);
        await usersCollection.updateOne(
          { username: req.session.username },
          { $set: { password: newPassword } }
        );
        res.redirect("/profile");
      } else {
        res.render("change_password", { error: 2, username: req.session.username});
      }
    } else {
      res.render("change_password", { error: 1, username: req.session.username});
    }
  }
);

app.get("/buy_cosmetics", (req, res) => {
  res.render("buy_cosmetics");
});

app.get("/buy_pets", (req, res) => {
  res.render("buy_pets");
});

app.get("/buy_dlcs", (req, res) => {
  res.render("buy_dlcs");
});

app.get("/logout", async (req, res) => {
  let username = req.session.username;
  let email = req.session.email;
  const result = await usersCollection
    .find({ email: email })
    .project({ friends: 1 })
    .toArray();
  await usersCollection.updateOne(
    { username: username },
    { $set: { status: "offline" } }
  );
  req.session.destroy();
  res.redirect("/?loggedout=true");
});

app.post("/friends/check", async (req, res) => {
  let username = req.body.username; // Inputted username
  let usernameSchema = Joi.string().alphanum().max(20).required();
  let usernameValidation = usernameSchema.validate(username); // Validate inputted username with joi
  let message;
  let added = false;
  if (usernameValidation.error != null) {
    // If validation fails, return an error response
    message = username + " is not valid!";
  } else {
    let user = req.session.username; // Get current session user
    let friend = await usersCollection
      .find({ username: username })
      .project({ friends: 1, incoming_requests: 1, status: 1, _id: 1 })
      .toArray();
    let result = await usersCollection
      .find({ username: user })
      .project({ friends: 1, incoming_requests: 1, status: 1, _id: 1 })
      .toArray();
    if (friend.length != 1) {
      message = "User not found.";
    } else {
      const friendIds = friend[0].friends.map((id) => id.toString()); // Convert all ObjectIds to strings
      const resultIdString = result[0]._id.toString();
      if (friendIds.includes(resultIdString)) {
        // check if users are already friends
        message = "Already friends.";
      } else if (result[0].incoming_requests.includes(username)) {
        //checks if requested user has also requested current user to be friends
        // Adds current user as a friend of the requested user in database
        try {
          await usersCollection.updateOne(
            { username: username },
            { $push: { friends: result[0]._id } }
          );
          // Adds requested user as a friend of the current user in database
          await usersCollection.updateOne(
            { username: user },
            { $push: { friends: friend[0]._id } }
          );
          // Removes the incoming request from the newly added friend
          await usersCollection.updateOne(
            { username: user },
            { $pull: { incoming_requests: username } }
          );
          message = username + " has been added!";
        } catch (err) {
          message = err;
        }
        added = true;
      } else if (friend[0].incoming_requests.includes(user)) {
        // checks if request to other user to be friends exists
        message = "Already sent friend request to " + username + ".";
      } else {
        // If no prior requests exist from either side, send friend request
        await usersCollection.updateOne(
          { username: username },
          { $push: { incoming_requests: user } }
        );
        //await usersCollection.updateOne({ username: username }, { $set: { incoming_requests: { $concatArrays: [ "$incoming_requests", [ user ]]}}}); potentially another way to update array
        message = "Friend request sent to " + username + "!";
      }
    }
    // If validation succeeds, return a success response
  }
  res.json({ message, added });
});

app.post("/friends/get_friends", async (req, res) => {
  let user = req.session.username;
  let friendsObject = await usersCollection.findOne(
    { username: user },
    { projection: { friends: 1 } }
  );
  let friends = friendsObject.friends;
  res.json({ friends });
});

app.post("/friends/get_friend_status", async (req, res) => {
  let friend_id = req.body.friend_id;
  let objId = new ObjectId(friend_id);
  try {
    let { username, status } = await usersCollection.findOne(
      { _id: objId },
      { projection: { username: 1, status: 1 } }
    );
    res.json({ username: username, status: status });
    return;
  } catch (err) {
    res.json(err);
    return;
  }
});

app.post("/friends/get_friends", async (req, res) => {
  let user = req.session.username;
  let friendsObject = await usersCollection.findOne(
    { username: user },
    { projection: { friends: 1 } }
  );
  let friends = friendsObject.friends;
  res.json({ friends });
});

app.post("/friends/get_friend_status", async (req, res) => {
  let friend_id = req.body.friend_id;
  let objId = new ObjectId(friend_id);
  try {
    let { username, status } = await usersCollection.findOne(
      { _id: objId },
      { projection: { username: 1, status: 1 } }
    );
    res.json({ username: username, status: status });
    return;
  } catch (err) {
    res.json(err);
    return;
  }
});

app.post("/friend_profile", async (req, res) => {
  let username = req.body.username;
  const result = await usersCollection.findOne({
    username: username,
  });
  // the EJS template and send it as the response
  ejs.renderFile("views/profile.ejs", { user: result }, (err, html) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(html);
  });
});

app.get("/groups", (req, res) => {
  res.render("groups");
});

app.post("/groups/check", async (req, res) => {
  let groupName = req.body.group_name; // Inputted username
  let selected = req.body.selected;
  let currUser = req.session.username;
  currUser = await usersCollection.findOne(
    { username: currUser },
    { projection: { _id: 1 } }
  );
  let groupNameSchema = Joi.string().alphanum().max(20).required();
  let groupNameValidation = groupNameSchema.validate(groupName); // Validate inputted username with joi
  let message;
  if (groupNameValidation.error != null) {
    // If validation fails, return an error response
    message = groupName + " is not valid!";
  } else {
    let users = [];
    users.push(currUser._id);
    for (let one of selected) {
      let user = await usersCollection.findOne(
        { username: one },
        { projection: { _id: 1 } }
      );
      let id = user._id;
      users.push(id);
    }
    let result = await groupsCollection.insertOne({
      group_name: groupName, // Assuming group_sessions for sessions
      members: users,
      sessions: [],
    });
    let groupId = result.insertedId;
    try {
      for (let user of users) {
        await usersCollection.updateOne(
          { _id: new ObjectId(user) },
          { $push: { groups: groupId } }
        );
      }
      message = "Group has been created!";
    } catch (err) {
      message = err;
    }
  }
  res.json({ message });
});

app.post("/groups/get_groups", async (req, res) => {
  let user = req.session.username;
  let groupsObject = await usersCollection.findOne(
    { username: user },
    { projection: { groups: 1 } }
  );
  let groups = groupsObject.groups;
  res.json({ groups });
});

app.post("/groups/get_group_details", async (req, res) => {
  let group_id = req.body.group_id;
  let objId = new ObjectId(group_id);
  try {
    let group = await groupsCollection.findOne(
      { _id: objId },
      { projection: { group_name: 1, members: 1 } }
    );
    let groupName = group.group_name;
    let membersCount = group.members.length;
    res.json({ groupName, membersCount });
    return;
  } catch (err) {
    res.json(err);
    return;
  }
});

app.post("/get_notifications", async (req, res) => {
  let user = req.session.username;
  let incomingRequestsObject = await usersCollection.findOne(
    { username: user },
    { projection: { incoming_requests: 1 } }
  );
  let incomingRequests = incomingRequestsObject.incoming_requests;
  res.json({ incomingRequests });
});

app.post("/notifications/accept", async (req, res) => {
  let username = req.body.username; // Inputted username
  console.log(username);
  let message;
  let user = req.session.username; // Get current session user
  let friend = await usersCollection
    .find({ username: username })
    .project({ friends: 1, incoming_requests: 1, status: 1, _id: 1 })
    .toArray();
  let result = await usersCollection
    .find({ username: user })
    .project({ friends: 1, incoming_requests: 1, status: 1, _id: 1 })
    .toArray();
  try {
    await usersCollection.updateOne(
      { username: username },
      { $push: { friends: result[0]._id } }
    );
    // Adds requested user as a friend of the current user in database
    await usersCollection.updateOne(
      { username: user },
      { $push: { friends: friend[0]._id } }
    );
    // Removes the incoming request from the newly added friend
    await usersCollection.updateOne(
      { username: user },
      { $pull: { incoming_requests: username } }
    );
    message = "Friend request from " + username + " has been accepted!";
  } catch (err) {
    message = err;
  }
  res.json({ message });
});

app.post("/notifications/decline", async (req, res) => {
  let username = req.body.username; // Inputted username
  let message;
  let user = req.session.username; // Get current session user
  try {
    // Removes the incoming request from the newly added friend
    await usersCollection.updateOne(
      { username: user },
      { $pull: { incoming_requests: username } }
    );
    message = "Friend request from " + username + " has been declined!";
  } catch (err) {
    message = err;
  }
  res.json({ message });
});

/*
  This part are scheduled task that will run ar a specific time.
*/
if (runScheduledTask) {
  console.log("Daily task is scheduled to run at midnight to update user document");
  cron.schedule("0 0 * * *", async () => {
    console.log("Updating users' study history at midnight");
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const formattedDate = today.toISOString().split("T")[0];

    try {
      // Find all users with active study sessions
      const activeSessions = await usersCollection
        .find({ "study_session.inSession": true })
        .toArray();

      // End the study session for active users
      const endSessionPromises = activeSessions.map(async (user) => {
        const userId = user._id;
        const sessionId = user.study_session.currentSessionID;

        // End the study session
        const endTime = new Date();
        const session = await individual_sessionsCollection.findOne({
          _id: sessionId,
        });
        const startTime = session.start_time;
        const duration = Math.floor((endTime - startTime) / 1000);

        await individual_sessionsCollection.updateOne(
          { _id: sessionId },
          { $set: { end_time: endTime, duration: duration } }
        );

        // Update the user document
        await usersCollection.updateOne(
          { _id: userId },
          {
            $set: {
              "study_session.inSession": false,
              "study_session.currentSessionID": null,
            },
            $inc: {
              total_study_hours: duration,
              hours_per_day: duration,
            },
          }
        );
      });

      // Wait for all end session promises to resolve
      await Promise.all(endSessionPromises);

      // Update study history for all users
      const users = await usersCollection.find({}).toArray();
      const updateUsersPromises = users.map(async (user) => {
        const historyEntry = {
          date: formattedDate,
          total_hours: user.hours_per_day || 0,
        };
        await usersCollection.updateOne(
          { _id: user._id },
          { $push: { study_history: historyEntry } }
        );
      });

      // Wait for all study history update promises to resolve
      await Promise.all(updateUsersPromises);

      // Reset hours_per_day for all users
      await usersCollection.updateMany({}, { $set: { hours_per_day: 0 } });

      console.log(
        "Successfully updated users' study history and reset hours_per_day"
      );
    } catch (error) {
      console.log("Error updating users' study history:", error);
    }
  });
} else {
  console.log("The scheduled task will not run on local server");
}
/*
  End of cron
*/

// Listen for accept_group_session from client
app.post('/accept_group_session', sessionValidation("accept_group_session"), async (req, res) => {
  console.log("running accept_group_session");
  // check if they are in session
  // then if its individual, or groups
  // then end the respective current session
  // then join into the invited group session 
  const groupSessionId = new ObjectId(req.body.groupSessionId);
  console.log("The Group Session Id: " + groupSessionId);
  const userID = new ObjectId(req.session.userID);
  const user = await usersCollection.findOne({
    _id: userID,
  });
  const isInSession = user.study_session.inSession === "true";
  console.log("In session?" + isInSession);
  if (isInSession) {
    res.redirect(`/study_session`);
    return;
  } else {

    // Sets an interval function on server side to give players points periodically
    const interval = 60 * 1000; // 1 minute in milliseconds
    async function updateCoins(userID) {
      let amount = Math.floor(Math.random() * 5) + 3; // random points between 45 and 55
      try {
        await usersCollection.updateOne(
          { _id: userID },
          { $inc: { points: amount } }
        );
      } catch (err) {
        console.log(err);
      }
    }
    // Setup and runs interval function
    const intervalId = setInterval(async () => {
      await updateCoins(userID);
    }, interval);
    console.log("Start process to set study_session");
    try {
      await usersCollection.updateOne(
        { _id: userID },
        {
          $set: {
            study_session: {
              inSession: true,
              intervalId: Math.floor(intervalId),
              currentSessionID: groupSessionId,
              group: true
            },
          },
          $push: {
            group_sessions: groupSessionId,
          },
        }
      );
      console.log("Finished setting study_session");
      console.log("Start process to push user to joined in group_sessions");
      await group_sessionsCollection.updateOne(
        { _id: groupSessionId },
        {
          $push: {
            joined: userID,
          }
        }
      );
      console.log("finished pushing user to joined in group_sessions");
    } catch (err) {
      console.log(err);
    }

    res.redirect('/study_session');
  }
});


app.get("*", (req, res) => {
  res.status(404);
  res.render("404", {username: req.session.username});
});

const server = app.listen(port, () => {
  console.log("The server is listening on port " + port);
});

const io = socketIo(server);
let activeSocketIds = [];

// Socket.IO logic
io.on('connection', (socket) => {
  // Add the socket to room 'online'
  socket.join('online'); 

  // Listen for the 'username' event upon connection
  socket.on('username', (username) => {
    // Store the username with the socket object or associate it with the socket's ID
    socket.username = username;
  });

  // Example: sending a notification to a specific user
  // setTimeout(() => {
  //   sendNotificationToUser('daniel');
  // }, 1000);
});

// Handle notifications
function sendNotificationToUser(username, groupSessionId) {
  // Find the socket associated with the provided username
  const socketToEmit = findSocketByUsernameInRoom("online", username)
  // If the socket is found, emit the event
  if (socketToEmit) {
    socketToEmit.emit("notification", groupSessionId);
  } else {
    console.log(`Socket with username ${username} not found.`);
  }
}

// Function to find a socket by username in a room
function findSocketByUsernameInRoom(roomName, username) {
  // Get all sockets in the specified room
  const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
  
  if (socketsInRoom) {
    // Iterate over each socket ID in the room
    for (const socketId of socketsInRoom) {
      // Get the socket object
      const socket = io.sockets.sockets.get(socketId);
      
      // Check if the socket has the specified username
      if (socket && socket.username === username) {
        return socket; // Return the socket if the username matches
      }
    }
  }
  
  return null; // Return null if no socket with the username is found in the room
}