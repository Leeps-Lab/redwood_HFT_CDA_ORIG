RedwoodHighFrequencyTrading.factory("MarketAlgorithm", function () {
   var api = {};

   api.createMarketAlgorithm = function(){
      var marketAlgorithm = {};
      
      marketAlgorithm.latency = 1000;
      marketAlgorithm.spread = 0;
      marketAlgorithm.fundamentalVal = 0;

      marketAlgorithm.runTest = function(){
         console.log("running test for market alg. object");
         var temp = new Message("OUCH", this.latency, "Hello World");
         console.log(temp.asString());
      }

      marketAlgorithm.sendMessage = function(message){

      }

      marketAlgorithm.enterMarket = function(){

      }

      marketAlgorithm.leaveMarket = function(){

      }

      marketAlgorithm.updateSpread = function(){

      }

      marketAlgorithm.recvMessage = function(message){

      }

      return marketAlgorithm;
   }

   return api;
});