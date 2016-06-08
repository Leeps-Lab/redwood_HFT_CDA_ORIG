RedwoodHighFrequencyTrading.controller("HFTStartController",
["$scope",
 '$interval',
 "RedwoodSubject",
 "DataHistory",
 "Graphing",
 "SynchronizedStopWatch",
 "$http",
 function ($scope, $interval, rs, dataHistory, graphing, stopWatch, $http) {

    var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in ms delay between ticks

    $scope.sliderVal = 5;
    $scope.state = "state_out";
    $scope.using_speed = false;
    $scope.spread = 0;
    $scope.startingWealth = 100;

    //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
    $scope.update = function(){
        $scope.tradingGraph.draw($scope.dHistory);

        if ($scope.using_speed) {
           $scope.dHistory.profit -= CLOCK_FREQUENCY * $scope.dHistory.speedCost / 1000
        }
    };

    // Sorts a message list with the lowest actionTime first
    $scope.sortMsgList = function(msgList){
        msgList.sort(function(a, b){
            if (a.actionTime < b.actionTime)
                return -1;
            if (a.actionTime > b.actionTime)
                return 1;
            return 0;
        });
    };

    // Sends a message to the Market Algorithm
    $scope.sendToMarketAlg = function(msg, delay){
        if(delay == 0) {
            if($scope.isDebug){
                $scope.logger.logSend(msg, "Market Algorithm");
            }
            $scope.mAlgorithm.recvMessage(msg);
            //$scope.dHistory.recvMessage(msg);
        }
        else {
            var packedMsg = packMsg(msg, delay);
            if($scope.isDebug){
                $scope.logger.logSendWait(packedMsg.msg);
            }
            $scope.sendWaitListToMarketAlg.push(packedMsg);
            $scope.sortMsgList($scope.sendWaitListToMarketAlg);
        }
    };

    // Sends a message to the Group Manager
    $scope.sendToGroupManager = function(msg, delay){
        if($scope.isDebug){
            $scope.logger.logSend(msg, "Group Manager");
        }
        rs.send("To_Group_Manager", msg);
    };

    //First function to run when page is loaded
    rs.on_load(function () {
        rs.send("Subject_Ready");
    });

    //Initializes experiment
    rs.recv ("Experiment_Begin", function (uid, data){
        $scope.groupNum = data.groupNumber;
        $scope.group = data.group;

        //Create the logger for this start.js page
        $scope.isDebug = data.isDebug;
        if($scope.isDebug){
            $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Subject Message Log</div><div id="subject-log" class="terminal"></div></div>');
            $scope.logger = new MessageLogger("Subject Manager " + String(rs.user_id), "yellow", "subject-log");
        }

        //Create data history and graph objects
        $scope.dHistory = dataHistory.createDataHistory(data.startTime, data.startFP, rs.user_id, $scope.group, $scope.isDebug);
        $scope.tradingGraph = graphing.makeTradingGraph("graph1", "graph2", data.startTime);
        $scope.tradingGraph.init();

        //set initial profit equal to value set in config
        $scope.dHistory.curProfitSegment = [data.startTime, $scope.startingWealth, 0];
        $scope.dHistory.profit = $scope.startingWealth;

        // start looping the update function
        $interval($scope.update, CLOCK_FREQUENCY);
    });

    rs.recv ("From_Group_Manager", function (uid, msg){
        handleMsgFromGM(msg);
    });

    $scope.setSpeed = function(value){
        if(value !== $scope.using_speed){
            $scope.using_speed = value;
            var msg = new Message("USER", "USPEED", [rs.user_id, $scope.using_speed]);
            $scope.sendToGroupManager(msg);
        }
    };

    $ ("#slider")
        .slider ({
            orientation: "vertical",
            step: .01,
            change: function (event, ui) {
                if(ui.value != $scope.sliderVal){
                    $scope.sliderVal = ui.value;
                    var msg = new Message("USER", "UUSPR", [rs.user_id, $scope.sliderVal]);
                    $scope.sendToGroupManager(msg);
                }
            },
            start: function (event, ui) {
                if ($scope.state != "state_maker") {
                    var msg = new Message("USER", "UMAKER", [rs.user_id]);
                    $scope.sendToGroupManager(msg);
                    $scope.setState("state_maker");
                }
            },
            value: $scope.sliderVal,
            max : 10
        });

    // button for setting state to sniper
    $ ("#state_snipe")
        .addClass("state-not-selected")
        .button()
        .click (function (event) {
            var msg = new Message("USER", "USNIPE", [rs.user_id]);
            $scope.sendToGroupManager(msg);
            $scope.setState("state_snipe");
        });

    // button for setting state to market maker
    $ ("#state_maker")
        .addClass("state-not-selected")
        .button()
        .click (function (event) {
            var msg = new Message("USER", "UMAKER", [rs.user_id]);
            $scope.sendToGroupManager(msg);
            $scope.setState("state_maker");
        });

    // button for setting state to "out of market"
    $ ("#state_out")
        .addClass("state-selected")
        .button()
        .click (function (event) {
            var msg = new Message("USER", "UOUT", [rs.user_id]);
            $scope.sendToGroupManager(msg);
            $scope.setState("state_out");
        });

    $scope.setState = function(newState){
        $("#"+$scope.state).removeClass("state-selected").addClass("state-not-selected");
        $scope.state = newState;
        $("#"+$scope.state).removeClass("state-not-selected").addClass("state-selected");
    };

    // recieve message from market algorithm to the data history object
    rs.recv ("To_Data_History_" + String(rs.user_id), function (uid, msg){
        if($scope.isDebug){
            $scope.logger.logRecv(msg, "Market Algorithm");
        }
        $scope.dHistory.recvMessage(msg);
    });

}]);
