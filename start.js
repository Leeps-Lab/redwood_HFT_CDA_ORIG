RedwoodHighFrequencyTrading.controller("HFTStartController",
["$scope",
 '$interval',
 "RedwoodSubject",
 "DataHistory",
 "MarketAlgorithm",
 "Graphing",
 "GroupManager",
 "ConfigManager",
 "SynchronizedStopWatch",
 "$http",
 //"Logger",
 function ($scope, $interval, rs, dataHistory, marketAlgorithm, graphing, groupManager, configManager, stopWatch, $http) {

    var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in ms delay between ticks
    
    $scope.speed_button_text = "Turn On Speed";
    $scope.marketEvents = [];   // Buy and sell offers stored here -> [[offerTime, offerType], ...etc]
    $scope.priceChanges = [];   // Price events stored here -> [[time, newPrice], ...etc]
    $scope.sliderVal = 5;
    $scope.state = "state_out";
    $scope.using_speed = false;
    $scope.spread = 0;
    $scope.profit;
    //$scope.sendWaitListToGroupManager = [];
    //$scope.sendWaitListToMarketAlg = [];
    //$scope.maxLatency = 500;
    //$scope.latency = $scope.maxLatency;


    $scope.MESpreads = {}; //store other players' spread values when a market event occurs

    //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
    $scope.update = function(){
        $scope.tradingGraph.draw($scope.dHistory);

        if ($scope.using_speed) {
           $scope.profit -= CLOCK_FREQUENCY * $scope.config.speedCost / 1000
        }

        // latency is moved to group manager

        // //Check the inbound message wait list to see if a msg needs to be sent
        // while($scope.sendWaitListToMarketAlg.length > 0
        //       && Date.now() > $scope.sendWaitListToMarketAlg[0].actionTime){
        //     var msg = $scope.sendWaitListToMarketAlg[0].msg;
        //     updateMsgTime(msg);
        //     $scope.logger.logSend(msg, "Market Algorithm");
        //     $scope.sendWaitListToMarketAlg.shift();
        //     $scope.mAlgorithm.recvMessage(msg);
        //     //$scope.dHistory.recvMessage(msg);
        // }
        //
        // //Check the outbound message wait list to see if a msg needs to be sent
        // while($scope.sendWaitListToGroupManager.length > 0
        //       && Date.now() > $scope.sendWaitListToGroupManager[0].actionTime){
        //     var msg = $scope.sendWaitListToGroupManager[0].msg;
        //     updateMsgTime(msg);
        //     $scope.logger.logSend(msg, "Group Manager");
        //     $scope.sendWaitListToGroupManager.shift();
        //     rs.send("To_Group_Manager", msg);
        // }
    }

    // Sorts a message list with the lowest actionTime first
    $scope.sortMsgList = function(msgList){
        msgList.sort(function(a, b){
            if (a.actionTime < b.actionTime)
                return -1;
            if (a.actionTime > b.actionTime)
                return 1;
            return 0;
        });
    }

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
    }

    // Sends a message to the Group Manager
    $scope.sendToGroupManager = function(msg, delay){
        if(delay == 0) {
            $scope.logger.logSend(msg, "Group Manager");
            rs.send("To_Group_Manager", msg);
        }
        //moved latency simulation to groupManager
        // else {
        //     var packedMsg = packMsg(msg, delay);
        //     $scope.logger.logSendWait(packedMsg.msg);
        //     $scope.sendWaitListToGroupManager.push(packedMsg);
        //     $scope.sortMsgList($scope.sendWaitListToGroupManager);
        // }
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
            speedCost: "5",
            marketEventsURL: null,
            priceChangesURL: null
        });

        // Parse config.groups for information - provides these variables:
        // $scope.groupData.mIyd      -> id of this subject
        // $scope.groupData.groupId   -> id of the group that this subject is in
        // $scope.groupData.group     -> array of id's of ALL SUBJECTS in this subject's group
        // $scope.groupData.others    -> array of id's of ALL OTHER SUBJECTS in this subject's group
        // $scope.groupData.groupRoot -> id of the root subject of this group
        // $scope.groupData.iAmRoot   -> boolean reflecting if this subject is the root subject for this group
        $scope.groupData = {};
        $scope.groupData.myId = rs.user_id;
        var i = 1;
        var j = 0;
        for(i; i < $scope.config.groups.length + 1; i++){
            for(j = 0; j < $scope.config.groups[i-1].length; j++){
                if($scope.config.groups[i-1][j] == $scope.groupData.myId){
                    $scope.groupData.groupId = i;
                    $scope.groupData.group = $scope.config.groups[i-1].slice();
                    $scope.groupData.groupRoot = $scope.groupData.group[0];
                    $scope.groupData.others = [];
                    var z = 0;
                    for(z; z < $scope.groupData.group.length; z++){
                        if($scope.groupData.myId != $scope.groupData.group[z]){
                            $scope.groupData.others.push($scope.groupData.group[z]);
                        }
                    }
                    $scope.groupData.iAmRoot = $scope.groupData.myId == $scope.groupData.groupRoot;
                }
            }
        } // End of parsing config.groups

        //Create the logger for this start.js page
        $scope.logger = new MessageLogger("Subject Manager" + String($scope.groupData.myId), "yellow", "subject-log");

        // log.init("hello-world");
        // log.log("hi");
        // log.log($scope.config.groups);

        //Create reciever function that will recieve messages from the market algorithm
        var recvFromMarketAlg = function(msg){
            updateMsgTime(msg);
            $scope.logger.logRecv(msg, "Market Algorithm");
            $scope.sendToGroupManager(msg, 0);
        }

        //Create market algorithm object with ability to attatch messages to the message waiting list
        $scope.dHistory = dataHistory.createDataHistory();
        $scope.mAlgorithm = marketAlgorithm.createMarketAlgorithm($scope.groupData, recvFromMarketAlg, $scope.dHistory);
        $scope.tradingGraph = graphing.makeTradingGraph("graph1", "graph2", CLOCK_FREQUENCY);
        $scope.tradingGraph.init();

        //set initial profit equal to value set in config
        $scope.dHistory.curProfitSegment = [Date.now(), $scope.config.startingWealth, 0];
        $scope.profit = $scope.config.startingWealth;

        // Communicate with the group manager to start this round
        rs.synchronizationBarrier ("group_ready").then (function (){
            var msg = new Message("USER", "UREADY", [-1]);
            $scope.sendToGroupManager(msg);
            if ($scope.groupData.iAmRoot)
                rs.send ("start_group");
        });
    });

    $ ("#slider")
        .slider ({
            orientation: "vertical",
            change: function (event, ui) {
                    //rs.send ("slide", msg);
                    var newVal = $("#slider").slider ("value");
                    if(newVal != $scope.sliderVal){
                        $scope.sliderVal = newVal;
                        var msg = new Message("USER", "UUSPR", [$scope.sliderVal]);
                        $scope.sendToMarketAlg(msg, 0);
                    }
            },
            value : 5,
            max : 10
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
        });

    $ ("#send_spread")
        .button()
        .click (function (event) {
        });


    function setListeners(){
                // Functions for handling messages sent to group manager
                // moved to admin page
                // function handleMsgToGM(message){
                //     if($scope.groupData.iAmRoot){
                //         $scope.groupManager.recvFromSubject(message);
                //     }
                // }
                //
                // rs.on ("To_Group_Manager", function (msg){
                //     handleMsgToGM(msg);
                // });
                //
                // rs.recv ("To_Group_Manager", function (uid, msg){
                //     handleMsgToGM(msg);
                // });

                //Functions for handling messages sent from the group manager
                function handleMsgFromGM(message){
                    updateMsgTime(message);
                    $scope.logger.logRecv(message, "group manager");
                    $scope.sendToMarketAlg(message, 0);
                }

                rs.recv ("From_Group_Manager", function (uid, msg){
                    handleMsgFromGM(msg);
                });
    }

    //Functions for starting the experiment
    function startExperiment(startTime){
        $scope.startTime = startTime;
        setListeners();
        $interval($scope.update, CLOCK_FREQUENCY);
    }

    rs.recv ("test", function (uid, msg) {
        console.log(msg + "received from " + uid);
    });

    rs.recv ("Experiment_Begin", function (uid, msg){
        console.log("Begining at time: " + String(msg));
        startExperiment(msg);
    });

    rs.on ("slide", function(msg){
        $ ("#slider-val").val (msg.action);
        $scope.spread = msg.action;
        console.log ("This player's slider val: " + msg.action);
    });

    rs.on ("speed", function(){
        $scope.using_speed = !$scope.using_speed;
        $scope.mAlgorithm.using_speed = $scope.using_speed;
        $scope.speed_button_text = $scope.using_speed ? "Turn Off Speed" : "Turn On Speed";

        $scope.dHistory.recordProfitSegment ($scope.profit, Date.now(), $scope.using_speed ? $scope.config.speedCost : 0);
        //$scope.latency = $scope.using_speed ? 0 : $scope.maxLatency;
    });

    rs.recv ("slide", function (uid, msg){
        console.log ("player " + uid + " updated their slider to: " + msg.action);
    });

    rs.recv ("speed", function (uid){
        console.log ("player " + uid + " speeded!");
    });


    //Buttons for handling state changes
    $ ("#state_snipe")
        .css("border", "2px solid black")
        .button()
        .click (function (event) {
            rs.send ("state_snipe");
        });

    $ ("#state_maker")
        .css("border", "2px solid black")
        .button()
        .click (function (event) {
            rs.send ("state_maker");
        });

    $ ("#state_out")
        .css("border", "2px solid yellow")
        .button()
        .click (function (event) {
            rs.send ("state_out");
        });

    $scope.setState = function(newState){
        $("#"+$scope.state).css("border", "2px solid black");
        $scope.state = newState;
        $scope.mAlgorithm.state = newState;
        $("#"+$scope.state).css("border", "2px solid yellow");
    };

    rs.on ("state_maker", function (uid){
        $scope.setState("state_maker");
        var msg = new Message("USER", "UENTM", -1);
        $scope.sendToMarketAlg(msg, 0);
    });

    rs.on ("state_snipe", function (uid){
        if($scope.state == "state_maker"){
            var msg = new Message("USER", "UEXTM", -1);
            $scope.sendToMarketAlg(msg, 0);
        }
        $scope.setState("state_snipe");
    });

    rs.on ("state_out", function (uid){
        if($scope.state == "state_maker"){
            var msg = new Message("USER", "UEXTM", -1);
            $scope.sendToMarketAlg(msg, 0);
        }
        $scope.setState("state_out");
    });




    rs.recv ("sample", function (uid, msg){
        //Do stuff here
    });

}]);
