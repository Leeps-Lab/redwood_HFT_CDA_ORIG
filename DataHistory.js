RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function (startTime, startFP, myId, group, debugMode, speedCost) {
      //Variables
      dataHistory = {};
      dataHistory.startTime = startTime;
      dataHistory.myId = myId;
      dataHistory.group = group;
      dataHistory.curFundPrice = [startTime, startFP, 0];
      dataHistory.pastFundPrices = [];
      dataHistory.curProfitSegment = null;
      dataHistory.pastProfitSegments = [];
      dataHistory.transactions = [];    //entries look like [timestamp, myTransaction]
      dataHistory.profit;
      dataHistory.speedCost = speedCost;
      dataHistory.offers = {};
      dataHistory.statuses = {};
      dataHistory.lowestSpread = 5;

      dataHistory.debugMode = debugMode;
      if (debugMode) {
         dataHistory.logger = new MessageLogger("Data History " + String(myId), "orange", "subject-log");
      }

      dataHistory.recvMessage = function (msg) {
         if (this.debugMode) {
            this.logger.logRecv(msg, "Market Algorithm");
         }

         switch (msg.msgType) {
            case "FPC"      :
               this.recordFPCchange(msg);
               break;
            case "C_TRA"    :
               this.storeTransaction(msg);
               break;
            case "C_USPEED" :
               this.storeSpeedChange(msg);
               break;
            case "C_UBUY"   :
            case "C_EBUY"   :
               this.recordBuyOffer(msg);
               break;
            case "C_USELL"  :
            case "C_ESELL"  :
               this.recordSellOffer(msg);
               break;
            case "C_RBUY"   :
               this.storeBuyOffer(msg.msgData[1], msg.msgData[0]);
               break;
            case "C_RSELL"  :
               this.storeSellOffer(msg.msgData[1], msg.msgData[0]);
               break;
            case "C_UMAKER" :
               this.statuses[msg.msgData[0]].inMarket = true;
               break;
            case "C_USNIPE" :
               this.statuses[msg.msgData[0]].inMarket = false;
               break;
            case "C_UOUT" :
               this.statuses[msg.msgData[0]].inMarket = false;
               break;
            case "C_UUSPR" :
               this.statuses[msg.msgData[0]].spread = msg.msgData[1];
               if (msg.msgData[1] < this.lowestSpread) this.lowestSpread = msg.msgData[1];
               break;
         }
      };

      // Functions
      
      //initializes offer and status storage
      dataHistory.init = function () {
         for (var uid of this.group) {
            this.offers[uid] = {
               curBuyOffer: null,
               curSellOffer: null,
               pastBuyOffers: [],
               pastSellOffers: []
            };

            this.statuses[uid] = {
               inMarket: false,
               spread: 5
            };
         }
      };

      // Adds fundamental price change to history
      dataHistory.recordFPCchange = function (fpcMsg) {
         //this.fundamentalPrices.push([fpcMsg.msgData[0], fpcMsg.msgData[1]]); // index 0 = timestamp, index 1 = new price value
         this.storeFundPrice(fpcMsg.msgData[0]);
         this.curFundPrice = [fpcMsg.msgData[0], fpcMsg.msgData[1], 0];
      };

      dataHistory.storeFundPrice = function (endTime) {
         this.pastFundPrices.push([this.curFundPrice[0], endTime, this.curFundPrice[1], this.curFundPrice[1]]);
         this.curFundPrice = null;
      };

      //records a new buy offer
      dataHistory.recordBuyOffer = function (buyMsg) {
         //Check if current buy offer needs to be stored
         if (this.offers[buyMsg.msgData[0]].curBuyOffer != null) {
            this.storeBuyOffer(buyMsg.msgData[2], buyMsg.msgData[0]);
         }
         //Push on new buy offer
         this.offers[buyMsg.msgData[0]].curBuyOffer = [buyMsg.msgData[2], buyMsg.msgData[1], 0];   // [timestamp, price, slope]
      };

      // Records a new Sell offer
      dataHistory.recordSellOffer = function (sellMsg) {
         //Check if current sell offer needs to be stored
         if (this.offers[sellMsg.msgData[0]].curSellOffer != null) {
            this.storeSellOffer(sellMsg.msgData[2], sellMsg.msgData[0]);
         }
         //Push on new sell offer
         this.offers[sellMsg.msgData[0]].curSellOffer = [sellMsg.msgData[2], sellMsg.msgData[1], 0];   // [timestamp, price, slope]
      };

      // Shifts buy offer from currently being active into the history
      dataHistory.storeBuyOffer = function (endTime, uid) {
         if (this.offers[uid].curBuyOffer == null) {
            throw "Cannot shift " + uid + "'s buy offer because it is null";
         }
         this.offers[uid].pastBuyOffers.push([this.offers[uid].curBuyOffer[0], endTime, this.offers[uid].curBuyOffer[1], this.offers[uid].curBuyOffer[1]]);  // [startTimestamp, endTimestamp, startPrice, endPrice]
         this.offers[uid].curBuyOffer = null;
      };

      // Shifts sell offer from currently being active into the history
      dataHistory.storeSellOffer = function (endTime, uid) {
         if (this.offers[uid].curSellOffer == null) {
            throw "Cannot shift " + uid + "'s sell offer because it is null";
         }
         this.offers[uid].pastSellOffers.push([this.offers[uid].curSellOffer[0], endTime, this.offers[uid].curSellOffer[1], this.offers[uid].curSellOffer[1]]);  // [startTimestamp, endTimestamp, startPrice, endPrice]
         this.offers[uid].curSellOffer = null;
      };

      dataHistory.storeTransaction = function (msg) {
         if (msg.msgData[3] == this.myId) {
            // if I'm the buyer
            this.profit += msg.msgData[2] - msg.msgData[1];
            this.recordProfitSegment(this.profit, msg.msgData[0], this.curProfitSegment[2]);
         }
         else if (msg.msgData[4] == this.myId) {
            //if I'm the seller
            this.profit += msg.msgData[1] - msg.msgData[2];
            this.recordProfitSegment(this.profit, msg.msgData[0], this.curProfitSegment[2]);
         }
         else {
            //if I'm not a part of this transaction

         }
         if (msg.msgData[3] != 0 && this.offers[msg.msgData[3]].curBuyOffer !== null) this.storeBuyOffer(msg.msgData[0], msg.msgData[3]);
         if (msg.msgData[4] != 0 && this.offers[msg.msgData[4]].curSellOffer !== null) this.storeSellOffer(msg.msgData[0], msg.msgData[4]);
         this.transactions.push(msg.msgData);
      };

      dataHistory.storeSpeedChange = function (msg) {
         this.recordProfitSegment(this.profit, msg.msgData[2], msg.msgData[1] ? this.speedCost : 0);
      };

      dataHistory.recordProfitSegment = function (price, startTime, slope) {
         if (this.curProfitSegment != null) {
            this.storeProfitSegment(startTime);
         }
         this.curProfitSegment = [startTime, price, slope];
      };

      dataHistory.storeProfitSegment = function (endTime) {
         //find end price by subtracting how far graph has descended from start price
         var endPrice = this.curProfitSegment[1] - ((endTime - this.curProfitSegment[0]) * this.curProfitSegment[2] / 1000);
         if (this.curProfitSegment == null) {
            throw "Cannot store current profit segment because it is null";
         }
         this.pastProfitSegments.push([this.curProfitSegment[0], endTime, this.curProfitSegment[1], endPrice]);
         this.curProfitSegment = null;
      };

      return dataHistory;
   };

   return api;
});
