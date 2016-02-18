RedwoodHighFrequencyTrading.controller("HFTStartController",
["$scope",
 '$interval',
 "RedwoodSubject",
 "SVGGraphing",
 "ConfigManager",
 "SynchronizedStopWatch",
 "$http",
 function ($scope, $interval, rs, graphing, configManager, stopWatch, $http) {

    // module private variables
    var CLOCK_FREQUENCY = 50;

    $scope.marketEvents = [];
    $scope.priceChanges = [];

    $scope.tick = function(tick){
        $scope.tradingGraph.draw(Date.now());
    }

    rs.on_load(function () {
        function extractConfigEntry (entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }

        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = configManager.loadPerSubject(rs, {
            startingWealth: "100",
            marketEventsURL: null,
            priceChangesURL: null
        });

        loadCSVs();
    });

    //loads market events and price changes from dropbox CSVs
    //basic CSV parsing with string.split
    //largely stolen from portfolio allocation
    function loadCSVs () {
        $http.get($scope.config.marketEventsURL).then(function(response) {
            var rows = response.data.split("\n");

            for (var i = 0; i < rows.length; i++) {
                $scope.marketEvents[i] = [];
            }

            for (var i = 0; i < rows.length; i++) {
                if (rows[i] == "") continue;
                var cells = rows[i].split(",");
                for (var j = 0; j < cells.length; j++) {
                    $scope.marketEvents[i][j] = isNaN (cells[j]) ? cells[j] : parseFloat (cells[j]);
                }
            }

            //once market events has finished loading, load price changes
            $http.get($scope.config.priceChangesURL).then(function(response) {
                var rows = response.data.split("\n");

                for (var i = 0; i < rows.length; i++) {
                    $scope.priceChanges[i] = [];
                }

                for (var i = 0; i < rows.length; i++) {
                    if (rows[i] == "") continue;
                    var cells = rows[i].split(",");
                    for (var j = 0; j < cells.length; j++) {
                        $scope.priceChanges[i][j] = parseFloat(cells[j]);
                    }
                }

                //once price changes have finished loading, start the experiment
                rs.synchronizationBarrier("init_round_" + rs.period).then(initExperiment());
            });
        });
    }

    function initExperiment () {
        console.log ("market events:");
        console.log ($scope.marketEvents);

        console.log ("price changes:");
        console.log ($scope.priceChanges);

        $scope.tradingGraph = graphing.makeTradingGraph("graph1");
        $scope.tradingGraph.init(Date.now(), $scope.priceChanges, [], []);

        $interval($scope.tick, 50);
    }

    $ ("#slider")
        .slider ({
            orientation: "vertical",
            slide: function (event, ui) {
                var msg = {"action": $ ("#slider").slider ("value")};
                rs.send ("slide", msg);
            }
        })

    $ ("#snipe")
        .button()
        .click (function (event) {
            rs.send ("snipe");
        })

    $ ("#speed")
        .button()
        .click (function (event) {
            rs.send ("speed");
        })

    $ ("#out")
        .button()
        .click (function (event) {
            rs.send ("out");
        })

    rs.on ("slide", function(msg){
        $ ("#slider-val").val (msg.action);
        console.log ("This player's slider val: " + msg.action);
    });

    rs.on ("snipe", function(){
        console.log ("This player sniped!");
    });

    rs.on ("speed", function(){
        console.log ("This player speeded!");
    });

    rs.on ("out", function(){
        console.log ("This player outed!");
    });

    rs.recv ("slide", function (uid, msg){
        console.log ("player " + uid + " updated their slider to: " + msg.action);
        console.log (typeof uid);
    });

    rs.recv ("snipe", function (uid){
        console.log ("player " + uid + " sniped!");
    });

    rs.recv ("speed", function (uid){
        console.log ("player " + uid + " speeded!");
    });

    rs.recv ("out", function (uid){
        console.log ("player " + uid + " outed!");
    });

}]);
