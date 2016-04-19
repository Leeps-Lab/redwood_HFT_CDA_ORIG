Redwood.factory("GroupManager", function () {
   var api = {};

   api.createGroupManager = function(priceLinesArray, investorArrivalsArray, sendFunction, groupNumber, market, memberIDs){
      var groupManager = {};
      groupManager.priceChanges = priceLinesArray;
      groupManager.investorArrivals = investorArrivalsArray;
      groupManager.outBoundMessages = [];
      groupManager.inBoundMessages = [];
      groupManager.priceIndex = 0;
      groupManager.investorIndex = 0;
      groupManager.market = market;
      groupManager.memberIDs = memberIDs;
      groupManager.priceChangeStates = [];

      groupManager.rssend = function (key, value) {
          sendFunction (key, value, "admin", 1, groupNumber);
      };

      //Add the logging terminal to the ui section of the html
      $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Group ' + groupNumber + ' Message Log</div><div id="group-' + groupNumber + '-log" class="terminal"></div></div>');
      groupManager.logger = new MessageLogger("Group Manager", "#5555FF", "group-" + groupNumber + "-log");

      //changed to accept a pre-processed price changes array

      //Initialize functions
      groupManager.sendToSubjects = function(message){
         this.rssend("From_Group_Manager", message);
      };

      groupManager.recvFromSubject = function(msg){
         updateMsgTime(msg);
         this.logger.logRecv(msg, "subjects");

         //if this is a user message, handle it and don't send it to market
         if(msg.protocol == "USER"){
            return;
          }

         if(msg.msgType == "FPC_S") {
             if (groupManager.priceChangeStates[msg.msgData[1]] === undefined) groupManager.priceChangeStates[msg.msgData[1]] = [];
            groupManager.priceChangeStates[msg.msgData[1]].push(msg.msgData[0]);
            if (groupManager.priceChangeStates[msg.msgData[1]].length == groupManager.memberIDs.length) console.log("GroupManager received all FPC states");
            console.log(groupManager.priceChangeStates[msg.msgData[1]]);
         }

         //FOR TESTING ONLY
         if(msg.msgType == "EBUY"){
            var nMsg = new Message("ITCH", "C_EBUY", [msg.msgData[0], msg.msgData[1], Date.now()]);
            this.sendToSubjects(nMsg);
         }
         //FOR TESTING ONLY
         if(msg.msgType == "ESELL"){
            var nMsg = new Message("ITCH", "C_ESELL", [msg.msgData[0], msg.msgData[1], Date.now()]);
            this.sendToSubjects(nMsg);
         }
         //FOR TESTING ONLY
         if(msg.msgType == "RBUY"){
            var nMsg = new Message("ITCH", "C_RBUY", [msg.msgData[0], Date.now()]);
            this.sendToSubjects(nMsg);
         }
         //FOR TESTING ONLY
         if(msg.msgType == "RSELL"){
            var nMsg = new Message("ITCH", "C_RSELL", [msg.msgData[0], Date.now()]);
            this.sendToSubjects(nMsg);
         }
         //FOR TESTING ONLY
         if(msg.msgType == "UBUY"){
            var nMsg = new Message("ITCH", "C_UBUY", [msg.msgData[0], msg.msgData[1], Date.now()]);
            this.sendToSubjects(nMsg);

         }
         else{

           groupManager.market.recvMessage (msg);

           //FOR TESTING ONLY
           if(msg.msgType == "EBUY"){
              var nMsg = new Message("ITCH", "C_EBUY", [msg.msgData[0], msg.msgData[1], Date.now()]);
              this.sendToSubjects(nMsg);
           }
           //FOR TESTING ONLY
           if(msg.msgType == "ESELL"){
              var nMsg = new Message("ITCH", "C_ESELL", [msg.msgData[0], msg.msgData[1], Date.now()]);
              this.sendToSubjects(nMsg);
           }
           //FOR TESTING ONLY
           if(msg.msgType == "RBUY"){
              var nMsg = new Message("ITCH", "C_RBUY", [msg.msgData[0], Date.now()]);
              this.sendToSubjects(nMsg);
           }
           //FOR TESTING ONLY
           if(msg.msgType == "RSELL"){
              var nMsg = new Message("ITCH", "C_RSELL", [msg.msgData[0], Date.now()]);
              this.sendToSubjects(nMsg);
           }
           //FOR TESTING ONLY
           if(msg.msgType == "UBUY"){
              var nMsg = new Message("ITCH", "C_UBUY", [msg.msgData[0], msg.msgData[1], Date.now()]);
              this.sendToSubjects(nMsg);
           }
           //FOR TESTING ONLY
           if(msg.msgType == "USELL"){
              var nMsg = new Message("ITCH", "C_USELL", [msg.msgData[0], msg.msgData[1], Date.now()]);
              this.sendToSubjects(nMsg);
           }
         }
      };

      //Looks for change in fundamental price and sends message if change is found
      groupManager.update = function(){
         while(this.priceIndex < this.priceChanges.length
               && Date.now() > this.priceChanges[this.priceIndex][0] + this.startTime) {
            var msg = new Message("ITCH", "FPC", [Date.now(), this.priceChanges[this.priceIndex][1], this.priceIndex]);
            this.logger.logSend(msg, "subjects");
            this.rssend("From_Group_Manager", msg);
            this.priceIndex++;
         }

         while(this.investorIndex < this.investorArrivals.length
               && Date.now() > this.investorArrivals[this.investorIndex][0] + this.startTime) {
            var returned = market.makeTransaction (this.investorArrivals[this.investorIndex][1])
            if (returned !== undefined) {
                var seller = (this.investorArrivals[this.investorIndex][1] == "sell" ? 0 : returned.id);
                var buyer = (this.investorArrivals[this.investorIndex][1] == "buy" ? 0 : returned.id);
                var msg = new Message ("ITCH", "C_TRA", [returned.timestamp, buyer, seller, returned.price]);
                this.logger.logSend(msg, "subjects");
                this.rssend("From_Group_Manager", msg);
            }
            this.investorIndex++;
         }
      };

      //function to send out the message that starts the experiment
      groupManager.startExperiment = function() {
          groupManager.startTime = Date.now();
          var msg = {time : groupManager.startTime, group : groupNumber};
          groupManager.rssend("Experiment_Begin", msg);
      };

      return groupManager;
   }

   return api;
});
