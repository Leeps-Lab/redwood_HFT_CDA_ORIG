Redwood.factory("MarketManager", function () {
   var api = {};

   //Creates the market manager, pass var's that you need for creation in here.
   api.createMarketManager = function(sampleArgument){
      var market = {};

      //Sample Variables
      market.sampleValue = "Market Manager says Hello World";
      market.stuff = sampleArgument;

      //Sample Function
      market.sampleFunction = function(){
         console.log(this.sampleValue);
         console.log("created with argument: " + this.stuff);
      }

      return market;
   }

   return api;

});
