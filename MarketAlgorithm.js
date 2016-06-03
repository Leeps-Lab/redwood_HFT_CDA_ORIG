Redwood.factory("MarketAlgorithm", function () {
   var api = {};

   api.createMarketAlgorithm = function(subjectArgs, groupManager, redwoodSend){
      var marketAlgorithm = {};

      marketAlgorithm.spread = 5;            // record of this user's spread value
      marketAlgorithm.using_speed = false;   
      marketAlgorithm.state = "state_out";   // user's state - can be "state_out", "state_maker", or "state_snipe"
      marketAlgorithm.buyEntered = false;    // flags for if this user has buy/sell orders still in the book
      marketAlgorithm.sellEntered = false;

      marketAlgorithm.myId = subjectArgs.myId;
      marketAlgorithm.groupId = subjectArgs.groupId;
      marketAlgorithm.groupManager = groupManager;   //Sends message to group manager, function obtained as parameter
      marketAlgorithm.fundementalPrice;

      marketAlgorithm.isDebug = subjectArgs.isDebug;
      if(marketAlgorithm.isDebug){
         //Create the logger for this start.js page
         marketAlgorithm.logger = new MessageLogger("Market Algorithm " + String(marketAlgorithm.myId), "#FF5555", "group-" + marketAlgorithm.groupId + "-log");
      }

      // sends a message to the group manager via direct reference
      marketAlgorithm.sendToGroupManager = function(msg){
         this.groupManager.recvFromMarketAlgorithm(msg);
      };

      // sends a message to the dataHistory object for this subject via rs.send
      marketAlgorithm.sendToDataHistory = function(msg){
         redwoodSend("To_Data_History_" + String(this.myId), msg, "admin", 1, this.groupId);
      };

      // sends out buy and sell offer for entering market
      marketAlgorithm.enterMarket = function(){
         this.sendToGroupManager(this.enterBuyOfferMsg());
         this.sendToGroupManager(this.enterSellOfferMsg());
         this.buyEntered = true;
         this.sellEntered = true;
      };

      // sends out remove buy and sell messages for exiting market
      marketAlgorithm.exitMarket = function(){
         var nMsg = new Message("OUCH", "RBUY", [this.myId] );
         nMsg.delay = !this.using_speed;
         var nMsg2 = new Message("OUCH", "RSELL", [this.myId] );
         nMsg2.delay = !this.using_speed;
         this.sendToGroupManager(nMsg);
         this.sendToGroupManager(nMsg2);
         this.buyEntered = false;
         this.sellEntered = false;
      };

      // Handle message sent to the market algorithm
      marketAlgorithm.recvFromGroupManager = function(msg){

         if(this.isDebug){
           this.logger.logRecv(msg, "Group Manager");
         }      

         // Fundemental Price Change
         if(msg.msgType === "FPC"){

            // update fundemental price variable
            this.fundementalPrice = msg.msgData[1];

            //send player state to group manager
            var nMsg3;
            if (this.state == "state_out") {
               nMsg3 = new Message ("SYNC_FP", "NONE", [this.myId, this.using_speed, [] ]);
            }
            else if (this.state == "state_maker") {
               nMsg3 = new Message ("SYNC_FP", "UOFFERS", [this.myId, this.using_speed, [] ]);
               if(this.buyEntered){
                  nMsg3.msgData[2].push(this.updateBuyOfferMsg());
               }
               if(this.sellEntered){
                  nMsg3.msgData[2].push(this.updateSellOfferMsg());
               }
            }
            else if (this.state == "state_snipe") {
               nMsg3 = new Message ("SYNC_FP", "SNIPE", [this.myId, this.using_speed, [] ]);
            }
            else {
               console.error("invalid state");
               return;
            }

            this.sendToGroupManager (nMsg3);

            // send message to data history recording price change
            var nmsg = new Message("DATA", "FPC", msg.msgData);
            this.sendToDataHistory(nmsg);
         }

         // user sent signal to change state to market maker. Need to enter market.
         if(msg.msgType === "UMAKER"){
            this.enterMarket();                 // enter market
            this.state = "state_maker";         // set state           
         }

         // user sent signal to change state to sniper
         if(msg.msgType === "USNIPE"){            
            if(this.state === "state_maker"){   // if switching from being a maker, exit the market
               this.exitMarket();
            }
            this.state = "state_snipe";         // update state
         }

         // user sent signal to change state to "out of market"
         if(msg.msgType === "UOUT"){
            if(this.state === "state_maker"){   // if switching from being a maker, exit the market
               this.exitMarket();
            }
            this.state = "state_out";           // update state
         }

         if(msg.msgType === "USPEED"){
            this.using_speed = msg.msgData[1];
            var nMsg = new Message("DATA", "C_USPEED", msg.msgData);
            this.sendToDataHistory(nMsg);
         }

         //User updated their spread
         if(msg.msgType === "UUSPR"){
            this.spread = msg.msgData[1];

            //See if there are existing orders that need to be updated
            if(this.buyEntered){
               this.sendToGroupManager(this.updateBuyOfferMsg());
            }
            if(this.sellEntered){
               this.sendToGroupManager(this.updateSellOfferMsg());
            }
         }

         // Confirmation that a buy offer has been placed in market
         if(msg.msgType == "C_EBUY"){
            if(msg.msgData[0] == this.myId){
               var nMsg = new Message("DATA", "C_EBUY", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a sell offer has been placed in market
         if(msg.msgType == "C_ESELL"){
            if(msg.msgData[0] == this.myId){
               var nMsg = new Message("DATA", "C_ESELL", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a buy offer has been removed from market
         if(msg.msgType == "C_RBUY"){
            if(msg.msgData[0] == this.myId){
               var nMsg = new Message("DATA", "C_RBUY", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a sell offer has been placed in market
         if(msg.msgType == "C_RSELL"){
            if(msg.msgData[0] == this.myId){
               var nMsg = new Message("DATA", "C_RSELL", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a buy offer has been updated
         if(msg.msgType == "C_UBUY"){
            if(msg.msgData[0] == this.myId){
               var nMsg = new Message("DATA", "C_UBUY", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a sell offer has been updated
         if(msg.msgType == "C_USELL"){
            if(msg.msgData[0] == this.myId){
               var nMsg = new Message("DATA", "C_USELL", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a transaction has taken place
         if(msg.msgType == "C_TRA"){
            if(msg.msgData[1] === this.myId){   // check if I was the buyer
               if(this.state === "state_maker"){
                  this.sendToGroupManager(this.enterBuyOfferMsg());
               }
               var profit = this.fundementalPrice - msg.msgData[3];
               var nMsg = new Message("DATA", "C_TRA", [msg.msgData[0], "buyer", profit, msg.msgData[3], this.fundementalPrice]);
               this.sendToDataHistory(nMsg);
               //console.log(nMsg);
            }
            else if(msg.msgData[2] === this.myId){   // check if I was the seller
               if(this.state === "state_maker"){
                  this.sendToGroupManager(this.enterSellOfferMsg());
               }
               var profit = msg.msgData[3] - this.fundementalPrice;
               var nMsg = new Message("DATA", "C_TRA", [msg.msgData[0], "seller", profit, msg.msgData[3], this.fundementalPrice]);
               this.sendToDataHistory(nMsg);
               //console.log(nMsg);
            }
            else {    // I wasn't involved in this transaction
              var nMsg = new Message("DATA", "C_TRA", [msg.msgData[0], "none", 0, msg.msgData[3], this.fundementalPrice]);
              this.sendToDataHistory(nMsg);
            }
         }
      };

      marketAlgorithm.enterBuyOfferMsg = function(){
         var nMsg = new Message("OUCH", "EBUY", [this.myId, this.fundementalPrice - this.spread/2, false] );
         nMsg.delay = !this.using_speed;
         return nMsg;
      };

      marketAlgorithm.enterSellOfferMsg = function(){
         var nMsg = new Message("OUCH", "ESELL", [this.myId, this.fundementalPrice + this.spread/2, false] );
         nMsg.delay = !this.using_speed;
         return nMsg;
      };

      marketAlgorithm.updateBuyOfferMsg = function(){
         var nMsg = new Message("OUCH", "UBUY", [this.myId, this.fundementalPrice - this.spread/2] );
         nMsg.delay = !this.using_speed;
         return nMsg;
      };

      marketAlgorithm.updateSellOfferMsg = function(){
         var nMsg = new Message("OUCH", "USELL", [this.myId, this.fundementalPrice + this.spread/2] );
         nMsg.delay = !this.using_speed;
         return nMsg;
      };

      return marketAlgorithm;
   };

   return api;
});
