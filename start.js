RedwoodHighFrequencyTrading.controller("HFTStartController",
["$scope",
 '$interval',
 "RedwoodSubject",
 "SVGGraphing",
 "ConfigManager",
 "SynchronizedStopWatch",
 "$http",
 function ($scope, $interval, rs, graphing, configManager, stopWatch, $http) {


    var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in hz
    var LATENCY = 1000;         // Milliseconds of latency that will occur when user not using high speed

    $scope.marketEvents = [];   // Buy and sell offers stored here -> [[offerTime, offerType], ...etc]
    $scope.priceChanges = [];   // Price events stored here -> [[time, newPrice], ...etc]

    //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
    $scope.tick = function(tick){
        $scope.tradingGraph.draw(Date.now());
    }

    //First function to run when page is loaded
    rs.on_load(function () {

        //Get info from the config file
        function extractConfigEntry (entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }
        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = configManager.loadPerSubject(rs, {
            startingWealth: "100",
            marketEventsURL: null,
            priceChangesURL: null
        });

        //Initiate new procedure to load data from external csv files
        loadCSVs();
    });


    //loads market events and price changes from dropbox CSVs
    //basic CSV parsing with string.split
    function loadCSVs () {
        //Load market events
        $http.get($scope.config.marketEventsURL).then(function(response) {
            var rows = response.data.split("\n");

            //Parse first market events CSV
            for (var i = 0; i < rows.length-1; i++) {
                $scope.marketEvents[i] = [];
            }

            for (var i = 0; i < rows.length-1; i++) {
                if (rows[i] == "") continue;
                var cells = rows[i].split(",");
                for (var j = 0; j < cells.length; j++) {
                    $scope.marketEvents[i][j] = isNaN (cells[j]) ? cells[j] : parseFloat (cells[j]);
                }
            }

            //once market events has been loaded and parsed, load price changes
            $http.get($scope.config.priceChangesURL).then(function(response) {
                var rows = response.data.split("\n");

                //Parse price changes CSV
                for (var i = 0; i < rows.length-1; i++) {
                    $scope.priceChanges[i] = [];
                }

                for (var i = 0; i < rows.length-1; i++) {
                    if (rows[i] == "") continue;
                    var cells = rows[i].split(",");
                    for (var j = 0; j < cells.length; j++) {
                        $scope.priceChanges[i][j] = parseFloat(cells[j]);
                    }
                }

                //once price changes have finished loading, initialize the experiment
                rs.synchronizationBarrier("init_round_" + rs.period).then(initExperiment());
            });
        });
    }

    //Called after CSV's have been loaded, initializes the graph
    function initExperiment () {
        console.log ("market events:");
        console.log ($scope.marketEvents);

        console.log ("price changes:");
        console.log ($scope.priceChanges);

        $scope.tradingGraph = graphing.makeTradingGraph("graph1");
        $scope.tradingGraph.init(Date.now(), $scope.priceChanges, []);

        $interval($scope.tick, CLOCK_FREQUENCY, 100);
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
