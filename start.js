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
                initExperiment();
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

    rs.on("rp.next_round", function () {

    });

    rs.on("rp.selection", function (selection) {
        //$scope.selection = selection;
    })

    rs.on("rp.confirm", function (position) {
        /*$scope.inputEnabled = false; // for recovery

        //Switch text on the button so that participant knows button has been pressed
        $scope.ButtonText = "Confirmed";
        $scope.waiting = false;


        rs.synchronizationBarrier('rp.round_' + $scope.currentRound).then(function () {
            // Calculate current price
            var currentPrice = $scope.price;

            // Compute tatonnement data for this round]
            var subjectData = ta.getSubjectData(rs.subjects);
            var roundContext = ta.RoundContext(currentPrice, subjectData);

            // check if demand is under threshold (epsilon)
            var roundsUnder = rs.self.get("rp.rounds_under_epsilon");
            if (Math.abs(roundContext.excessDemandPerCapita) < $scope.config.epsilon) {
                roundsUnder += 1;
            } else {
                roundsUnder = 0;
            }
            rs.set("rp.rounds_under_epsilon", roundsUnder);

            // If demand has been under threshold for @roundsUnderEpsilon rounds,
            // or if the maximum number of rounds have been played,
            // or if the all of the weightvector weights have been used, stop tatonnement
            if (roundsUnder            >= $scope.config.roundsUnderEpsilon
                || $scope.currentRound >= $scope.config.rounds
                || tatonnement.weightVectorFinished()) {

                var actualAllocation = tatonnement.adjustedAllocation(
                    $scope.selection,
                    $scope.endowment,
                    roundContext,
                    $scope.config.marketMaker);

                $scope.selection = [actualAllocation.x, actualAllocation.y];

                // reset rounds under epsilon
                rs.set("rp.rounds_under_epsilon", 0);
                rs.trigger("rp.perform_allocation", actualAllocation);
                return;
            }

            // Get adjusted price
            var newPrice = tatonnement.adjustedPrice(roundContext);

            // Proceed to next round
            rs.set("rp.price", newPrice);
            rs.trigger("rp.next_round");
        });*/
    });

    // Recieve result (whether X or Y was chosen) from admin.
    // This result is really only used for practice rounds.
    rs.on("rp.result", function (result) {
        /*result.period = rs.period;
        rs.set("rp.results", result);

        if($scope.config.plotResult) {
            $scope.finalResult = result;
            rs.next_period($scope.config.delay);
        } else {
            rs.next_period();
        }*/
    });

    $scope.$on("rpPlot.click", function (event, selection) {
        //rs.trigger("rp.selection", selection);
    });

    $scope.confirm = function () {
        /*$scope.inputEnabled = false;
        rs.trigger("rp.confirm", {
            "round": $scope.currentRound,
            "x": $scope.selection[0],
            "y": $scope.selection[1]
        });*/
    };
}]);
