require('dotenv').config();

const express = require('express');
const usersRouter = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/users', usersRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
