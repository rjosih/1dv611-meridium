const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');
const request = require('request');

const archivesRouter = require('./src/routes/archives');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use('/archives', express.static('archives')); // Make archives folder accessible

// Routes
app.use('/archives', archivesRouter);

// Error handling
app.use((req, res, next) => {
    const err = new Error('The resource could not be found.');
    err.status = 404;
    next(err);
})

app.use((err, req, res, next) => {
    console.log(err);

    res.status(err.status || 500);
    res.json({
        error: {
            message: err.message
        }
    });
});

module.exports = app;