RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function(startTime, myId, group, debugMode){
      //Variables
      dataHistory = {};
      dataHistory.startTime = startTime;
      dataHistory.myId = myId;
      dataHistory.group = group;
      dataHistory.fundementalPrices = [[Date.now(), 15]];  //Cheating right now by recording initial FV
      dataHistory.curBuyOffer = null;
      dataHistory.curSellOffer = null;
      dataHistory.pastBuyOffers = [];
      dataHistory.pastSellOffers = [];
      dataHistory.groupOffers = [];
      dataHistory.curProfitSegment = null;
      dataHistory.pastProfitSegments = [];
      dataHistory.transactions = [];    //entries look like [timestamp, myTransaction]
      dataHistory.profit;

      dataHistory.debugMode = debugMode;
      if(debugMode){
         dataHistory.logger = new MessageLogger("Data History " + String(myId), "orange", "subject-log");
      }

      dataHistory.recvMessage = function(msg){
         if(this.debugMode){
            this.logger.logRecv(msg, "Market Algorithm");
         }

         switch(msg.msgType){
            case "FPC"     : this.recordFPCchange(msg);           break;
            case "C_UBUY"  :
            case "C_EBUY"  : this.recordBuyOffer(msg);            break;
            case "C_USELL" :
            case "C_ESELL" : this.recordSellOffer(msg);           break;
            case "C_RBUY"  : this.storeBuyOffer(msg.msgData[1]);  break;
            case "C_RSELL" : this.storeSellOffer(msg.msgData[1]); break;
            case "C_TRA"   : this.storeTransaction(msg);          break;
         }

      };

      // Functions
      // Adds fundemental price change to history
      dataHistory.recordFPCchange = function(fpcMsg) {
         this.fundementalPrices.push([fpcMsg.msgData[0], fpcMsg.msgData[1]]); // index 0 = timestamp, index 1 = new price value
      };

      // Records a new buy offer
      dataHistory.recordBuyOffer = function(buyMsg) {
         //Check if current buy offer needs to be stored
         if(this.curBuyOffer != null){
            this.storeBuyOffer(buyMsg.msgData[2]);
         }
         //Push on new buy offer
         this.curBuyOffer = [buyMsg.msgData[2], buyMsg.msgData[1], 0];   // [timestamp, price, slope]
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

      dataHistory.storeTransaction = function(msg) {
          console.log(msg);
         if (msg.msgData[1] == this.myId || msg.msgData[2] == this.myId) {
            this.transactions.push([msg.msgData[0], true]);
            this.profit += msg.msgData[3];
            this.recordProfitSegment(this.profit, msg.msgData[0], this.curProfitSegment[2]);
         }
         else this.transactions.push([msg.msgData[0], false]);
      }

      dataHistory.recordProfitSegment = function(price, startTime, slope) {
         if (this.curProfitSegment != null){
            this.storeProfitSegment (startTime);
         }
         this.curProfitSegment = [startTime, price, slope];
         console.log(this.curProfitSegment);
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
