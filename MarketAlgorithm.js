RedwoodHighFrequencyTrading.factory("MarketAlgorithm", function () {
   var api = {};

   api.createMarketAlgorithm = function(uid, sendToSubjectManager){
      var marketAlgorithm = {};
      
      marketAlgorithm.latency = 1000;
      marketAlgorithm.spread = 0;
      marketAlgorithm.fundamentalVal = 0;
      //Create the logger for this start.js page
      marketAlgorithm.logger = new MessageLogger("Market Algorithm", "#FF5555", "subject-log");
      marketAlgorithm.uid = uid;
      marketAlgorithm.sendToSubjectManager = sendToSubjectManager;   //Sends message to subject manager, function obtained as parameter

      marketAlgorithm.runTest = function(){
         console.log("running test for market alg. object");
         var temp = new Message("OUCH", this.latency, "Hello World");
         console.log(temp.asString());
      }

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

      marketAlgorithm.recvMessage = function(msg){
         this.logger.logRecv(msg, "Subject Manager");
         var outmsg = new Message("OUCH", 0, "Subject" + String(uid) + " acknowledges price change");
         this.sendMessage(outmsg);
      }

      return marketAlgorithm;
   }

   return api;
});