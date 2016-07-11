// this module stores all game data for high frequency trading

Redwood.factory("DataStorage", function () {
   var api = {};

   api.createDataStorage = function (group, groupNum) {
      var dataStorage = {};

      dataStorage.startTime = 0;          // experiment start time
      dataStorage.group = group;          // array containing uid of every player in this group
      dataStorage.groupNum = groupNum;    // identifier for this group
      dataStorage.curFundPrice = 0;       // current fundamental price. used for finding fp delta
      dataStorage.curProfits = [];         // current cumulative profits for each player

      dataStorage.speedChanges = [];      // array of speed change events: [timestamp, speed, uid]
      dataStorage.stateChanges = [];      // array of state change events: [timestamp, state, uid]
      dataStorage.spreadChanges = [];     // array of spread change events: [timestamp, spread, uid]
      dataStorage.profitChanges = [];     // array of profit change events: [timestamp, deltaProfit, cumProfits, uid]
      dataStorage.investorArrivals = [];  // array of investor arrival events: [timestamp, buyOrSell]
      dataStorage.fundPriceChanges = [];  // array of fundamental price change events: [timestamp, deltaPrice, cumPrice]
      dataStorage.playerOrders = [];     // array of player order lists [timestamp, [player order]]
      dataStorage.buyOrderChanges = [];   // array of changes in the buy order book [timestamp, [buy order book]]
      dataStorage.sellOrderChanges = [];  // array of changes in the sell order book [timestamp, [sell order book]]

      dataStorage.init = function (startFP, startTime, startingWealth) {
         this.startTime = startTime;
         this.curFundPrice = startFP;
         this.fundPriceChanges.push([0, startFP, startFP]);
         this.investorArrivals.push([0, "NA"]);
         this.buyOrderChanges.push([0, []]);
         this.sellOrderChanges.push([0, []]);

         for (let user of this.group) {
            this.speedChanges.push([0, "NO", user]);
            this.stateChanges.push([0, "OUT", user]);
            this.spreadChanges.push([0, 5, user]);
            this.profitChanges.push([0, 0, startingWealth, user]);

            this.curProfits[user] = startingWealth;
         }

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

      dataStorage.storePlayerOrder = function (timestamp, order) {
         this.playerOrders.push([timestamp - this.startTime, order]);
      };

      dataStorage.storeMarketState = function (timestamp, orderBook) {
         this.buyOrderChanges.push([timestamp - this.startTime, $.extend(true, [], orderBook.buyContracts)]);
         this.sellOrderChanges.push([timestamp - this.startTime, $.extend(true, [], orderBook.sellContracts)]);
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
         if (buyer != 0) {
            this.curProfits[buyer] += fundPrice - price;
            this.profitChanges.push([timestamp - this.startTime, fundPrice - price, this.curProfits[buyer], buyer]);
         }
         else this.investorArrivals.push([timestamp - this.startTime, "BUY"]);

         if (seller != 0) {
            this.curProfits[seller] += price - fundPrice;
            this.profitChanges.push([timestamp - this.startTime, price - fundPrice, this.curProfits[seller], seller]);
         }
         else this.investorArrivals.push([timestamp - this.startTime, "SELL"]);
      };

      dataStorage.storeFPC = function (timestamp, price) {
         this.fundPriceChanges.push([timestamp - this.startTime, price - this.curFundPrice, price]);
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

         // 5 columns for each player + timestamp, delta value, cumulative value, investors and player orders
         var numColumns = this.group.length * 5 + 7;

         // iterate through every entry in each storage array

         // add speed changes to data array
         for (let entry of this.speedChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 5 + 3] = entry[1];

            data.push(row);
         }

         // add state changes to data array
         for (let entry of this.stateChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 5 + 1] = entry[1];

            data.push(row);
         }

         // add spread changes to data array
         for (let entry of this.spreadChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 5 + 2] = entry[1];

            data.push(row);
         }

         // add profit changes to data array
         for (let entry of this.profitChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[3]] * 5 + 4] = entry[1];
            row[playerToIndex[entry[3]] * 5 + 5] = entry[2];

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
            row[numColumns - 3] = entry[1];
            row[numColumns - 2] = entry[2];

            data.push(row);
         }

         // add player order lists to data array
         for (let entry of this.playerOrders) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[numColumns - 4] = entry[1].join(' ');

            data.push(row);
         }

         // add buy order changes to data array
         for (let entry of this.buyOrderChanges) {
            let row = new Array(numColumns).fill(null);
            // put start time into a local variable so I don't have to redefine this for the map calls
            let startTime = this.startTime;

            row[0] = entry[0];

            if (entry[1].length === 0) row[numColumns - 6] = "EMPTY";
            else {
               let ids = [];
               let times = [];
               let prices = [];

               for (let marketCol of entry[1]) {
                  for (let marketRow of marketCol.reverse()) {
                     ids.push(marketRow.id);
                     times.push(marketRow.timestamp - startTime);
                     prices.push(marketRow.price);
                  }
               }

               row[numColumns - 6] = "\"{'id': (" + ids.join(', ') + "), 'time': (" + times.join(', ') + "), 'price': (" + prices.join(', ') + ")}\"";
            }

            data.push(row);
         }

         // add sell order changes to data array
         for (let entry of this.sellOrderChanges) {
            let row = new Array(numColumns).fill(null);
            let startTime = this.startTime;

            row[0] = entry[0];
            if (entry[1].length === 0) row[numColumns - 5] = "EMPTY";
            else {
               let ids = [];
               let times = [];
               let prices = [];

               for (let marketCol of entry[1].reverse()) {
                  for (let marketRow of marketCol.reverse()) {
                     ids.push(marketRow.id);
                     times.push(marketRow.timestamp - startTime);
                     prices.push(marketRow.price);
                  }
               }

               row[numColumns - 5] = "\"{'id': (" + ids.join(', ') + "), 'time': (" + times.join(', ') + "), 'price': (" + prices.join(', ') + ")}\"";
            }

            data.push(row);
         }

         // sort data by timestamp
         data.sort(function (a, b) {
            return a[0] - b[0];
         });

         // combine rows with same timestamp
         var loopAgain = true;
         while (loopAgain) {
            loopAgain = false;
            for (let row = 1; row < data.length; row++) {
               if (data[row][0] === data[row - 1][0]) {
                  loopAgain = true;
                  for (let col = 0; col < data[row].length; col++) {
                     if (data[row][col] !== null) {
                        data[row - 1][col] = data[row][col];
                     }
                  }
                  data.splice(row, 1);
               }
            }
         }

         // set empty delta and investor columns to 0 and NA respectively
         for (let row of data) {
            for (let index = 0; index < this.group.length; index++) {
               if (row[index * 5 + 4] === null) row[index * 5 + 4] = 0;
            }
            if (row[numColumns - 3] === null) row[numColumns - 3] = 0;
            if (row[numColumns - 1] === null) row[numColumns - 1] = "NA";
            if (row[numColumns - 4] === null) row[numColumns - 4] = "NA";
         }

         // fill empty cells with the value above them
         for (let row = 1; row < data.length; row++) {
            for (let col = 0; col < data[row].length; col++) {
               if (data[row][col] === null) data[row][col] = data[row - 1][col];
            }
         }

         // set up headings for each column
         data.unshift(["timestamp"]);
         for (let index = 0; index < this.group.length; index++) {
            data[0].push("status_p" + this.group[index], "spread_p" + this.group[index], "speed_p" + this.group[index], "dprofit_p" + this.group[index], "cumprofit_p" + this.group[index]);
         }
         data[0].push("buy_orders", "sell_orders", "porder", "dvalue", "cumvalue", "investor_buy_sell");

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
         a.remove();
      };

      return dataStorage;
   };

   return api;
});