Redwood.factory("GroupManager", function () {
   var api = {};

   api.createGroupManager = function(priceLinesArray, investorArrivalsArray, sendFunction, groupNumber, market, memberIDs){
      var groupManager = {};
      groupManager.priceChanges = priceLinesArray;
      groupManager.investorArrivals = investorArrivalsArray;
      groupManager.priceIndex = 0;
      groupManager.investorIndex = 0;
      groupManager.market = market;
      groupManager.memberIDs = memberIDs;
      groupManager.syncFpArray = [];
      groupManager.msgWaitList = [];
      groupManager.delay = 500;
      console.log(groupManager.memberIDs);

      groupManager.rssend = function (key, value) {
          sendFunction (key, value, "admin", 1, groupNumber);
      };

      //Add the logging terminal to the ui section of the html
      $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Group ' + groupNumber + ' Message Log</div><div id="group-' + groupNumber + '-log" class="terminal"></div></div>');
      groupManager.logger = new MessageLogger("Group Manager", "#5555FF", "group-" + groupNumber + "-log");

      //Initialize functions
      groupManager.sendToSubjects = function(message){
         this.rssend("From_Group_Manager", message);
      };

      // this sends message to market with specified amount of delay
      groupManager.sendToMarket = function(msg){
        
        console.log("message");
        console.log(msg.delay);

        //If no delay send msg now, otherwise push it onto wait list with tag for what time msg should be sent

        if(msg.delay){
          this.msgWaitList.push([Date.now() + this.delay, msg]);
        }
        else{
          this.market.recvMessage(msg);
        }
      };

      // maps user id to the correct index in the synchronized array
      groupManager.mapIdToIndex = function(uid){

        // look for index of memberIDs at which this id resides
        for(var i = 0; i < this.memberIDs.length; i++){
          if(uid === this.memberIDs[i]){
            return i;
          }
        }

        // error if id was not found
        console.error("No member with id:" + String(uid) + " was found in group manager.");
      };

      // check if the Synchronized Fundemental Price Change array is ready to process 
      groupManager.syncFpReady = function() {
        for(var i = 0; i < syncFpArray.length; i++){
          if(syncFpArray[i] === null){
            return false;
          }
        }
        return true;
      };

      // handles message from subject and passes it on to market algorithm
      groupManager.recvFromSubject = function(msg){
         updateMsgTime(msg);
         this.logger.logRecv(msg, "subjects");

        // if this is a user message, handle it and don't send it to market
        if(msg.protocol === "USER"){
          return;
        }

        // synchronized message in response to fundemental price change
        if(msg.protocol === "SYNC_FP"){
          this.logger.logString(String(msg.msgData[0]));
        }

        // general message that needs to be passed on to marketManager
        if(msg.protocol === "OUTCH"){
          groupManager.sendToMarket(msg);
        }

      };

      //Looks for change in fundamental price and sends message if change is found
      groupManager.update = function(){
         
        // check if msgs on wait list need to be sent
        if(this.msgWaitList.length > 0){
          while(this.msgWaitList[0][0] < Date.now()){
            console.log("sent message with delay");
            this.market.recvMessage(this.msgWaitList[0][1]);
            this.msgWaitList.shift();
            if(this.msgWaitList.length === 0){
              break;
            }
          }
        }

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
                var seller = (this.investorArrivals[this.investorIndex][1] === "sell" ? 0 : returned.id);
                var buyer = (this.investorArrivals[this.investorIndex][1] === "buy" ? 0 : returned.id);
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
