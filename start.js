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
    
    $scope.speed_button_text = "Turn On Speed";
    $scope.sliderVal = 5;
    $scope.state = "state_out";
    $scope.using_speed = false;
    $scope.spread = 0;
    $scope.profit;
    $scope.startingWealth = 100;
    $scope.speedCost = 5;

    //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
    $scope.update = function(){
        $scope.tradingGraph.draw($scope.dHistory);

        if ($scope.using_speed) {
           $scope.profit -= CLOCK_FREQUENCY * $scope.speedCost / 1000
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
            $scope.logger.logSend(msg, "Market Algorithm");
            $scope.mAlgorithm.recvMessage(msg);
            //$scope.dHistory.recvMessage(msg);
        }
        else {
            var packedMsg = packMsg(msg, delay);
            $scope.logger.logSendWait(packedMsg.msg);
            $scope.sendWaitListToMarketAlg.push(packedMsg);
            $scope.sortMsgList($scope.sendWaitListToMarketAlg);
        }
    };

    // Sends a message to the Group Manager
    $scope.sendToGroupManager = function(msg, delay){
        $scope.logger.logSend(msg, "Group Manager");
        rs.send("To_Group_Manager", msg);
    };

    //First function to run when page is loaded
    rs.on_load(function () {

        //Create the logger for this start.js page
        $scope.logger = new MessageLogger("Subject Manager " + String(rs.user_id), "yellow", "subject-log");
        rs.send("Subject_Ready");
    });

    //Functions for starting the experiment
    function startExperiment(startTime, groupNum, group){
        $scope.groupNum = groupNum;
        $scope.group = group;

        //Create data history and graph objects
        $scope.dHistory = dataHistory.createDataHistory(startTime, rs.user_id, group);
        $scope.tradingGraph = graphing.makeTradingGraph("graph1", "graph2");
        $scope.tradingGraph.init();

        //set initial profit equal to value set in config
        $scope.dHistory.curProfitSegment = [startTime, $scope.startingWealth, 0];
        $scope.profit = $scope.startingWealth;

        // start looping the update function
        $interval($scope.update, CLOCK_FREQUENCY);
    }

    rs.recv ("Experiment_Begin", function (uid, data){
        startExperiment(data[0], data[1], data[2]);   // data looks like: [startTime, groupNum, group]
    });

    rs.recv ("From_Group_Manager", function (uid, msg){
        handleMsgFromGM(msg);
    });


    //Buttons for handling state changes
    $("#speed")
        .button()
        .click(function (event){
            $scope.using_speed = !$scope.using_speed;
            $scope.speed_button_text = $scope.using_speed ? "Turn Off Speed" : "Turn On Speed";
            $scope.dHistory.recordProfitSegment ($scope.profit, Date.now(), $scope.using_speed ? $scope.speedCost : 0);
            var msg = new Message("USER", "USPEED", [rs.user_id, $scope.using_speed]);
            console.log(msg);
            $scope.sendToGroupManager(msg);
        });

    $ ("#slider")
        .slider ({
            orientation: "vertical",
            change: function (event, ui) {
                    var newVal = $("#slider").slider ("value");
                    if(newVal != $scope.sliderVal){
                        $scope.sliderVal = newVal;
                        var msg = new Message("USER", "UUSPR", [rs.user_id, $scope.sliderVal]);
                        $scope.sendToGroupManager(msg);
                    }
            },
            value : 5,
            max : 10
        });

    // button for setting state to sniper
    $ ("#state_snipe")
        .css("border", "2px solid black")
        .button()
        .click (function (event) {
            var msg = new Message("USER", "USNIPE", [rs.user_id]);
            $scope.sendToGroupManager(msg);
            $scope.setState("state_snipe");
        });

    // button for setting state to market maker
    $ ("#state_maker")
        .css("border", "2px solid black")
        .button()
        .click (function (event) {
            var msg = new Message("USER", "UMAKER", [rs.user_id]);
            $scope.sendToGroupManager(msg);
            $scope.setState("state_maker");
        });

    // button for setting state to "out of market"
    $ ("#state_out")
        .css("border", "2px solid yellow")
        .button()
        .click (function (event) {
            var msg = new Message("USER", "UOUT", [rs.user_id]);
            $scope.sendToGroupManager(msg);
            $scope.setState("state_out");
        });

    $scope.setState = function(newState){
        $("#"+$scope.state).css("border", "2px solid black");
        $scope.state = newState;
        $("#"+$scope.state).css("border", "2px solid yellow");
    };

    // recieve message from market algorithm to the data history object
    rs.recv ("To_Data_History_" + String(rs.user_id), function (uid, msg){
        $scope.logger.logRecv(msg, "Market Algorithm");
        $scope.dHistory.recvMessage(msg);
    });

}]);
