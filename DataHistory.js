RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function(startTime, startFP, myId, group, debugMode){
      //Variables
      dataHistory = {};
      dataHistory.startTime = startTime;
      dataHistory.myId = myId;
      dataHistory.group = group;
      dataHistory.curFundPrice = [startTime, startFP, 0];
      dataHistory.pastFundPrices = [];
      dataHistory.pastBuyOffers = [];
      dataHistory.pastSellOffers = [];
      dataHistory.curProfitSegment = null;
      dataHistory.pastProfitSegments = [];
      dataHistory.transactions = [];    //entries look like [timestamp, myTransaction]
      dataHistory.profit;
      dataHistory.speedCost = 2;
      dataHistory.curBuyOffers = {};
      dataHistory.curSellOffers = {};

      dataHistory.debugMode = debugMode;
      if(debugMode){
         dataHistory.logger = new MessageLogger("Data History " + String(myId), "orange", "subject-log");
      }

      dataHistory.recvMessage = function(msg){
         if(this.debugMode){
            this.logger.logRecv(msg, "Market Algorithm");
         }

         switch(msg.msgType){
            case "FPC"      : this.recordFPCchange(msg);                           break;
            case "C_UBUY"   :
            case "C_EBUY"   : this.recordBuyOffer(msg);                            break;
            case "C_USELL"  :
            case "C_ESELL"  : this.recordSellOffer(msg);                           break;
            case "C_RBUY"   : this.storeBuyOffer(msg.msgData[1], msg.msgData[0]);  break;
            case "C_RSELL"  : this.storeSellOffer(msg.msgData[1], msg.msgData[0]); break;
            case "C_TRA"    : this.storeTransaction(msg);                          break;
            case "C_USPEED" : this.storeSpeedChange(msg);                          break;
         }

      };

      // Functions

      //initializes offers storage
      dataHistory.init = function () {
         for(var uid of this.group){
            if (uid != this.myId) {
                this.curBuyOffers[uid] = null;
                this.curSellOffers[uid] = null;
            }
         }
      }

      // Adds fundemental price change to history
      dataHistory.recordFPCchange = function(fpcMsg) {
         //this.fundementalPrices.push([fpcMsg.msgData[0], fpcMsg.msgData[1]]); // index 0 = timestamp, index 1 = new price value
         this.storeFundPrice(fpcMsg.msgData[0]);
         this.curFundPrice = [fpcMsg.msgData[0], fpcMsg.msgData[1], 0];
      };

      dataHistory.storeFundPrice = function(endTime){
         this.pastFundPrices.push( [this.curFundPrice[0], endTime, this.curFundPrice[1], this.curFundPrice[1]] );
         this.curFundPrice = null;
      }

      // Records a new buy offer
      dataHistory.recordBuyOffer = function(buyMsg) {
         //Check if current buy offer needs to be stored
         if(this.curBuyOffers[buyMsg.msgData[0]] != null){
            this.storeBuyOffer(buyMsg.msgData[2], buyMsg.msgData[0]);
         }
         //Push on new buy offer
         this.curBuyOffers[buyMsg.msgData[0]] = [buyMsg.msgData[2], buyMsg.msgData[1]];   // [timestamp, price]
      };

      // Records a new Sell offer
      dataHistory.recordSellOffer = function(sellMsg) {
         //Check if current sell offer needs to be stored
         if(this.curSellOffers[sellMsg.msgData[0]] != null){
            this.storeSellOffer(sellMsg.msgData[2], sellMsg.msgData[0]);
         }
         //Push on new sell offer
         this.curSellOffers[sellMsg.msgData[0]] = [sellMsg.msgData[2], sellMsg.msgData[1]];   // [timestamp, price]
      };

      // Shifts buy offer from currently being active into the history
      dataHistory.storeBuyOffer = function(endTime, uid) {
         if(this.curBuyOffers[uid] == null){
            throw "Cannot shift buy offer because it is null";
         }
         this.pastBuyOffers.push( [this.curBuyOffers[uid][0], endTime, this.curBuyOffers[uid][1], uid] );  // [startTimestamp, endTimestamp, price, uid]
         this.curBuyOffers[uid] = null;
      };

      // Shifts sell offer from currently being active into the history
      dataHistory.storeSellOffer = function(endTime, uid) {
         if(this.curSellOffers[uid] == null){
            throw "Cannot shift sell offer because it is null";
         }
         this.pastSellOffers.push( [this.curSellOffers[uid][0], endTime, this.curSellOffers[uid][1], uid] );  // [startTimestamp, endTimestamp, price, uid]
         this.curSellOffers[uid] = null;
      };

      dataHistory.storeTransaction = function(msg) {
         if (msg.msgData[1] !== "none") {
            this.profit += msg.msgData[2];
            this.recordProfitSegment(this.profit, msg.msgData[0], this.curProfitSegment[2]);
         }
         this.transactions.push(msg.msgData);
      };
      
      dataHistory.storeSpeedChange = function(msg) {
         this.recordProfitSegment (this.profit, msg.timeStamp, msg.msgData[1] ? this.speedCost : 0);
      }

      dataHistory.recordProfitSegment = function(price, startTime, slope) {
         if (this.curProfitSegment != null){
            this.storeProfitSegment (startTime);
         }
         this.curProfitSegment = [startTime, price, slope];
      };

      dataHistory.storeProfitSegment = function(endTime) {
         //find end price by subtracting how far graph has descended from start price
         var endPrice = this.curProfitSegment[1] - ((endTime - this.curProfitSegment[0]) * this.curProfitSegment[2] / 1000);
         if(this.curProfitSegment == null){
            throw "Cannot store current profit segment because it is null";
         }
         this.pastProfitSegments.push ([this.curProfitSegment[0], endTime, this.curProfitSegment[1], endPrice]);
         this.curProfitSegment = null;
      };

      return dataHistory;
   };

   return api;
});
