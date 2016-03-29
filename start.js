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
 function ($scope, $interval, rs, dataHistory, marketAlgorithm, graphing, groupManager, configManager, stopWatch, $http) {

    var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in hz

    $scope.market_button_text = "Enter Market";
    $scope.marketEvents = [];   // Buy and sell offers stored here -> [[offerTime, offerType], ...etc]
    $scope.priceChanges = [];   // Price events stored here -> [[time, newPrice], ...etc]
    $scope.in_market = false;
    $scope.spread = 0;
    $scope.sendWaitListToGroupManager = [];
    $scope.sendWaitListToMarketAlg = [];
    $scope.latency = 1000;


    $scope.MESpreads = {}; //store other players' spread values when a market event occurs

    //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
    $scope.update = function(){
        //$scope.tradingGraph.draw(Date.now());
        if($scope.iAmRoot){
            $scope.groupManager.update();
        }
        
        //Check the inbound message wait list to see if a msg needs to be sent
        while($scope.sendWaitListToMarketAlg.length > 0 
              && Date.now() > $scope.sendWaitListToMarketAlg[0].actionTime){
            var msg = $scope.sendWaitListToMarketAlg[0].msg;
            updateMsgTime(msg);
            $scope.logger.logSend(msg, "Market Algorithm");
            $scope.sendWaitListToMarketAlg.shift();
            $scope.mAlgorithm.recvMessage(msg);
        }

        //Check the outbound message wait list to see if a msg needs to be sent
        while($scope.sendWaitListToGroupManager.length > 0 
              && Date.now() > $scope.sendWaitListToGroupManager[0].actionTime){
            var msg = $scope.sendWaitListToGroupManager[0].msg;
            updateMsgTime(msg);
            $scope.logger.logSend(msg, "Group Manager");
            $scope.sendWaitListToGroupManager.shift();
            rs.send("To_Group_Manager", msg);
        }
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
        else {
            var packedMsg = packMsg(msg, delay);
            $scope.logger.logSendWait(packedMsg.msg);
            $scope.sendWaitListToGroupManager.push(packedMsg);
            $scope.sortMsgList($scope.sendWaitListToGroupManager);
        }
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

        // Parse config.groups for information - provides these variables:
        // $scope.myId      -> id of this subject
        // $scope.groupId   -> id of the group that this subject is in
        // $scope.group     -> array of id's of ALL SUBJECTS in this subject's group
        // $scope.others    -> array of id's of ALL OTHER SUBJECTS in this subject's group
        // $scope.groupRoot -> id of the root subject of this group
        // $scope.iAmRoot   -> boolean reflecting if this subject is the root subject for this group
        $scope.myId = rs.user_id;
        var i = 1;
        var j = 0;
        for(i; i < $scope.config.groups.length + 1; i++){
            for(j = 0; j < $scope.config.groups[i-1].length; j++){
                if($scope.config.groups[i-1][j] == $scope.myId){
                    $scope.groupId = i;
                    $scope.group = $scope.config.groups[i-1].slice();
                    $scope.groupRoot = $scope.group[0];
                    $scope.others = [];
                    var z = 0;
                    for(z; z < $scope.group.length; z++){
                        if($scope.myId != $scope.group[z]){
                            $scope.others.push($scope.group[z]);
                        }
                    }
                    $scope.iAmRoot = $scope.myId == $scope.groupRoot;
                }
            }
        } // End of parsing config.groups

        //Create the logger for this start.js page
        $scope.logger = new MessageLogger("Subject Manager" + String($scope.myId), "yellow", "subject-log");

        //Create reciever function that will recieve messages from the market algorithm
        var recvFromMarketAlg = function(msg){
            updateMsgTime(msg);
            $scope.logger.logRecv(msg, "Market Algorithm");
            $scope.sendToGroupManager(msg, $scope.latency);
        }

        //Create market algorithm object with ability to attatch messages to the message waiting list
        $scope.mAlgorithm = marketAlgorithm.createMarketAlgorithm($scope.myId, recvFromMarketAlg);
        $scope.tradingGraph = graphing.makeTradingGraph("graph1");

        //If this is the root, create the group manager
        if($scope.iAmRoot){
            $http.get($scope.config.priceChangesURL).then(function(response) {
                $scope.groupManager = groupManager.createGroupManager(response, rs.send);
            });
        }
    });

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
            rs.send ("marketStatus");
            $scope.in_market = !$scope.in_market;
            $scope.market_button_text = $scope.in_market ? "Leave Market" : "Enter Market";
        })

    $ ("#send_spread")
        .button()
        .click (function (event) {

        })


    function setListeners(){
                //Functions for handling messages sent to group manager
                function handleMsgToGM(message){
                    if($scope.iAmRoot){
                        $scope.groupManager.recvFromSubject(message);
                    }
                }

                rs.on ("To_Group_Manager", function (msg){
                    handleMsgToGM(msg);
                });

                rs.recv ("To_Group_Manager", function (uid, msg){
                    handleMsgToGM(msg);
                });


                //Functions for handling messages sent from the group manager
                function handleMsgFromGM(message){
                    updateMsgTime(message);
                    $scope.logger.logRecv(message, "group manager");
                    $scope.sendToMarketAlg(message, $scope.latency);
                }

                rs.on ("From_Group_Manager", function (msg){
                    handleMsgFromGM(msg);
                });

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

    rs.on ("Experiment_Begin", function (msg){
        console.log("Begining at time: " + String(msg));
        startExperiment(msg);
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

    rs.recv ("slide", function (uid, msg){
        console.log ("player " + uid + " updated their slider to: " + msg.action);
    });

    rs.recv ("snipe", function (uid){
        console.log ("player " + uid + " sniped!");
    });

    rs.recv ("speed", function (uid){
        console.log ("player " + uid + " speeded!");
    });

    rs.recv ("marketStatus", function (uid){
        
    });

    rs.recv ("sample", function (uid, msg){
        //Do stuff here
    });

}]);
