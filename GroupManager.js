Redwood.factory("GroupManager", function () {
   var api = {};

   api.createGroupManager = function(priceLinesArray, investorArrivalsArray, sendFunction, groupNumber, market){
      var groupManager = {};
      console.log(investorArrivalsArray);
      groupManager.priceChanges = priceLinesArray;
      groupManager.investorArrivals = investorArrivalsArray;
      groupManager.outBoundMessages = [];
      groupManager.inBoundMessages = [];
      groupManager.priceIndex = 0;
      groupManager.investorIndex = 0;
      groupManager.market = market;

      groupManager.rssend = function (key, value) {
          sendFunction (key, value, "admin", 1, groupNumber);
      }

      //Add the logging terminal to the ui section of the html
      $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Group ' + groupNumber + ' Message Log</div><div id="group-' + groupNumber + '-log" class="terminal"></div></div>');
      groupManager.logger = new MessageLogger("Group Manager", "#5555FF", "group-" + groupNumber + "-log");

      //changed to accept a pre-processed price changes array

      //Initialize functions
      groupManager.sendToSubjects = function(message){
         this.rssend("From_Group_Manager", message);
      }

      groupManager.recvFromSubject = function(msg){
         updateMsgTime(msg);
         this.logger.logRecv(msg, "subjects");
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

      //Looks for change in fundamental price and sends message if change is found
      groupManager.update = function(){
         while(this.priceIndex < this.priceChanges.length
               && Date.now() > this.priceChanges[this.priceIndex][0] + this.startTime) {
            var msg = new Message("ITCH", "FPC", [this.priceChanges[this.priceIndex][0], this.priceChanges[this.priceIndex][1]]);
            this.logger.logSend(msg, "subjects");
            this.rssend("From_Group_Manager", msg);
            this.priceIndex++;
         }

         while(this.investorIndex < this.investorArrivals.length
               && Date.now() > this.investorArrivals[this.investorIndex][0] + this.startTime) {
            var investorType = this.investorArrivals[this.investorIndex][1] == "buy" ? "EBUY" : "ESELL";
            var msg = new Message("OUCH", investorType, [0, this.investorArrivals[this.investorIndex][1]]);
            groupManager.market.recvMessage(msg);
            this.investorIndex++;
         }
      }

      //function to send out the message that starts the experiment
      groupManager.startExperiment = function() {
          groupManager.startTime = Date.now();
          var msg = {time : groupManager.startTime, group : groupNumber};
          groupManager.rssend("Experiment_Begin", msg);
      }

      return groupManager;
   }

   return api;
});
