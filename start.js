RedwoodHighFrequencyTrading.controller("HFTStartController",
["$scope",
 '$interval',
 "RedwoodSubject",
 "DataHistory",
 "Graphing",
 "ConfigManager",
 "SynchronizedStopWatch",
 "$http",
 //"Logger",
 function ($scope, $interval, rs, dataHistory, graphing, configManager, stopWatch, $http) {

    var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in hz

    $scope.speed_button_text = "Turn On Speed";
    $scope.sliderVal = 5;
    $scope.state = "state_out";
    $scope.using_speed = false;
    $scope.spread = 0;

    //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
    $scope.update = function(){
        $scope.tradingGraph.draw($scope.dHistory);
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
        $scope.tradingGraph = graphing.makeTradingGraph("graph1");
        $scope.tradingGraph.init();
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
