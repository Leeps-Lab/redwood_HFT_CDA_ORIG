// this module stores all game data for high frequency trading

Redwood.factory("DataStorage", function () {
   var api = {};

   api.createDataStorage = function (group, groupNum) {
      var dataStorage = {};

      dataStorage.startTime = 0;          // experiment start time
      dataStorage.group = group;          // array containing uid of every player in this group
      dataStorage.groupNum = groupNum;    // identifier for this group
      dataStorage.curFundPrice = 0;       // current fundamental price. used for finding fp delta

      dataStorage.speedChanges = [];      // array of speed change events: [timestamp, speed, uid]
      dataStorage.stateChanges = [];      // array of state change events: [timestamp, state, uid]
      dataStorage.spreadChanges = [];     // array of spread change events: [timestamp, spread, uid]
      dataStorage.profitChanges = [];     // array of profit change events: [timestamp, deltaProfit, uid]
      dataStorage.investorArrivals = [];  // array of investor arrival events: [timestamp, buyOrSell]
      dataStorage.fundPriceChanges = [];  // array of fundamental price change events: [timestamp, deltaPrice]

      dataStorage.init = function (startFP, startTime) {
         this.startTime = startTime;
         this.curFundPrice = startFP;
         this.fundPriceChanges.push([0, startFP]);

         $("#ui").append("<button id='export-btn-" + groupNum + "' type='button'>Export Group " + this.groupNum + " CSV</button>");
         $("#export-btn-" + groupNum)
            .button()
            .click(function () {
               dataStorage.exportDataCsv();
            });
      };
      
      dataStorage.storeMsg = function (message) {
         switch (message.msgType) {
            case "USPEED" :
               this.storeSpeedChange(message.msgData[2], message.msgData[1] ? "YES" : "NO", message.msgData[0]);
               break;
            case "UOUT" :
               this.storeStateChange(message.msgData[1], "OUT", message.msgData[0]);
               break;
            case "UMAKER" :
               this.storeStateChange(message.msgData[1], "MAKER", message.msgData[0]);
               break;
            case "USNIPE" :
               this.storeStateChange(message.msgData[1], "SNIPE", message.msgData[0]);
               break;
            case "UUSPR" :
               this.storeSpreadChange(message.msgData[2], message.msgData[1], message.msgData[0]);
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
      };

      dataStorage.storeStateChange = function (timestamp, state, uid) {
         this.stateChanges.push([timestamp - this.startTime, state, uid]);
      };

      dataStorage.storeSpreadChange = function (timestamp, spread, uid) {
         this.spreadChanges.push([timestamp - this.startTime, spread, uid]);
      };

      dataStorage.storeTransaction = function (timestamp, price, fundPrice, buyer, seller) {
         if (buyer != 0) this.profitChanges.push([timestamp - this.startTime, fundPrice - price, buyer]);
         else this.investorArrivals.push([timestamp - this.startTime, "BUY"]);

         if (seller != 0) this.profitChanges.push([timestamp - this.startTime, price - fundPrice, seller]);
         else this.investorArrivals.push([timestamp - this.startTime, "SELL"]);
      };

      dataStorage.storeFPC = function (timestamp, price) {
         this.fundPriceChanges.push([timestamp - this.startTime, this.curFundPrice - price]);
         this.curFundPrice = price;
      };

      // function to combine all data into one big array and download it as a CSV
      dataStorage.exportDataCsv = function () {
         var data = [];

         // associative array to map each player to a unique index
         var playerToIndex = {};
         for (let index = 0; index < this.group.length; index++) {
            playerToIndex[this.group[index]] = index;
         }

         // 4 columns for each player + timestamp, delta value and investors
         var numColumns = this.group.length * 4 + 3;

         // iterate through every entry in each storage array

         // add speed changes to data array
         for (let entry of this.speedChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 4 + 3] = entry[1];

            data.push(row);
         }

         // add state changes to data array
         for (let entry of this.stateChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 4 + 1] = entry[1];

            data.push(row);
         }

         // add spread changes to data array
         for (let entry of this.spreadChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 4 + 2] = entry[1];

            data.push(row);
         }

         // add profit changes to data array
         for (let entry of this.profitChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 4 + 4] = entry[1];

            data.push(row);
         }

         // add investor changes to data array
         for (let entry of this.investorArrivals) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[numColumns - 1] = entry[1];

            data.push(row);
         }

         // add fundamental price changes to data array
         for (let entry of this.fundPriceChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[numColumns - 2] = entry[1];

            data.push(row);
         }

         // sort data by timestamp
         data.sort(function (a, b) {
            return a[0] - b[0];
         });

         // combine rows with same timestamp
         var loopAgain = true;
         while(loopAgain) {
            loopAgain = false;
            for (let index = 1; index < data.length; index++) {
               if (data[index][0] === data[index - 1][0]) {
                  loopAgain = true;
                  for (let index2 = 0; index2 < data[index].length; index2++) {
                     if (data[index][index2] !== null) {
                        data[index - 1][index2] = data[index][index2];
                     }
                  }
                  data.splice(index, 1);
               }
            }
         }

         // set up headings for each row
         data.unshift(["timestamp"]);
         for (let index = 0; index < this.group.length; index++) {
            data[0].push("status_p" + this.group[index], "spread_p" + this.group[index], "speed_p" + this.group[index], "dprofit_p" + this.group[index]);
         }
         data[0].push("dvalue", "investor_buy_sell");

         // download data 2d array as csv
         // stolen from stackoverflow
         var csvRows = [];
         for (let index = 0; index < data.length; index++) {
            csvRows.push(data[index].join(','));
         }
         var csvString = csvRows.join("\n");
         var a = document.createElement('a');
         a.href = 'data:attachment/csv,' + encodeURIComponent(csvString);
         a.target = '_blank';
         a.download = 'group_' + this.groupNum + '.csv';

         document.body.appendChild(a);
         a.click();
      };

      return dataStorage;
   };

   return api;
});