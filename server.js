var http = require('http');
var path = require('path');
var express = require('express');
var mongodb = require('mongodb');
var validUrl = require('valid-url');

// MongoDB url
require('dotenv').config();
var mongodbUrl = process.env.MONGODB_URL;

var mongodbConnection = null;
mongodb.connect(mongodbUrl, function(err, db) {
  if (err) throw err;
  mongodbConnection = db;
});

var app = express();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * Renders the homepage
 */
app.get('/', function(req, res) {
  res.render('index', {
    schemeAndHost: getSchemeAndHost(req),
  });
});

/**
 * Shortens provided url
 */
app.get(/\/new\/(.*)/, function(req, res, next) {
  var originalUrl = req.params[0];
  if (!validUrl.isUri(originalUrl)) {
    var err = new Error("Invalid url");
    err.status = 422;
    return next(err);
  }
  getIdForUrl(originalUrl, function(err, id) {
    if (err) throw err;
    res.json({
      original_url: originalUrl,
      shortened_url: getSchemeAndHost(req) + '/' + id,
    });
  });
});

/**
 * Redirects to previously shortened url
 */
app.get('/:id', function(req, res, next) {
  var id = parseInt(req.params.id);
  getUrlForId(id, function(err, url) {
    if (err) throw err;
    if (url === null) {
      var err = new Error("URL not found");
      err.status = 404;
      return next(err);
    }
    res.redirect(url);
  });
});

/**
 * Friendly error handler
 */
app.use(function(err, req, res, next) {
  res.json({
    error: err.message,
  });
});

/**
 * Listen on the provided port, on all network interfaces.
 */
var server = http.createServer(app);
server.listen(process.env.PORT || 3000, function() {
  var bind = server.address();
  console.log("Listening on " + bind.address + ':' + bind.port);
});

/**
 * Returns the base website url based on client request
 */
function getSchemeAndHost(request) {
  return request.protocol + '://' + request.get('host');
};

/**
 * Asynchrnously finds ID for a given url and passess it to callback.
 */
function getIdForUrl(url, cb) {
  var db = mongodbConnection;
  if (db === null) {
    return cb("Connection to mongodb has not yet been established.");
  }
  db.collection('shortened_urls').insertOne({
    _id: Math.floor(Math.random()*1024*1024+1024*1024),
    url: url
  }, function (err, result) {
    if (err) return cb(err);
    cb(null, result.insertedId);
  });
};

/**
 * Asynchronously finds previously shortened url for a given id
 */
function getUrlForId(id, cb) {
  var db = mongodbConnection;
  if (db === null) {
    return cb("Connection to mongodb has not yet been established.");
  }
  db.collection('shortened_urls').findOne({
    _id: id,
  }, function (err, doc) {
    if (err) return cb(err);
    if (doc === null) return cb(null, null);
    cb(null, doc.url);
  });
};
