require('dotenv').config();

const express = require('express');
const usersRouter = require('./routes/users');
const newsRouter = require('./routes/news');
const userController = require('./controllers/userController');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/users', usersRouter);
app.use('/news', newsRouter);

// Aliases for the literal paths named in the assignment brief (Step 2)
app.post('/register', userController.signup);
app.post('/login', userController.login);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
