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
const database = new mongoClient(atlasURL, {useNewUrlParser: true, useUnifiedTopology: true});
const studyPals = database.db(mongodb_database); // The actual database we will interact with.

// All the collections
const usersCollection = studyPals.collection('users');
const sessionsCollection = studyPals.collection('sessions');

/*
    This part are for common middlewares
*/
app.use(express.urlencoded({extended: false}));
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

app.get('*', (req, res) => {
    res.status(404);
    res.render('404');
})

app.listen(port, () => {
    console.log('The server is listening on port ' + port);
});