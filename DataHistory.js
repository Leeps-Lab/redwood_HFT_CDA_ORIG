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
      dataHistory.curProfitSegment = null;
      dataHistory.pastProfitSegments = [];
      dataHistory.transactions = [];    //entries look like [timestamp, myTransaction]
      dataHistory.profit;
      dataHistory.speedCost = 2;
      dataHistory.curBuyOffer = null;
      dataHistory.curSellOffer = null;
      dataHistory.pastBuyOffers = [];
      dataHistory.pastSellOffers = [];
      dataHistory.othersPastBuyOffers = [];
      dataHistory.othersPastSellOffers = [];
      dataHistory.othersCurBuyOffers = {};
      dataHistory.othersCurSellOffers = {};

      dataHistory.debugMode = debugMode;
      if(debugMode){
         dataHistory.logger = new MessageLogger("Data History " + String(myId), "orange", "subject-log");
      }

      dataHistory.recvMessage = function(msg){
         if(this.debugMode){
            this.logger.logRecv(msg, "Market Algorithm");
         }

         switch(msg.msgType){
            case "FPC"      : this.recordFPCchange(msg);                                break;
            case "C_TRA"    : this.storeTransaction(msg);                               break;
            case "C_USPEED" : this.storeSpeedChange(msg);                               break;
         }

         // if message contains information about my offers, add it to storage for my offers
         if (msg.msgData[0] == this.myId) {
           switch(msg.msgType){
                case "C_UBUY"   :
                case "C_EBUY"   : this.recordBuyOffer(msg);            break;
                case "C_USELL"  :
                case "C_ESELL"  : this.recordSellOffer(msg);           break;
                case "C_RBUY"   : this.storeBuyOffer(msg.msgData[1]);  break;
                case "C_RSELL"  : this.storeSellOffer(msg.msgData[1]); break;
            }
         }
         // otherwise put it with everyone else's offers
         else {
            switch(msg.msgType) {
                case "C_UBUY"   :
                case "C_EBUY"   : this.recordOtherBuyOffer(msg);                            break;
                case "C_USELL"  :
                case "C_ESELL"  : this.recordOtherSellOffer(msg);                           break;
                case "C_RBUY"   : this.storeOtherBuyOffer(msg.msgData[1], msg.msgData[0]);  break;
                case "C_RSELL"  : this.storeOtherSellOffer(msg.msgData[1], msg.msgData[0]); break;
            }
         }
      };

      // Functions

      //initializes others offers storage
      dataHistory.init = function () {
         for(var uid of this.group){
            if (uid != this.myId) {
                this.othersCurBuyOffers[uid] = null;
                this.othersCurSellOffers[uid] = null;
            }
         }
      };

      // Adds fundemental price change to history
      dataHistory.recordFPCchange = function(fpcMsg) {
         //this.fundementalPrices.push([fpcMsg.msgData[0], fpcMsg.msgData[1]]); // index 0 = timestamp, index 1 = new price value
         this.storeFundPrice(fpcMsg.msgData[0]);
         this.curFundPrice = [fpcMsg.msgData[0], fpcMsg.msgData[1], 0];
      };

      dataHistory.storeFundPrice = function(endTime){
         this.pastFundPrices.push( [this.curFundPrice[0], endTime, this.curFundPrice[1], this.curFundPrice[1]] );
         this.curFundPrice = null;
      };

      //
      // OFFER MANAGEMENT FUNCTIONS FOR MY OFFERS:
      //

      // Records a new buy offer
      dataHistory.recordBuyOffer = function(buyMsg) {
         //Check if current buy offer needs to be stored
         if(this.curBuyOffer != null){
            this.storeBuyOffer(buyMsg.msgData[2]);
         }
         //Push on new buy offer
         this.curBuyOffer = [buyMsg.msgData[2], buyMsg.msgData[1], 0];   // [timestamp, price]
      };

      // Records a new Sell offer
      dataHistory.recordSellOffer = function(sellMsg) {
         //Check if current sell offer needs to be stored
         if(this.curSellOffer != null){
            this.storeSellOffer(sellMsg.msgData[2]);
         }
         //Push on new sell offer
         this.curSellOffer = [sellMsg.msgData[2], sellMsg.msgData[1], 0];   // [timestamp, price, slope]
      };

      // Shifts buy offer from currently being active into the history
      dataHistory.storeBuyOffer = function(endTime) {
         if(this.curBuyOffer == null){
            throw "Cannot shift buy offer because it is null";
         }
         this.pastBuyOffers.push( [this.curBuyOffer[0], endTime, this.curBuyOffer[1], this.curBuyOffer[1]] );  // [startTimestamp, endTimestamp, startPrice, endPrice]
         this.curBuyOffer = null;
      };

      // Shifts sell offer from currently being active into the history
      dataHistory.storeSellOffer = function(endTime) {
         if(this.curSellOffer == null){
            throw "Cannot shift sell offer because it is null";
         }
         this.pastSellOffers.push( [this.curSellOffer[0], endTime, this.curSellOffer[1], this.curSellOffer[1]] );  // [startTimestamp, endTimestamp, startPrice, endPrice]
         this.curSellOffer = null;
      };

      //
      // OFFER MANAGEMENT FUNCTIONS FOR OTHERS OFFERS:
      //

      // Records a new buy offer
      dataHistory.recordOtherBuyOffer = function(buyMsg) {
         //Check if current buy offer needs to be stored
         if(this.othersCurBuyOffers[buyMsg.msgData[0]] != null){
            this.storeOtherBuyOffer(buyMsg.msgData[2], buyMsg.msgData[0]);
         }
         //Push on new buy offer
         this.othersCurBuyOffers[buyMsg.msgData[0]] = [buyMsg.msgData[2], buyMsg.msgData[1]];   // [timestamp, price]
      };

      // Records a new Sell offer
      dataHistory.recordOtherSellOffer = function(sellMsg) {
         //Check if current sell offer needs to be stored
         if(this.othersCurSellOffers[sellMsg.msgData[0]] != null){
            this.storeOtherSellOffer(sellMsg.msgData[2], sellMsg.msgData[0]);
         }
         //Push on new sell offer
         this.othersCurSellOffers[sellMsg.msgData[0]] = [sellMsg.msgData[2], sellMsg.msgData[1]];   // [timestamp, price]
      };

      // Shifts buy offer from currently being active into the history
      dataHistory.storeOtherBuyOffer = function(endTime, uid) {
         if(this.othersCurBuyOffers[uid] == null){
            throw "Cannot shift buy offer because it is null";
         }
         this.othersPastBuyOffers.push( [this.othersCurBuyOffers[uid][0], endTime, this.othersCurBuyOffers[uid][1]] );  // [startTimestamp, endTimestamp, price]
         this.othersCurBuyOffers[uid] = null;
      };

      // Shifts sell offer from currently being active into the history
      dataHistory.storeOtherSellOffer = function(endTime, uid) {
         if(this.othersCurSellOffers[uid] == null){
            throw "Cannot shift sell offer because it is null";
         }
         this.othersPastSellOffers.push( [this.othersCurSellOffers[uid][0], endTime, this.othersCurSellOffers[uid][1]] );  // [startTimestamp, endTimestamp, price]
         this.othersCurSellOffers[uid] = null;
      };

      //
      // TRANSACTION AND PROFIT MANAGEMENT FUNCTIONS
      //

      dataHistory.storeTransaction = function(msg) {
         if (msg.msgData[1] !== "none") {
            if(msg.msgData[1] === "buyer" && this.curBuyOffer !== null) this.storeBuyOffer(msg.msgData[0]);
            else if (msg.msgData[1] === "seller" && this.curSellOffer !== null) this.storeSellOffer(msg.msgData[0]);
            this.profit += msg.msgData[2];
            this.recordProfitSegment(this.profit, msg.msgData[0], this.curProfitSegment[2]);
         }
         else {
            if(msg.msgData[5] !== 0) this.storeOtherBuyOffer(msg.msgData[0], msg.msgData[5]);
            if(msg.msgData[6] !== 0) this.storeOtherSellOffer(msg.msgData[0], msg.msgData[6]);
         }
         this.transactions.push(msg.msgData);
      };
      
      dataHistory.storeSpeedChange = function(msg) {
         this.recordProfitSegment (this.profit, msg.timeStamp, msg.msgData[1] ? this.speedCost : 0);
      };

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
