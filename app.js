var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var steamcalls = require('./routes/steamcalls');
var https = require('https');

var app = express();

var steam_api_key = "0007EC810D3B846A379EAF6D61D720B1";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/angular', express.static(path.join(__dirname, '/node_modules/angular/')));
app.use('/bootstrap', express.static(path.join(__dirname, '/node_modules/bootstrap/')));
app.use('/ng-table', express.static(path.join(__dirname, '/node_modules/ng-table/')));

app.use('/steam', steamcalls);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var baseSteamAPIURL = "api.steampowered.com";

function buildEndpoint(data)
{
  return querystring.stringify(data);
}

function steamUserRequest(endpoint, steamid)
{
  var data = {
    "steamid" : steamid,
    "relationship" : "friend",
    "format" : "json",
    "key" : steam_api_key
  };
  var dataString = JSON.stringify(data);
  endpoint += "?" + buildEndpoint(data);
  var options = {
    host : baseSteamAPIURL,
    path : endpoint,
    method : "GET"
  }
  console.log(endpoint);
  var req = https.request(options, function(res) {
    res.setEncoding('utf-8');

    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });

    res.on('end', function() {
      console.log(responseString);
      var responseObject = JSON.parse(responseString);
    });
  });

  req.write(dataString);
  req.end();
}

var port = 80;
app.listen(port, function() {
  console.log("Listening on port: " + port.toString());
});

module.exports = app;
