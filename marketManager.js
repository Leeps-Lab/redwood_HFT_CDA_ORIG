Redwood.factory("MarketManager", function () {
   var api = {};

   //Creates the market manager, pass var's that you need for creation in here.
   api.createMarketManager = function(){
      var market = {};

      market.CDABook = {};

      market.recvMessage = function(message){
        updateMsgTime(message);
        switch (message.msgType) {
            case "EBUY":
                market.CDABook.insertBuy (message.msgData[0], message.msgData[1], message.timestamp);
                break;
            case "ESELL":
                market.CDABook.insertSell (message.msgData[0], message.msgData[1], message.timestamp);
                break;
            case "RBUY":
                market.CDABook.removeBuy (message.msgData[0]);
                break;
            case "RSELL":
                market.CDABook.removeSell (message.msgData[0]);
                break;
            default:
                console.error("marketManager: invalid message type");
        }
      }

      market.sendMessage = function(message){
        //Assume that this function works
      }

      //array to hold buyOrders
      market.CDABook.buyOrders = [];
      //array to hold sellOrders
      market.CDABook.sellOrders = [];

      function comparator (a, b) {
          if (a.price == b.price) return a.timestamp > b.timestamp ? 1 : -1;
          else return a.price < b.price ? 1 : -1;
      }

      //inserts buy into buy orders array
      market.CDABook.insertBuy = function (newId, newPrice, timestamp) {
          market.CDABook.buyOrders.push ({id : newId, price : newPrice, timestamp : timestamp});
          market.CDABook.buyOrders.sort (comparator);
          var msg = new Message ("OUCH", 0, ["newBuyAdded", newId, newPrice]);
          market.sendMessage (msg);
          console.log("player " + newId + " inserted buy at price " + newPrice);
      }

      //inserts sell into sell orders array
      market.CDABook.insertSell = function (newId, newPrice, timestamp) {
          market.CDABook.sellOrders.push ({id : newId, price : newPrice, timestamp : timestamp});
          market.CDABook.sellOrders.sort (comparator);
          var msg = new Message ("OUCH", 0, ["newSellAdded", newId, newPrice]);
          market.sendMessage (msg);
          console.log("player " + newId + " inserted sell at price " + newPrice);
      }

      //removes buy order associated with a user id from the order book and returns it
      market.CDABook.removeBuy = function (idToRemove) {
          var index = market.CDABook.buyOrders.findIndex (function (element) {
              return element.id === idToRemove;
          });
          if (index == -1) {
             console.error("marketManager: tried to remove nonexistant buy order");
             return null;
          }
          var removed = market.CDABook.buyOrders.splice (index, 1)[0];
          var msg = new Message ("OUCH", 0, ["buyRemoved", idToRemove, removed]);
          market.sendMessage (msg);
          console.log("player " + newId + " removed buy at price " + removed);
          return removed;
      }

      //removes sell order associated with a user id from the order book and returns it
      market.CDABook.removeSell = function (idToRemove) {
          var index = market.CDABook.sellOrders.findIndex (function (element) {
              return element.id === idToRemove;
          });
          if (index == -1) {
             console.error("marketManager: tried to remove nonexistant sell order");
             return null;
          }
          var removed = market.CDABook.sellOrders.splice (index, 1)[0];
          var msg = new Message ("OUCH", 0, ["sellRemoved", idToRemove, removed]);
          market.sendMessage (msg);
          console.log("player " + newId + " removed sell at price " + removed);
          return removed;
      }

      //updates a buy order to a new price
      market.CDABook.updateBuy = function (idToUpdate, newPrice) {
          var index = market.CDABook.buyOrders.findIndex (function (element) {
              return element.id === idToUpdate;
          });
          if (index == -1) {
             console.error("marketManager: tried to update nonexistant buy order");
             return;
          }
          market.CDABook.buyOrders[index].price = newPrice;
          var msg = new Message ("OUCH", 0, ["buyUpdated", idToUpdate, newPrice]);
          market.sendMessage (msg);
      }

      //updates a sell order to a new price
      market.CDABook.updateSell = function (idToUpdate, newPrice) {
          var index = market.CDABook.sellOrders.findIndex (function (element) {
              return element.id === idToUpdate;
          });
          if (index == -1) {
             console.error("marketManager: tried to update nonexistant sell order");
             return;
          }
          market.CDABook.sellOrders[index].price = newPrice;
          var msg = new Message ("OUCH", 0, ["sellUpdated", idToUpdate, newPrice]);
          market.sendMessage (msg);
      }

      return market;
   }

   return api;

});
