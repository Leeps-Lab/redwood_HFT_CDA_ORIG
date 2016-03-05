RedwoodHighFrequencyTrading.controller("HFTStartController",
["$scope",
 '$interval',
 "RedwoodSubject",
 "DataHistory",
 "MarketAlgorithm",
 "Graphing",
 "ConfigManager",
 "SynchronizedStopWatch",
 "$http",
 function ($scope, $interval, rs, dataHistory, marketAlgorithm, graphing, configManager, stopWatch, $http) {

    var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in hz
    var LATENCY = 1000;         // Milliseconds of latency that will occur when user not using high speed

    $scope.market_button_text = "Enter Market";
    $scope.marketEvents = [];   // Buy and sell offers stored here -> [[offerTime, offerType], ...etc]
    $scope.priceChanges = [];   // Price events stored here -> [[time, newPrice], ...etc]
    $scope.in_market = false;
    $scope.numTicks = 0;
    $scope.spread = 0;
    $scope.testMEIndex = 0;

    $scope.MESpreads = {}; //store other players' spread values when a market event occurs

    //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
    $scope.tick = function(tick){
        $scope.tradingGraph.draw(Date.now());
        $scope.numTicks++;
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
                if (rows[i] === "") continue;
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
                    if (rows[i] === "") continue;
                    var cells = rows[i].split(",");
                    for (var j = 0; j < cells.length; j++) {
                        $scope.priceChanges[i][j] = parseFloat(cells[j]);
                    }
                }

                //initialize object containing other players' spreads
                initMESpreads();

                //once price changes have finished loading, initialize the experiment
                rs.synchronizationBarrier("init_round_" + rs.period).then(initExperiment());
            });
        });
    }

    //Called after CSV's have been loaded, initializes the graph
    function initExperiment () {
        
        var testvals = [
            {price : 15, timestamp : 1000, uid : null},
            {price : 20, timestamp : 1250, uid : null},
            {price : 20, timestamp : 1300, uid : null},
            {price : 8, timestamp : 1700, uid : null},
            {price : 15, timestamp : 1800, uid : null}
        ]

        dataHistory.runtest();
        marketAlgorithm.runtest();

        $scope.tradingGraph = graphing.makeTradingGraph("graph1");
        $scope.tradingGraph.init(Date.now(), $scope.priceChanges, []);

        $interval($scope.tick, CLOCK_FREQUENCY);
    }

    function initMESpreads () {
        $scope.MESpreads = {
            time_a : {id : "buy", spreads : [-1, -1, -1, -1]},
            time_b : {id : "buy", spreads : [-1, -1, -1, -1]},
            time_c : {id : "sell", spreads : [-1, -1, -1, -1]}
        }
    }

    //gets the fundamental market value at a given time from the price changes array
    function getFundVal (time) {
        var index = 0;
        while (index < $scope.priceChanges.length && time > $scope.priceChanges[index + 1][0]) index++;
        return $scope.priceChanges[index][1];
    }

    //stolen from bubbles
    //returns an appropriate value to index players with inside groups
    function indexFromId (id) {
        var index = 0;
        for (var i = 0; i < rs.subjects.length; i++) {
            if (parseInt(rs.subjects[i].user_id) < id) index++;
        }
        return index;
    }

    //adds a spread to the list of spreads
    //if the array is full, it checks to see if this player has the lowest spread
    function addSpread (id, msg) {
        //add spread to list
        $scope.MESpreads ["time_" + msg.id].spreads [indexFromId (id)] = msg.spread;

        //check to see if the list has been completely filled with actual spread values
        if (!$scope.MESpreads ["time_" + msg.id].spreads.includes (-1)) {
            //if it has, this nasty expression checks to see if this player has the lowest spread
            if (Math.min.apply (null, $scope.MESpreads ["time_" + msg.id].spreads) == $scope.MESpreads ["time_" + msg.id].spreads [indexFromId (id)]) {
                console.log("I win!");
            }
        }
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

    $ ("#market_button")
        .button()
        .click (function (event) {
            console.log("toggled market button");
            $scope.in_market = !$scope.in_market;

            //when player joins market, send bid and ask orders at fund value +- 1/2 spread
            if ($scope.in_market) {
                var currtime = $scope.numTicks * CLOCK_FREQUENCY;
                var currfundval = getFundVal (currtime);
                var msg = {
                    bid : currfundval + .5 * $scope.spread,
                    ask : currfundval - .5 * $scope.spread,
                    timestamp : currtime
                }
                rs.send ("player_join_market", msg);
            }
            $scope.market_button_text = $scope.in_market ? "Leave Market" : "Enter Market";
        })

    $ ("#send_spread")
        .button()
        .click (function (event) {

        })

    rs.on ("slide", function(msg){
        $ ("#slider-val").val (msg.action);
        $scope.spread = msg.action;
        console.log ("This player's slider val: " + msg.action);
    });

    rs.on ("snipe", function(){
        console.log ("This player sniped!");
        console.log($scope.MESpreads);
    });

    rs.on ("speed", function(){
        console.log ("This player speeded!");
    });

    rs.on ("out", function(){
        console.log ("This player outed!");
    });

    rs.on ("send_spread", function (msg){
        addSpread (rs.user_id, msg);
    });

    rs.recv ("slide", function (uid, msg){
        console.log ("player " + uid + " updated their slider to: " + msg.action);
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

    rs.recv ("send_spread", function (uid, msg){
        addSpread (uid, msg);
    });

}]);
