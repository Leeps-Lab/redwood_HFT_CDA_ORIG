RedwoodHighFrequencyTrading.factory("MarketAlgorithm", function () {
   var api = {};

   api.createMarketAlgorithm = function(uid, sendToSubjectManager){
      var marketAlgorithm = {};
      
      marketAlgorithm.latency = 1000;
      marketAlgorithm.spread = 5;   //NEEDS TO UPDATED BY SPREAD
      marketAlgorithm.fundamentalVal = 0;
      //Create the logger for this start.js page
      marketAlgorithm.logger = new MessageLogger("Market Algorithm", "#FF5555", "subject-log");
      marketAlgorithm.uid = uid;
      marketAlgorithm.sendToSubjectManager = sendToSubjectManager;   //Sends message to subject manager, function obtained as parameter
      marketAlgorithm.fundamentalVal = 15;   //TODO: THIS NEEDS TO BE SET BY START MESSAGE

      marketAlgorithm.sendMessage = function(msg){
         this.logger.logSend(msg, "Subject Manager");
         this.sendToSubjectManager(msg);
      }

      marketAlgorithm.enterMarket = function(){

      }

      marketAlgorithm.leaveMarket = function(){

      }

      marketAlgorithm.updateSpread = function(){

      }

      // Handle message sent to the market algorithm
      marketAlgorithm.recvMessage = function(msg){
         this.logger.logRecv(msg, "Subject Manager");
         
         // Fundemental Price Change
         if(msg.msgType == "FPC"){
            this.logger.logString(msg.msgData);
         }

         // User Sent Signal to Enter Market
         if(msg.msgType == "UENTM"){
            var nMsg = new Message("OUTCH", "EBUY", [this.uid, this.fundamentalVal - this.spread/2] );
            var nMsg2 = new Message("OUTCH", "ESELL", [this.uid, this.fundamentalVal + this.spread/2] );
            this.sendMessage(nMsg);
            this.sendMessage(nMsg2);
         }

         // User Sent Signal to Exit Market
         if(msg.msgType == "UEXTM"){
            var nMsg = new Message("OUTCH", "RBUY", [this.uid] );
            var nMsg2 = new Message("OUTCH", "RSELL", [this.uid] );
            this.sendMessage(nMsg);
            this.sendMessage(nMsg2);
         }

         if(msg.msgType == "C_EBUY"){
            if(msg.msgData[0] == this.uid){
               this.logger.logString("Confirmed buy at time: " + millisToTime(msg.msgData[2]) );
            }
         }
      }

      return marketAlgorithm;
   }

   return api;
});