/*
    This part are all the dependencies of the project.
*/
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoStore = require('connect-mongo');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const app = express();

/*
    This part are all the static number for our project 
    (session expireTime, saltRounds etc)
*/
const expireTime = 24 * 60 * 60 * 1000; // Set to 1 day initially
const saltRounds = 12; // The level of encrytion, trade off between security and performence.

/*
    This part are all the secret data.
*/