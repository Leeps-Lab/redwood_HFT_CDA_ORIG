Redwood.factory("MarketManager", function () {
   var api = {};

   //Creates the market manager, pass var's that you need for creation in here.
   api.createMarketManager = function(){
      var market = {};

      market.recvMessage = function(message){
        updateMsgTime(message);

        //Code for recieving message goes here for 
      }

      market.sendMessage = function(message){
        //Assume that this function works
      }

      //array to hold bids
      market.bids = [];
      //array to hold asks
      market.asks = [];

      function comparator (a, b) {
          if (a.price == b.price) return a.timestamp > b.timestamp ? 1 : -1;
          else return a.price < b.price ? 1 : -1;
      }

      //function to insert bid into bid array
      market.insertBid = function (newBid, timestamp) {
          market.bids.push ({price : newBid, timestamp : timestamp});
          market.bids.sort (comparator);
      }

      //function to insert ask into ask array
      market.insertAsk = function (newAsk, timestamp) {
          market.asks.push ({price : newAsk, timestamp : timestamp});
          market.asks.sort (comparator);
      }

      return market;
   }

   return api;

});
