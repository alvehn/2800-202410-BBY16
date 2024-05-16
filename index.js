/*
    This part are all the dependencies of the project.
*/
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const app = express();

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
const mongoStore = require('connect-mongo'); // Use for storing session only.
const mongoClient = require('mongodb').MongoClient; // Use for CRUD with the database.

// instance of mongoClient, similiar to express and app.
const database = new mongoClient(atlasURL, { useNewUrlParser: true, useUnifiedTopology: true });
const studyPals = database.db(mongodb_database); // The actual database we will interact with.

// All the collections
const usersCollection = studyPals.collection('users');
const sessionsCollection = studyPals.collection('sessions');

/*
    This part are for common middlewares
*/
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: node_session_secret,
    saveUninitialized: false,
    resave: true,
    store: mongoStore.create({
        mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
        collection: 'sessions',
        crypto: {
            secret: mongodb_session_secret
        }
    })
}));

/*
    Below are route handlers
*/
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/signup', (req, res) => {
    res.render('signup');
})

app.post('/signupSubmit', async (req, res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    let usernameSchema = Joi.string().alphanum().max(20).required();
    let emailSchema = Joi.string().email().required();
    let passwordSchema = Joi.string().max(20).required();
    let usernameValidation = usernameSchema.validate(username);
    let emailValidation = emailSchema.validate(email);
    let passwordValidation = passwordSchema.validate(password);
    if (usernameValidation.error != null) {
        res.render("signuperror", { error: "Username" });
    } else if (emailValidation.error != null) {
        res.render("signuperror", { error: "Email" });
    } else if (passwordValidation.error != null) {
        res.render("signuperror", { error: "Password" });
    } else {
        let hashedPassword = await bcrypt.hash(password, saltRounds);
        await usersCollection.insertOne({ username: username, email: email, password: hashedPassword, friends: [], groups: [], incoming_requests: [], status: "online" });
        req.session.authenticated = true;
        req.session.username = username;
        req.session.friends = [];
        req.session.groups = [];
        req.session.incoming_requests = [];
        req.session.cookie.maxAge = expireTime;
        res.redirect('/homepage');
        return;
    }
})

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/loggingin', async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let emailSchema = Joi.string().email().required();
    let passwordSchema = Joi.string().max(20).required();
    let emailValidation = emailSchema.validate(email);
    let passwordValidation = passwordSchema.validate(password);
    var error = "Invalid email/password.";
    if (emailValidation.error == null && passwordValidation.error == null) {
        const result = await usersCollection.find({ email: email }).project({ username: 1, password: 1, friends: 1, groups: 1, incoming_requests: 1, _id: 1 }).toArray();
        if (result.length != 1) {
            error = "User not found.";
        } else if (await bcrypt.compare(password, result[0].password)) {
            req.session.authenticated = true;
            req.session.username = result[0].username;
            req.session.friends = result[0].friends;
            req.session.groups = result[0].groups;
            req.session.cookie.maxAge = expireTime;
            return res.redirect('/homepage');
        }
    }

    res.render("loginerror", { error: error });
});

app.get('/homepage', (req, res) => {
    res.render('homepage');
})

app.get('/friends', (req, res) => {
    res.render('friends');
})

app.get('/profile', (req, res) => {
    res.render('profile');
})

app.get('/friends', (req, res) => {
    res.render('friends');
})

app.post('/friends/check', async (req, res) => {
    let username = req.body.username; // Inputted username
    let usernameSchema = Joi.string().alphanum().max(20).required();
    let usernameValidation = usernameSchema.validate(username); // Validate inputted username with joi
    let message;
    if (usernameValidation.error != null) {
        // If validation fails, return an error response
        message = username + " is not valid!";
    } else {
        let user = req.session.username; // Get current session user
        let friend = await usersCollection.find({ username: username }).project({ friends: 1, incoming_requests: 1, status: 1}).toArray();
        let result = await usersCollection.find({ username: user }).project({ friends: 1, incoming_requests: 1, status: 1}).toArray();
        if (friend.length != 1) {
            message = "User not found.";
        } else {
            if (result[0].incoming_requests.includes(username)) { //checks if requested user has also requested current user to be friends
                // Adds current user as a friend of the requested user in database
                await usersCollection.update({ username: username }, {$push: { friends: { username: user, status: "online" } }});
                // Adds requested user as a friend of the current user in database
                await usersCollection.update({ username: user }, {$push: { friends: { username: username, status: friend[0].status } }});
                // Removes the incoming request from the newly added friend
                await usersCollection.updateOne({ username: user }, { $pull: { incoming_requests: username } });
                message = username + " has been added!";
            } else if (friend[0].incoming_requests.includes(user)) { // checks if request to other user to be friends exists
                message = "Already sent friend request to " + username + ".";
            } else {
                await usersCollection.update({ username: username }, {$push: { incoming_requests: user }});
                message = "Friend request sent to " + username +"!";
            }
        }
        // If validation succeeds, return a success response
    }
    res.json({ message });
});

app.get('*', (req, res) => {
    res.status(404);
    res.render('404');
})

app.listen(port, () => {
    console.log('The server is listening on port ' + port);
});
