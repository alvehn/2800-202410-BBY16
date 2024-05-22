/*
    This part are all the dependencies of the project.
*/
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const app = express();
const { ObjectId } = require("mongodb"); // Use new ObjectId() to generate a new unique ID

/* 
    Importing database schema 
*/
const user_schema = require("./models/user_schema");
const individual_session_schema = require("./models/individual_session_schema");
const group_session_schema = require("./models/group_session_schema");
const study_group_schema = require("./models/group_schema");
const costume_schema = require("./models/costume_schema");
const achievement_schema = require("./models/achievement_schema");

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

/*
    This part are for database connection.
*/
// retryWrites: write operation will retry if it fail for any reasons.
const atlasURL = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true`;
const mongoStore = require("connect-mongo"); // Use for storing session only.
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
const sessionsCollection = studyPals.collection("sessions");
const groupsCollection = studyPals.collection("groups");

/* Validating that when you try to update the database, it ensures that it doesn't violate these properties. */
studyPals.command({
  collMod: "users",
  validator: user_schema,
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

      return res.redirect(`/signup${errorQueryString}`);
    }
    next();
  };
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
    Below are route handlers
*/
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signupSubmit", accountValidation(), async (req, res) => {
  let user;
  let username = req.body.username;
  let email = req.body.email;
  let password = req.body.password;
  let displayname = req.body.displayname;
  let current_pet = req.body.current_pet;
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
    return res.render("signup", { error });
  } else {
    let hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
      user = await usersCollection.insertOne({
        username: username,
        email: email,
        password: hashedPassword,
        display_name: displayname,
        current_pet: new ObjectId("664d3a5cfd6cca06e79cc641"),
        friends: [],
        incoming_requests: [],
        groups: [],
        total_study_hours: 0, // Initialize with default values
        points: 0, // Initialize with default values
        study_streak: 0, // Initialize with default values
        equip_profile_image: "", // Initialize with default values
        achievements: [], // Initialize with default values
        individual_sessions: [], // Assuming individual_sessions for sessions
        group_sessions: [], // Assuming group_sessions for sessions
        study_session: {
          inSession: false,
          currentSessionID: null,
        },
        status: "online", // Assuming the user sign_up normally
      });

      req.session.authenticated = true;
      req.session.username = username;
      req.session.friends = [];
      req.session.groups = [];
      req.session.cookie.maxAge = expireTime;
      req.session.current_pet = current_pet;
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
  res.render("groups");
});

app.get("/petinv", async (req, res) => {
  try {
    const currentPetId = req.session.current_pet;

    if (!currentPetId) {
      console.error("No current pet ID in session");
      return res.status(400).send("No current pet ID in session");
    }

    const currentPet = await petsCollection.findOne({
      _id: new ObjectId(currentPetId),
    });

    if (currentPet) {
      res.render("petinv", { currentPet });
    } else {
      console.error("No pet found with the given ID");
      res.status(404).send("No pet found with the given ID");
    }
  } catch (err) {
    console.log("error retrieving current pet: " + err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/petshop", (req, res) => {
  res.render("petshop");
});

app.get("/login", (req, res) => {
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
      req.session.current_pet = result[0].current_pet;
      return res.redirect("/home_page");
    }
  }
  console.log(error);

  res.render("login", { error: error});
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
  res.render("home_page", { user: user });
});

/*
  The following handler are for starting individual stuy session.
*/
app.post(
  "/start_study_session",
  sessionValidation("start_study_session"),
  async (req, res) => {
    const userID = new ObjectId(req.session.userID);
    const startTime = new Date();

    const newSession = {
      user_id: userID,
      start_time: startTime,
      end_time: null,
      duration: 0,
    };

    const result = await individual_sessionsCollection.insertOne(newSession);
    const newSessionId = result.insertedId;

    await usersCollection.updateOne(
      { _id: userID },
      {
        $set: {
          study_session: {
            inSession: true,
            currentSessionID: newSessionId,
          },
        },
        $push: {
          individual_sessions: newSessionId,
        },
      }
    );
    res.render("study_session", {
      sessionId: newSessionId,
      startTime: startTime.toISOString(),
    });
  }
);

app.post(
  "/view_study_session",
  sessionValidation("view_study_session"),
  async (req, res) => {
    const sessionId = new ObjectId(req.body.sessionId);
    const studySession = await individual_sessionsCollection.findOne({
      _id: sessionId,
    });
    const startTime = studySession.start_time;
    res.render("study_session", {
      startTime: startTime.toISOString(),
      sessionId: sessionId,
    });
  }
);

app.post("/end_session", sessionValidation("end_session"), async (req, res) => {
  const userId = new ObjectId(req.session.userID);
  const sessionId = new ObjectId(req.body.sessionId);
  const startTime = new Date(req.body.startTime);
  const endTime = new Date();

  const duration = Math.floor((endTime - startTime) / 1000);

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
  res.render("friends");
});

app.get("/profile", sessionValidation("profile"), async (req, res) => {
  const result = await usersCollection.findOne({
    username: req.session.username,
  });
  res.render("profile", { user: result });
});

app.get(
  "/update_profile",
  sessionValidation("update_profile"),
  async (req, res) => {
    const result = await usersCollection.findOne({
      username: req.session.username,
    });
    res.render("update_profile", { user: result });
  }
);

app.post(
  "/updating_profile",
  sessionValidation("updating_profile"),
  async (req, res) => {
    const { display_name, username, email } = req.body;
    await usersCollection.updateOne(
      { username: req.session.username },
      {
        $set: {
          display_name: display_name,
          username: username,
          email: email,
        },
      }
    );
    res.redirect("/profile");
  }
);

app.get(
  "/change_password",
  sessionValidation("change_password"),
  async (req, res) => {
    res.render("change_password", { error: null });
  }
);

app.post(
  "/changing_password",
  sessionValidation("changing_password"),
  async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    const { password: user_password } = await usersCollection.findOne({
      username: req.session.username,
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
        res.render("change_password", { error: 2 });
      }
    } else {
      res.render("change_password", { error: 1 });
    }
  }
);

app.get("/friends", (req, res) => {
  res.render("friends");
});

app.get("/buy_cosmetics", (req, res) => {
  res.render("buy_cosmetics");
});

app.get("/buy_pets", (req, res) => {
  res.render("buy_pets");
});

app.get("/buy_dlcs", (req, res) => {
  res.render("buy_dlcs");
});

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
  res.json({ message });
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

app.post("/groups/get_group_name", async (req, res) => {
  let group_id = req.body.group_id;
  let objId = new ObjectId(group_id);
  try {
    let group = await groupsCollection.findOne(
      { _id: objId },
      { projection: { group_name: 1 } }
    );
    let groupName = group.group_name;
    res.json({ groupName });
    return;
  } catch (err) {
    res.json(err);
    return;
  }
});

app.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});

app.listen(port, () => {
  console.log("The server is listening on port " + port);
});
