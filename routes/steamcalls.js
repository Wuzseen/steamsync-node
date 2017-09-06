var express = require('express');
var router = express.Router();
var https = require('https');
var querystring = require('querystring');

var steam_api_key = "0007EC810D3B846A379EAF6D61D720B1";
var baseSteamAPIURL = "api.steampowered.com";

function getAndReturnAPICall(url, res) {
  var hreq = https.get(url, function(response) {
    response.setEncoding('utf-8');

    var responseString = '';

    response.on('data', function(data) {
      responseString += data;
    });

    response.on('end', function() {
      res.send(responseString);
    });
  }).on('error', function(err) {
    console.log("Err: " + err.stack);
  });
}

/* GET users listing. */
router.get('/applist/', function(req, res, next) {
  var url = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/'; 
  getAndReturnAPICall(url, res);
});

router.get('/user/:method/:version/:idlookup', function(req, res, next) {
  var url = 'https://api.steampowered.com/ISteamUser/' + req.params.method + '/' + req.params.version + '/';
  var data = {
    'key' : steam_api_key,
    'steamids' : req.params.idlookup
  }
  url += '?' + querystring.stringify(data);
  getAndReturnAPICall(url, res);
});

router.get('/player/:method/:version/:idlookup', function (req, res, next) {
  var url = 'https://api.steampowered.com/IPlayerService/' + req.params.method + '/' + req.params.version + '/';
  var data = {
    'key' : steam_api_key,
    'steamid' : req.params.idlookup,
    'format' : 'json',
    'include_appinfo' : 'true',
    'include_played_free_games' : true
  }
  url += '?' + querystring.stringify(data);
  getAndReturnAPICall(url, res);
});

function isUrl(s) {
  var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
  return regexp.test(s);
}

router.get('/usernamelookup/:idlookup*?', function (req, res, next) {
  if(req.params.idlookup == 'http:') {
    req.params.idlookup = 'https:';
  }
  var url = req.params.idlookup + req.param(0);
  if(!isUrl(url)) {
    url = 'https://steamcommunity.com/id/' + req.params.idlookup;
  }
  getAndReturnAPICall(url, res);
});
module.exports = router;
