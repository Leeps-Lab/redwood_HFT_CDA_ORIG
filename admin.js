Redwood.controller("AdminCtrl",
["$rootScope",
 "$scope",
 "Admin",
 "MarketManager",
 "GroupManager",
 "$http",
 "$interval",
 function($rootScope, $scope, ra, mm, gm, $http, $interval) {
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

   $scope.groupManagers = [];

   $scope.updateGroupManagers = function() {
       $scope.groupManagers.forEach (function (entry) {
           entry.update();
       })
   }

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
      console.log(priceURL);
      $http.get(priceURL).then(function(response) {
         var rows = response.data.split("\n");

         //Parse price changes CSV
         for (var i = 0; i < rows.length-2; i++) {
            $scope.priceChanges[i] = [];
         }

         for (var i = 0; i < rows.length-2; i++) {
            if (rows[i + 1] === "") continue;
            var cells = rows[i + 1].split(",");
            for (var j = 0; j < cells.length; j++) {
               $scope.priceChanges[i][j] = parseFloat(cells[j]);
            }
         }

         console.log($scope.priceChanges);

         $scope.investorArrivals = [];
         var arrivalURL = ra.get_config(1, 0).marketEventsURL;
         console.log(arrivalURL);
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

            console.log($scope.investorArrivals);

            //create a group manager for each group and put them in an array
            var groups = ra.get_config (1, 0).groups;
            for (var currGroup = 0; currGroup < groups.length; currGroup++) {
                //just use first period for now, will have to fix for other periods later
                $scope.groupManagers[currGroup] = gm.createGroupManager ($scope.priceChanges, $scope.investorArrivals, ra.sendCustom, currGroup + 1, mm.createMarketManager());
            }

            //FOR TESTING- Produces messages that simulate changes in the fundamental value
            $("body").append('<button type="button" id="genpc" class="btn btn-default" style="margin-top:20px">Generate Price Change</button>');
            $ ("#genpc")
           .button()
           .click (function (event) {
               var newPrice = 10 + Math.random()*10;
               var msg = new Message("ITCH", "FPC", [Date.now(), newPrice]);
               console.log(msg.asString);
               ra.sendCustom("From_Group_Manager", msg, 0, 1, 1);
           })
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

   ra.recv ("start_group", function(uid) {
       $scope.groupManagers[ra.groups[uid] - 1].startExperiment();
   });

   ra.on ("Experiment_Begin", function (msg) {
       //for some reason, groupManagers.update's this value is the window instead of the groupManager object
       //fixing it for now with bind
       $interval($scope.groupManagers[msg.group - 1].update.bind($scope.groupManagers[msg.group - 1]), CLOCK_FREQUENCY);
   });

   ra.recv ("To_Group_Manager", function (uid, msg) {
       $scope.groupManagers[ra.groups[uid] - 1].recvFromSubject (msg);
   });

   ra.on("pause", function() {
      ra.pause();
   });

   ra.on("resume", function() {
      ra.resume();
   });

}]);
