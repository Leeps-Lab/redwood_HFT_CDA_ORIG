Redwood.controller("AdminCtrl",
["$rootScope",
 "$scope",
 "Admin",
 "MarketManager",
 "GroupManager",
 "MarketAlgorithm",
 "$http",
 "$interval",
 function($rootScope, $scope, ra, marketManager, groupManager, marketAlgorithm, $http, $interval) {
   
   var debugMode = false;   // change this to switch all the message loggers on and off

   var Display = { //Display controller

      initialize: function() {
         $("#start-session").click(function () {
            $("#start-session").attr("disabled", "disabled");
            ra.trigger("start_session");
         });

         ra.on("start_session", function() {
            $("#start-session").attr("disabled", "disabled");
            $("#pause-session").removeAttr("disabled");
         });

         $("#refresh-subjects").click(function () {
            $("#refresh-subjects").attr("disabled", "disabled");
            ra.refreshSubjects().then(function() {
               $("#refresh-subjects").removeAttr("disabled");
            });
         });

         $("#reset-session").click(function () {
            ra.reset();
         });

         $("#pause-session").click(function () {
            $("#pause-session").attr("disabled", "disabled");
            ra.trigger("pause");
         });
         ra.on("pause", function() {
            $("#pause-session").attr("disabled", "disabled");
         });

         $("#resume-session").click(function () {
            $("#resume-session").attr("disabled", "disabled");
            ra.trigger("resume");
         });
         ra.on("resume", function() {
            $("#resume-session").attr("disabled", "disabled");
            $("#pause-session").removeAttr("disabled");
         });

         ra.on_subject_paused(function(userId) {
            $("#pause-session").attr("disabled", "disabled");
            $("tr.subject-" + userId).addClass("warning"); //Display current period for each user
            $("tr.subject-" + userId + " :nth-child(4)").text("Paused"); //Display current period for each user
         });

         ra.on_all_paused(function() {
            $("#resume-session").removeAttr("disabled");
         });

         ra.on_subject_resumed(function(user) {
            $("tr.subject-" + user).removeClass("warning"); //Display current period for each user
            $("tr.subject-" + user + " :nth-child(4)").text(""); //Display current period for each user
         });

         $("#archive").click(function () {
            var r = confirm("Are you sure you want to archive this session?");
            if(r == true) {
               ra.delete_session();
            }
         });

         ra.on_router_connected(function(connected) { //Display router connection status
            var status = $("#router-status");
            if (connected) {
               status.text("Router Connected");
               status.removeClass("alert-danger");
               status.addClass("alert-success");
            } else {
               status.text("Router Disconnected");
               status.removeClass("alert-success");
               status.addClass("alert-danger");
            }
         });

         ra.on_set_period(function(user, period) {
            $("tr.subject-" + user + " :nth-child(3)").text(period); //Display current period for each user
         });

         ra.on_set_group(function(user, group) {
            $("tr.subject-" + user + " :nth-child(2)").text(group); //Display group for each user
         });

         ra.on_register(function(user) { //Add a row to the table to each user
            $("#subject-list").empty();
            for(var i = 0, l = ra.subjects.length; i < l; i++) {
               $("#subject-list").append($("<tr>").addClass("subject-" + ra.subjects[i].user_id).append(
                  $("<td>").text(ra.subjects[i].user_id).after(
                     $("<td>").text(0).after(
                        $("<td>").text(0).after(
                           $("<td>").text(""))))));
            }
         });

         ra.on_set_config(function(config) { //Display the config file
            $("table.config").empty();
            var a = $.csv.toArrays(config);
            for (var i = 0; i < a.length; i++) {
               var row = a[i];
               var tr = $("<tr>");
               for (var j = 0; j < row.length; j++) {
                  var cell = row[j];
                  var td = $((i == 0 ? "<th>" : "<td>")).text(cell);
                  tr.append(td);
               }
               $("table.config").append(tr);
            }
         });
      }
   };

   var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in hz

   $scope.groupManagers = {};

   $scope.updateGroupManagers = function() {
       $scope.groupManagers.forEach (function (entry) {
           entry.update();
       });
   };

   var resetGroups = function() {
      var config = ra.get_config(1, 0) || {};
      for (var i = 0; i < ra.subjects.length; i++) { //set all subjects to group 1 (this is so that matching can be changed per period)
         if($.isArray(config.groups)) {
            for(var groupId = 0; groupId < config.groups.length; groupId++) {
               if($.isArray(config.groups[groupId])) {
                  if(config.groups[groupId].indexOf(parseInt(ra.subjects[i].user_id)) > -1) { //Nested group array
                     ra.set_group(groupId + 1, ra.subjects[i].user_id);
                  }
               } else {
                  ra.set_group(1, ra.subjects[i].user_id);
               }
            }
         } else {
            ra.set_group(1, ra.subjects[i].user_id);
         }
      }
   };

   Display.initialize();

   ra.on_load(function () {
      resetGroups(); //Assign groups to users

      //INITIALIZE ADMIN FOR EXPERIMENT   **************************************

      $scope.priceChanges = [];
      var priceURL = ra.get_config(1, 0).priceChangesURL;
      $http.get(priceURL).then(function(response) {
         var rows = response.data.split("\n");

         //Parse price changes CSV
         for (let i = 0; i < rows.length-2; i++) {
            $scope.priceChanges[i] = [];
         }

         for (let i = 0; i < rows.length-2; i++) {
            if (rows[i + 1] === "") continue;
            var cells = rows[i + 1].split(",");
            for (let j = 0; j < cells.length; j++) {
               $scope.priceChanges[i][j] = parseFloat(cells[j]);
            }
         }

         $scope.investorArrivals = [];
         var arrivalURL = ra.get_config(1, 0).marketEventsURL;
         $http.get(arrivalURL).then(function(response) {
            var rows = response.data.split("\n");

            //Parse investor arrival changes CSV
            for (var i = 0; i < rows.length-2; i++) {
               $scope.investorArrivals[i] = [];
            }

            for (var i = 0; i < rows.length-2; i++) {
               if (rows[i + 1] === "") continue;
               var cells = rows[i + 1].split(",");
               for (var j = 0; j < cells.length; j++) {
                  $scope.investorArrivals[i][j] = parseFloat(cells[j]);
               }
            }

            //******************** seting up groups **************************

            // Fetch groups array from config file and create wraper for accessing groups
            $scope.groups = ra.get_config (1, 0).groups;
            $scope.getGroup = function(groupNum){
               return $scope.groups[groupNum-1];
            };

            // create synchronize arrays for starting each group and also map subject id to their group
            $scope.idToGroup = {};        // maps every id to thier corresponding group
            $scope.startSyncArrays = {};  // synchronized array for ensuring that all subjects in a group start together
            for(var groupNum = 1; groupNum <= $scope.groups.length; groupNum++){
               var group = $scope.getGroup(groupNum); // fetch group from array
               $scope.startSyncArrays[groupNum] = new synchronizeArray(group);
               for(var subject of group){
                  $scope.idToGroup[subject] = groupNum;
               }
            }

            // loop through groups and create thier groupManager, market, and marketAlgorithms
            for (var groupNum = 1; groupNum <= $scope.groups.length; groupNum++) {

               var group = $scope.getGroup(groupNum); // fetch group from array
                
               // package arguments into an object
               var groupArgs = {
                  priceChanges     : $scope.priceChanges, 
                  investorArrivals : $scope.investorArrivals, 
                  groupNumber      : groupNum, 
                  memberIDs        : group, 
                  isDebug          : debugMode
               };
               $scope.groupManagers[groupNum] = groupManager.createGroupManager (groupArgs, ra.sendCustom);
               $scope.groupManagers[groupNum].market = marketManager.createMarketManager(ra.sendCustom, groupNum, $scope.groupManagers[groupNum]);
               for(var subjectNum of group){
                  
                  // map subject number to group number
                  $scope.idToGroup[subjectNum] = groupNum;

                  // package market algorithm arguments into an object then create market algorithm
                  var subjectArgs = {
                     myId    : subjectNum,
                     groupId : groupNum,
                     isDebug : debugMode
                  };
                  $scope.groupManagers[groupNum].marketAlgorithms[subjectNum] = marketAlgorithm.createMarketAlgorithm(subjectArgs, $scope.groupManagers[groupNum], ra.sendCustom);
               }
            }
            //********************************************************************

         });

      });

      //DONE INITIALIZING ADMIN FOR EXPERIEMENT    ************************************

   });

   ra.recv ("player_join_market", function (uid, msg) {
       $scope.market.insertBid (msg.bid, msg.timestamp);
       $scope.market.insertAsk (msg.ask, msg.timestamp);
       console.log($scope.market);
   });


   ra.on_register(function(user) { //Add a row to the table to each user
      resetGroups();
   });

   ra.on("start_session", function() {
      ra.start_session();
   });

   ra.recv ("Subject_Ready", function(uid) {

      // get group number
      var groupNum = $scope.idToGroup[uid];

      // mark subject as ready
      $scope.startSyncArrays[groupNum].markReady(uid);

      // start experiment if all subjects are marked ready
      if($scope.startSyncArrays[groupNum].allReady()){
         var startTime = Date.now();
         var group = $scope.getGroup(groupNum);
         var startFP = $scope.groupManagers[groupNum].getStartFP();

         //send out start message with start time and information about group then start groupManager
         var beginData = {
            startTime  : startTime,
            startFP   : startFP,
            groupNumber: groupNum,
            group      : group,
            isDebug    : debugMode
         };
         ra.sendCustom ("Experiment_Begin", beginData, "admin", 1, groupNum);
         $scope.groupManagers[groupNum].startTime = startTime;
         $interval($scope.groupManagers[groupNum].update.bind($scope.groupManagers[groupNum]), CLOCK_FREQUENCY);
      }
   });

   ra.recv("To_Group_Manager", function(uid, msg){
      var groupNum = $scope.idToGroup[uid];
      $scope.groupManagers[groupNum].recvFromSubject(msg);
   });

   ra.on("pause", function() {
      ra.pause();
   });

   ra.on("resume", function() {
      ra.resume();
   });

}]);
