Redwood.factory("MarketManager", function () {
   var api = {};

   //Creates the market manager, pass var's that you need for creation in here.
   api.createMarketManager = function(sendFunction, groupNumber, groupManager){
      var market = {};

      market.CDABook = {};
      market.groupManager = groupManager;
      market.logger = new MessageLogger("Market " + String(groupNumber), "#55FF55", "group-" + groupNumber + "-log");


      // captures the redwood admin send function
      market.rssend = function (key, value) {
          sendFunction (key, value, "admin", 1, groupNumber);
      };

      // abstracts send function so that there is single msg argument
      market.sendToGroupManager = function(message){
         this.groupManager.recvFromMarket(message);
      };

      // handle message from subjects
      market.recvMessage = function(message){
        message.timestamp = Date.now();
        this.logger.logRecv(message, "Group Manager");

        // handle message based on type. Send reply once message has been handled
        switch (message.msgType) {

            // enter buy offer
            case "EBUY":
                market.CDABook.insertBuy (message.msgData[0], message.msgData[1], message.timestamp);
                var msg = new Message("ITCH", "C_EBUY", [message.msgData[0], message.msgData[1], Date.now()]);
                this.sendToGroupManager(msg);
                break;

            // enter sell offer
            case "ESELL":
                market.CDABook.insertSell (message.msgData[0], message.msgData[1], message.timestamp);
                var msg = new Message("ITCH", "C_ESELL", [message.msgData[0], message.msgData[1], Date.now()]);
                this.sendToGroupManager(msg);
                break;

            // remove buy offer
            case "RBUY":
                market.CDABook.removeBuy (message.msgData[0]);
                var msg = new Message("ITCH", "C_RBUY", [message.msgData[0], Date.now()]);
                this.sendToGroupManager(msg);
                break;

            // remove sell offer
            case "RSELL":
                market.CDABook.removeSell (message.msgData[0]);
                var msg = new Message("ITCH", "C_RSELL", [message.msgData[0], Date.now()]);
                this.sendToGroupManager(msg);
                break;

            // update buy offer
            case "UBUY":
                market.CDABook.updateBuy (message.msgData[0], message.msgData[1]);
                var msg = new Message("ITCH", "C_UBUY", [message.msgData[0], message.msgData[1], Date.now()]);
                this.sendToGroupManager(msg);
                break;

            // update sell offer
            case "USELL":
                market.CDABook.updateSell (message.msgData[0], message.msgData[1]);
                var msg = new Message("ITCH", "C_USELL", [message.msgData[0], message.msgData[1], Date.now()]);
                this.sendToGroupManager(msg);
                break;

            // message not recognized
            default:
                console.error("marketManager: invalid message type:" + message.msgType);
        }
      };

      market.makeTransaction = function (transactionType) {
          if (transactionType === 0) {
              return market.CDABook.buyOrders.pop();
          }
          else if (transactionType === 1){
              return market.CDABook.sellOrders.pop();
          }
          else console.error("marketManager: tried to make invalid transaction type");
      };

      //array to hold buyOrders
      market.CDABook.buyOrders = [];
      //array to hold sellOrders
      market.CDABook.sellOrders = [];

      function sellComparator (a, b) {
          if (a.price == b.price) return a.timestamp > b.timestamp ? 1 : -1;
          else return a.price < b.price ? 1 : -1;
      }

      function buyComparator (a, b) {
          if (a.price == b.price) return a.timestamp > b.timestamp ? 1 : -1;
          else return a.price > b.price ? 1 : -1;
      }

      //inserts buy into buy orders array
      market.CDABook.insertBuy = function (newId, newPrice, timestamp) {
          market.CDABook.buyOrders.push ({id : newId, price : newPrice, timestamp : timestamp});
          market.CDABook.buyOrders.sort (buyComparator);
          console.log("player " + newId + " inserted buy at price " + newPrice);
          console.log(market.CDABook.buyOrders);
      }

      //inserts sell into sell orders array
      market.CDABook.insertSell = function (newId, newPrice, timestamp) {
          market.CDABook.sellOrders.push ({id : newId, price : newPrice, timestamp : timestamp});
          market.CDABook.sellOrders.sort (sellComparator);
          console.log("player " + newId + " inserted sell at price " + newPrice);
          console.log(market.CDABook.sellOrders);
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
          console.log("player " + idToRemove + " removed buy at price " + removed);
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
          console.log("player " + idToRemove + " removed sell at price " + removed);
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
          console.log("player " + idToUpdate + " updated buy to " + newPrice);
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
          console.log("player " + idToUpdate + " updated sell to " + newPrice);
      }

      return market;
   }

   return api;

});
