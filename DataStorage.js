// this module stores all game data for high frequency trading

Redwood.factory("DataStorage", function () {
   var api = {};

   api.createDataStorage = function (group) {
      var dataStorage = {};

      dataStorage.startTime = 0;          // experiment start time
      dataStorage.group = group;          // array containing uid of every player in this group
      dataStorage.curFundPrice = 0;       // current fundamental price. used for finding fp delta

      dataStorage.speedChanges = [];      // array of speed change events: [timestamp, speed, uid]
      dataStorage.stateChanges = [];      // array of state change events: [timestamp, state, uid]
      dataStorage.spreadChanges = [];     // array of spread change events: [timestamp, spread, uid]
      dataStorage.profitChanges = [];     // array of profit change events: [timestamp, deltaProfit, uid]
      dataStorage.investorArrivals = [];  // array of investor arrival events: [timestamp, buyOrSell]
      dataStorage.fundPriceChanges = [];  // array of fundamental price change events: [timestamp,

      dataStorage.init = function (startFP, startTime) {
         this.startTime = startTime;
         this.curFundPrice = startFP;
         this.fundPriceChanges.push([0, startFP]);

         $("#ui").append("<button id='export-btn' type='button'>Export CSV</button>");
         $("#export-btn")
            .button()
            .click(function (event) {
               console.log("she's a'workin");
            });
      };
      
      dataStorage.storeMsg = function (message) {
         switch (message.msgType) {
            case "USPEED" :
               this.storeSpeedChange(message.timeStamp, message.msgData[1] ? "YES" : "NO", message.msgData[0]);
               break;
            case "UOUT" :
               this.storeStateChange(message.timeStamp, "OUT", message.msgData[0]);
               break;
            case "UMAKER" :
               this.storeStateChange(message.timeStamp, "MAKER", message.msgData[0]);
               break;
            case "USNIPE" :
               this.storeStateChange(message.timeStamp, "SNIPE", message.msgData[0]);
               break;
            case "UUSPR" :
               this.storeSpreadChange(message.timeStamp, message.msgData[1], message.msgData[0]);
               break;
            case "C_TRA" :
               this.storeTransaction(message.timeStamp, message.msgData[1], message.msgData[2], message.msgData[3], message.msgData[4]);
               break;
            case "FPC" :
               this.storeFPC(message.timeStamp, message.msgData[1])
         }
      };

      dataStorage.storeSpeedChange = function (timestamp, speed, uid) {
         this.speedChanges.push([timestamp - this.startTime, speed, uid]);
         console.log(this.speedChanges);
      };

      dataStorage.storeStateChange = function (timestamp, state, uid) {
         this.stateChanges.push([timestamp - this.startTime, state, uid]);
         console.log(this.stateChanges);
      };

      dataStorage.storeSpreadChange = function (timestamp, spread, uid) {
         this.spreadChanges.push([timestamp - this.startTime, spread, uid]);
         console.log(this.spreadChanges);
      };

      dataStorage.storeTransaction = function (timestamp, price, fundPrice, buyer, seller) {
         if (buyer != 0) this.profitChanges.push([timestamp - this.startTime, fundPrice - price, buyer]);
         else this.investorArrivals.push([timestamp - this.startTime, "BUY"]);

         if (seller != 0) this.profitChanges.push([timestamp - this.startTime, price - fundPrice, seller]);
         else this.investorArrivals.push([timestamp - this.startTime, "SELL"]);

         console.log(this.profitChanges);
         console.log(this.investorArrivals);
      };

      dataStorage.storeFPC = function (timestamp, price) {
         this.fundPriceChanges.push([timestamp - this.startTime, this.curFundPrice - price]);
         this.curFundPrice = price;
         console.log(this.fundPriceChanges);
      };

      dataStorage.exportDataCsv = function () {
         
      };

      return dataStorage;
   };

   return api;
});