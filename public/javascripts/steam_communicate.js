var baseSteamAPIURL = 'http://api.steampowered.com';

// I feel like this is built in to js somewhere... everything is after all.
// Converts a dict into a url friendly parameter string
function stringify(data) {
    var ret = '';
    for(var key in data) {
        ret += '&' + key + '=' + data[key];
    }
    return ret;
}

// Build a steam api url according to their spec
function buildSteamUrl(interface, method, version, options) {
    var baseUrl = baseSteamAPIURL + '/' + interface + '/' + method + '/' + version + '/?';
    baseUrl += 'key=' + steam_api_key;
    if(options != null) {
        baseUrl += stringify(options);
    }
    return baseUrl;
}


angular.module('SteamGroupRecommender', ['ngTable'])
    .controller('SteamGroupRecommender', ['$scope', '$http', '$q', 'NgTableParams', '$filter', function($scope, $http, $q, NgTableParams, $filter) {
        $scope.gameDict = {};
        $scope.userData = {};
        var gameList = [];
        var self = this;

        var populateGameList = function () {
            return $http({
                method : 'GET',
                url : '/steam/applist/'
            }).then(function successCallback(response) {
                gameList = response.data.applist.apps;
                return;
            }, function errorCallback(response) {
                console.log('errof finding game list: ' + response);
                return;
            });
        }

        var populateUserData = function (id) {
            var summaryOptions = {
                'steamids' : id
            }
            return $http({
                method : 'GET',
                url : '/steam/user/GetPlayerSummaries/v2/' + id
            }).then(function successCallback(response) {
                var name = response.data.response.players[0].personaname;
                $scope.userData[name] = response.data.response.players[0];
                return;
            }, function errorCallback(response) {
                return;
            });
        }

        var getOwnedGamesForSteamId = function (id, username) { // retrieves steamid's list of owned games. Should just work with public profiles.
            return $http({
                method : 'GET',
                url : '/steam/player/GetOwnedGames/v1/' + id 
            }).then(function successCallback(response) {
                console.log('Success: ' + username);
                $scope.gameDict[username].gameList = response.data.response;
                $scope.Analyze();
            }, function errorCallback(response) {
                console.log('Fail');
                $scope.message = response.status;
            });
        };

        function gameListLookup(gameid, gameInst) {
            var element = gameList.find(elementSearchFunction(gameid));
            gameInst.gameName = element.name;
        }

        $scope.UsernameLookup = function(usn) { // Get 64 bit steam id for username. When found, look up games owned by the id
            var steamidRE = /"steamid":"[0-9]*"/;
            var personaRE = /"personaname":".*?"/;
            $http({
                method : 'GET',
                url : '/steam/usernamelookup/' + usn
            }).then(function success(response){
                var idIndex = response.data.match(steamidRE);
                var personaIndex = response.data.match(personaRE);
                var steamid = idIndex[0].substring(11, idIndex[0].lastIndexOf('"'));
                usn = personaIndex[0].substring(15, personaIndex[0].lastIndexOf('"'));
                populateUserData(steamid).then(function(result) {
                    $scope.gameDict[usn] = {};
                    $scope.gameDict[usn].name = usn;
                    getOwnedGamesForSteamId(steamid, usn);
                });
            }, function error(response) {
                console.log('error: ' + response.message);
            });
        };

        $scope.AddUser = function() {
            $scope.lookupError = "";
            $scope.UsernameLookup($scope.adduserfield);
            if(!($scope.adduserfield in $scope.gameDict)) {
                $scope.UsernameLookup($scope.adduserfield); // make web request to look up the users game data, will list how many games player owns upon completion
            }
        };
    
        $scope.RemoveUser = function(username) {
            delete $scope.gameDict[username];
            $scope.Analyze();
        };
        
        function elementSearchFunction(appid) {
            return function(element) {
                return element.appid ==  appid;
            }
        }

        var gameLookupRequests = [];
        $scope.Analyze = function() { // Take content of game dict and generate the games everyone owns
            populateGameList().then(function(result) {
                var res = []; // list sorted by number of users owned, then total playtime
                gameLookupRequests = [];
                for(var key in $scope.gameDict) {
                    for(var gameIndex in $scope.gameDict[key].gameList.games) {
                        var game = $scope.gameDict[key].gameList.games[gameIndex];
                        var gameInst = res.find(elementSearchFunction(game.appid));

                        if(gameInst == null) {
                            gameInst = {};
                            gameInst.appid = game.appid;
                            gameListLookup(gameInst.appid, gameInst);
                            gameInst.ownedGameCount = 0;
                            gameInst.owners = [];
                            gameInst.totalPlaytime = 0;
                            res.push(gameInst);
                        }
                        gameInst.owners.push(key);
                        gameInst.ownedGameCount += 1;
                        gameInst.totalPlaytime += game.playtime_forever;
                        gameInst.averagePlaytime = gameInst.totalPlaytime / gameInst.ownedGameCount;
                    }
                }
                res.sort(function(a,b) {
                    if(a.ownedGameCount > b.ownedGameCount) {
                        return -1;
                    } else if(a.ownedGameCount < b.ownedGameCount) {
                        return 1;
                    } else if(a.totalPlaytime > b.totalPlaytime) {
                        return -1;
                    } else if(a.totalPlaytime < b.totalPlaytime) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
                $scope.results = res;
                $scope.tableParams = new NgTableParams({}, { 
                    getData: function (params) {
                        $scope.data = $filter('orderBy')($scope.results, params.orderBy());
                        $scope.data = $filter('filter')($scope.data, params.filter());
                        params.total($scope.data.length);
                        $scope.data = $scope.data.slice((params.page() - 1) * params.count(), params.page() * params.count());
                        return $scope.results;
                    }
                });
            });
            
            $scope.toHHMMSS = function (string) {
                var min_num = parseInt(string, 10);
                var hours   = Math.floor(min_num / 60);
                var minutes = min_num - (hours * 60);
            
                if (hours   < 10) {hours   = "0"+hours;}
                if (minutes < 10) {minutes = "0"+minutes;}
                var ret = hours + ' hours, ' + minutes + ' minutes played.';
                return ret;
            }
        };
}]);