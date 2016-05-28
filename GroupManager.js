Redwood.factory("GroupManager", function () {
   var api = {};

   api.createGroupManager = function(priceLinesArray, investorArrivalsArray, sendFunction, groupNumber, memberIDs, debugMode){
      var groupManager = {};

      groupManager.marketAlgorithms = {};   // reference to all market algorithms in this group, mapped by subject id ---> marketAlgorithms[subjectID]
      groupManager.market = {};             // reference to the market object for this group
      
      groupManager.priceChanges = priceLinesArray;            // array of all price changes that will occur
      groupManager.investorArrivals = investorArrivalsArray;  // array of all investor arrivals that will occur
      groupManager.priceIndex = 0;                            // index of last price index to occur
      groupManager.investorIndex = 0;                         // index of last investor arrival to occur
      
      groupManager.memberIDs = memberIDs;   // array that contains id number for each subject in this group
      groupManager.syncFpArray = [];        // buffer that holds onto messages until recved msg from all subjects
      groupManager.msgWaitList = [];        // buffer that holds onto outgoing messages for an amount of delay to simulate latency
      groupManager.delay = 500;             // # of milliseconds that will be delayed by latency simulation

      groupManager.syncFPArray = new synchronizeArray(groupManager.memberIDs);
      groupManager.FPMsgList = [];

      groupManager.debugMode = debugMode;   //indicates if message logger should be used

      if(debugMode){
        // add the logging terminal to the ui section of the html
        $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Group ' + groupNumber + ' Message Log</div><div id="group-' + groupNumber + '-log" class="terminal"></div></div>');
        groupManager.logger = new MessageLogger("Group Manager " + String(groupNumber), "#5555FF", "group-" + groupNumber + "-log");
      }

      // wrapper for the redwood send function
      groupManager.rssend = function (key, value) {
        sendFunction (key, value, "admin", 1, groupNumber);
      };

      // sends a message to all of the market algorithms in this group
      groupManager.sendToMarketAlgorithms = function(msg){
        for(var memberID of this.memberIDs){
          this.marketAlgorithms[memberID].recvFromGroupManager(msg);
        }
      };

      // recv a message from a single market algorithm in this group
      groupManager.recvFromMarketAlgorithm = function(msg){
        
        if(this.debugMode){
          this.logger.logRecv(msg, "Market Algorithm");
        }

        // synchronized message in response to fundemental price change
        if(msg.protocol === "SYNC_FP"){

          //mark that this user sent msg
          this.syncFPArray.markReady(msg.msgData[0]);
          this.FPMsgList.push(msg);

          // check if every user has sent a response
          if(this.syncFPArray.allReady()){

            console.log(this.FPMsgList);

            // shuffle the order of messages sitting in the arrays
            var indexOrder = this.getRandomMsgOrder(this.FPMsgList.length);
            console.log(indexOrder);
            //this.FPMsgList = this.FPMsgList.shuffle();

            console.log(this.FPMsgList);

            // send msgs in new shuffled order
            for(var index of indexOrder){
              for(var rmsg of this.FPMsgList[index].msgData[2]){
                console.log(rmsg);
                this.sendToMarket(rmsg);
              }
            }

            // reset arrays for the next fundemental price change
            this.FPMsgList = [];
            this.syncFPArray = new synchronizeArray(this.memberIDs);
          }
        }

        // general message that needs to be passed on to marketManager
        if(msg.protocol === "OUTCH"){
          groupManager.sendToMarket(msg);
        }
      };

      // this sends message to market with specified amount of delay
      groupManager.sendToMarket = function(msg){
        //If no delay send msg now, otherwise push it onto wait list with tag for what time msg should be sent
        if(msg.delay){
          this.msgWaitList.push([Date.now() + this.delay, msg]);
        }
        else{
          this.market.recvMessage(msg);
        }
      };

      // handles a message from the market
      groupManager.recvFromMarket = function(msg){
        
        if(this.debugMode){
          this.logger.logRecv(msg, "Market");
        }

        switch (msg.msgType){
          case "C_EBUY"  :
          case "C_ESELL" :
          case "C_RBUY"  :
          case "C_RSELL" :
          case "C_UBUY"  :
          case "C_USELL" : this.marketAlgorithms[msg.msgData[0]].recvFromGroupManager(msg); break;
          case "C_TRA"   : this.sendToMarketAlgorithms(msg);
        }
      };

      // handles message from subject and passes it on to market algorithm
      groupManager.recvFromSubject = function(msg){
         
        if(this.debugMode){
          this.logger.logRecv(msg, "Subjects");
        }

        // if this is a user message, handle it and don't send it to market
        if(msg.protocol === "USER"){
          var subjectID = msg.msgData[0];
          this.marketAlgorithms[subjectID].recvFromGroupManager(msg);
        }
      };

      // creates an array from 0 to size-1 that are shuffled in random order
      groupManager.getRandomMsgOrder = function(size){
        
        // init indices from 0 to size-1
        var indices = [];
        var rand;
        var temp;
        for(var i = 0; i < size; i++){ indices.push(i); }

        // shuffle
        for(i = size-1; i > 0; i--){
          rand = Math.floor(Math.random() * size);
          temp = indices[i];
          indices[i] = indices[rand];
          indices[rand] = temp;
        }
        return indices;
      };

      //Looks for change in fundamental price and sends message if change is found
      groupManager.update = function(){

        // check if msgs on wait list need to be sent
        if(this.msgWaitList.length > 0){
          while(this.msgWaitList[0][0] < Date.now()){
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
            this.sendToMarketAlgorithms(msg);
            this.priceIndex++;
         }

         while(this.investorIndex < this.investorArrivals.length
               && Date.now() > this.investorArrivals[this.investorIndex][0] + this.startTime) {
            var returned = this.market.makeTransaction (this.investorArrivals[this.investorIndex][1]);
            if (returned !== undefined) {
                var seller = (this.investorArrivals[this.investorIndex][1] === "sell" ? 0 : returned.id);
                var buyer = (this.investorArrivals[this.investorIndex][1] === "buy" ? 0 : returned.id);
                var msg = new Message ("ITCH", "C_TRA", [returned.timestamp, buyer, seller, returned.price]);
                this.sendToMarketAlgorithms(msg);
            }
            this.investorIndex++;
         }
      };

      return groupManager;
   };

   return api;
});
