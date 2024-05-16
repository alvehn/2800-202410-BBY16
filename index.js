/*
    This part are all the dependencies of the project.
*/
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const app = express();
const { ObjectId } = require("mongodb"); // Use new ObjectId() to generate a new unique ID

/* 
    Importing database schema 
*/
const user_schema = require("./models/user_schema");
const individual_session_schema = require("./models/individual_session_schema");
const group_session_schema = require("./models/group_session_schema");
const study_group_schema = require("./models/group_schema");
const pet_schema = require("./models/pet_schema");
const costume_schema = require("./models/costume_schema");
const achievement_schema = require("./models/achievement_schema");

/*
    This part are all the static number for our project 
    (session expireTime, saltRounds etc)
*/
const expireTime = 24 * 60 * 60 * 1000; // Set to 1 day initially
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
const sessionsCollection = studyPals.collection("sessions");

/* Validating that when you try to update the database, it ensures that it doesn't violate these properties. */
studyPals.command({
  collMod: "users",
  validator: user_schema,
});

/*
    This part are for common middlewares
*/
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

function sessionValidation(endRoute) {  // SessionValidation, I wraped the middleware function
  return function(req, res, next) {     // in another function so that you can redirect the user
    if(req.session.authenticated){      // to different location depends on where the request route.
      next();
    }else {
      if(endRoute === 'profile'){
        res.redirect('/login');
      }
    }
  }
}

/*
    Below are route handlers
*/
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/sign_up", (req, res) => {
  res.render("sign_up");
});

app.post("/signupSubmit", async (req, res) => {
  let username = req.body.username;
  let email = req.body.email;
  let password = req.body.password;
  let displayname = req.body.displayname;
  let usernameSchema = Joi.string().alphanum().max(20).required();
  let emailSchema = Joi.string().email().required();
  let passwordSchema = Joi.string().max(20).required();
  let displaynameSchema = Joi.string().alphanum().max(20).required();

  app.get("/groups", (req, res) => {
    res.render("groups");
  });

  app.get("/profile", (req, res) => {
    res.render("profile");
  });

  app.get("/petinv", (req, res) => {
    res.render("petinv");
  });

  app.get("/petshop", (req, res) => {
    res.render("petshop");
  });
  let usernameValidation = usernameSchema.validate(username);
  let emailValidation = emailSchema.validate(email);
  let passwordValidation = passwordSchema.validate(password);
  let displaynameValidation = displaynameSchema.validate(displayname);
  if (usernameValidation.error != null) {
    res.render("signuperror", { error: "Username" });
  } else if (emailValidation.error != null) {
    res.render("signuperror", { error: "Email" });
  } else if (passwordValidation.error != null) {
    res.render("signuperror", { error: "Password" });
  } else if (displaynameValidation.error != null) {
    res.render("signuperror", { error: "Display name" });
  } else {
    let hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
      await usersCollection.insertOne({
        username: username,
        email: email,
        password: hashedPassword,
        display_name: displayname,
        current_pet: new ObjectId(),
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
        status: "online", // Assuming the user sign_up normally
      });

      req.session.authenticated = true;
      req.session.username = username;
      req.session.friends = [];
      req.session.groups = [];
      req.session.cookie.maxAge = expireTime;
      res.redirect("/home_page");
      return;
    } catch (err) {
      if (err.name === "MongoError" && err.code === 121) {
        console.log("Document validation error");
        return res.redirect("/sign_up");
      } else {
        return res.render("signuperror", {
          error: "Unexpected error occurred",
        });
      }
    }
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/loggingin", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let emailSchema = Joi.string().email().required();
  let passwordSchema = Joi.string().max(20).required();
  let emailValidation = emailSchema.validate(email);
  let passwordValidation = passwordSchema.validate(password);
  var error = "Invalid email/password.";
  if (emailValidation.error == null && passwordValidation.error == null) {
    const result = await usersCollection
      .find({ email: email })
      .project({ username: 1, password: 1, friends: 1, groups: 1, _id: 1 })
      .toArray();
    if (result.length != 1) {
      error = "User not found.";
    } else if (await bcrypt.compare(password, result[0].password)) {
      req.session.authenticated = true;
      req.session.username = result[0].username;
      req.session.friends = result[0].friends;
      req.session.groups = result[0].groups;
      req.session.cookie.maxAge = expireTime;
      return res.redirect("/homepage");
    }
  }

  res.render("login_error", { error: error });
});

app.get("/home_page", (req, res) => {
  res.render("home_page");
});

app.get("/friends", (req, res) => {
  res.render("friends");
});

app.get("/profile", sessionValidation('profile'), async (req, res) => {
  const result = await usersCollection.findOne({username: req.session.username});
  res.render("profile", {user: result});
});

app.get("/update_profile", sessionValidation("update_profile"), async(req, res) => {
  const result = await usersCollection.findOne({username: req.session.username});
  res.render("update_profile", {user: result});
});

app.post("/updating_profile", sessionValidation("updating_profile"), async(req, res) => {
  const {display_name, username, email} = req.body;
  await usersCollection.updateOne({username: req.session.username }, {
    $set:{
      display_name: display_name,
      username: username,
      email: email
    }
  });
  res.redirect('/profile');
})

app.get("/change_password", sessionValidation("change_password"), async(req, res) => {
  res.render('change_password', {error: null});
})

app.post("/changing_password", sessionValidation("changing_password"), async(req, res) => {
  const{current_password, new_password, confirm_password} = req.body;
  const { password: user_password } = await usersCollection.findOne({ username: req.session.username });
  if(await bcrypt.compare(current_password, user_password)){
    if(new_password === confirm_password){
      const newPassword = await bcrypt.hash(new_password, saltRounds);
      await usersCollection.updateOne({username: req.session.username},
      {$set: { password: newPassword}})
      res.redirect('/profile');

    }else{
      res.render('change_password', {error: 2});
    }
  }else{
    res.render('change_password', {error: 1});
  }
})

app.get("/friends", (req, res) => {
  res.render("friends");
});

app.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});

app.listen(port, () => {
  console.log("The server is listening on port " + port);
});
