RedwoodHighFrequencyTrading.factory("MarketAlgorithm", function () {
   var api = {};

   api.createMarketAlgorithm = function(uid, sendToSubjectManager, dataHistory){
      var marketAlgorithm = {};
      
      marketAlgorithm.latency = 1000;
      marketAlgorithm.spread = 5;   //NEEDS TO UPDATED BY SPREAD
      //Create the logger for this start.js page
      marketAlgorithm.logger = new MessageLogger("Market Algorithm", "#FF5555", "subject-log");
      marketAlgorithm.uid = uid;
      marketAlgorithm.sendToSubjectManager = sendToSubjectManager;   //Sends message to subject manager, function obtained as parameter
      marketAlgorithm.fundementalPrice = 15;   //TODO: THIS NEEDS TO BE SET BY START MESSAGE
      marketAlgorithm.dataHistory = dataHistory;

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
            dataHistory.recordFPCchange(msg);
            this.fundementalPrice = msg.msgData[1];

            //See if there are existing orders that need to be updated
            if(this.dataHistory.curBuyOffer != null){
               var nMsg = new Message("OUTCH", "UBUY", [this.uid, this.fundementalPrice - this.spread/2] );
               this.sendMessage(nMsg);
            }
            if(this.dataHistory.curSellOffer != null){
               var nMsg2 = new Message("OUTCH", "USELL", [this.uid, this.fundementalPrice + this.spread/2] );
               this.sendMessage(nMsg2);
            }
         }

         // User Sent Signal to Enter Market
         if(msg.msgType == "UENTM"){
            var nMsg = new Message("OUTCH", "EBUY", [this.uid, this.fundementalPrice - this.spread/2] );
            var nMsg2 = new Message("OUTCH", "ESELL", [this.uid, this.fundementalPrice + this.spread/2] );
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

         //User updated their spread
         if(msg.msgType == "UUSPR"){
            this.spread = msg.msgData[0];

            //See if there are existing orders that need to be updated
            if(this.dataHistory.curBuyOffer != null){
               var nMsg = new Message("OUTCH", "UBUY", [this.uid, this.fundementalPrice - this.spread/2] );
               this.sendMessage(nMsg);
            }
            if(this.dataHistory.curSellOffer != null){
               var nMsg2 = new Message("OUTCH", "USELL", [this.uid, this.fundementalPrice + this.spread/2] );
               this.sendMessage(nMsg2);
            }
         }

         // Confirmation that a buy offer has been placed in market
         if(msg.msgType == "C_EBUY"){
            if(msg.msgData[0] == this.uid){
               this.logger.logString("My buy offer confirmed at time: " + millisToTime(msg.msgData[2]) );
               this.dataHistory.recordBuyOffer(msg);
            }
         }

         // Confirmation that a sell offer has been placed in market
         if(msg.msgType == "C_ESELL"){
            if(msg.msgData[0] == this.uid){
               this.logger.logString("My sell offer confirmed at time: " + millisToTime(msg.msgData[2]) );
               this.dataHistory.recordSellOffer(msg);
            }
         }

         // Confirmation that a buy offer has been removed from market
         if(msg.msgType == "C_RBUY"){
            if(msg.msgData[0] == this.uid){
               this.logger.logString("My buy offer removed at time: " + millisToTime(msg.msgData[1]) );
               this.dataHistory.storeBuyOffer(msg.msgData[1]);
            }
         }

         // Confirmation that a sell offer has been placed in market
         if(msg.msgType == "C_RSELL"){
            if(msg.msgData[0] == this.uid){
               this.logger.logString("My sell offer removed at time: " + millisToTime(msg.msgData[1]) );
               this.dataHistory.storeSellOffer(msg.msgData[1]);
            }
         }

         // Confirmation that a buy offer has been updated
         if(msg.msgType == "C_UBUY"){
            if(msg.msgData[0] == this.uid){
               this.logger.logString("My buy offer updated at time: " + millisToTime(msg.msgData[2]) );
               this.dataHistory.recordBuyOffer(msg);
            }
         }

         // Confirmation that a sell offer has been updated
         if(msg.msgType == "C_USELL"){
            if(msg.msgData[0] == this.uid){
               this.logger.logString("My sell offer updated at time: " + millisToTime(msg.msgData[2]) );
               this.dataHistory.recordSellOffer(msg);
            }
         }


      }

      return marketAlgorithm;
   }

   return api;
});