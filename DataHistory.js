RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function(){
      
      //Variables
      dataHistory = {};
      dataHistory.fundementalPrices = [[Date.now(), 15]];  //Cheating right now by recording initial FV
      dataHistory.curBuyOffer = null;
      dataHistory.curSellOffer = null;
      dataHistory.pastBuyOffers = [];
      dataHistory.pastSellOffers = [];

      // Functions
      // Adds fundemental price change to history
      dataHistory.recordFPCchange = function(fpcMsg) {
         this.fundementalPrices.push([fpcMsg.msgData[0], fpcMsg.msgData[1]]); // index 0 = timestamp, index 1 = new price value
      }

      // Records a new buy offer
      dataHistory.recordBuyOffer = function(buyMsg) {
         //Check if current buy offer needs to be stored
         if(this.curBuyOffer != null){
            this.storeBuyOffer(buyMsg.msgData[2]);
         }
         //Push on new buy offer
         this.curBuyOffer = [buyMsg.msgData[2], buyMsg.msgData[1]];   // [timestamp, price]
      }

      // Records a new Sell offer
      dataHistory.recordSellOffer = function(sellMsg) {
         //Check if current sell offer needs to be stored
         if(this.curSellOffer != null){
            this.storeSellOffer(sellMsg.msgData[2]);
         }
         //Push on new sell offer
         this.curSellOffer = [sellMsg.msgData[2], sellMsg.msgData[1]];   // [timestamp, price]
      }   

      // Shifts buy offer from currently being active into the history
      dataHistory.storeBuyOffer = function(endTime) {
         if(this.curBuyOffer == null){
            throw "Cannot shift buy offer because it is null";
         }
         this.pastBuyOffers.push( [this.curBuyOffer[0], endTime, this.curBuyOffer[1]] );  // [startTimestamp, endTimestamp, price]
         this.curBuyOffer = null;
      }

      // Shifts sell offer from currently being active into the history
      dataHistory.storeSellOffer = function(endTime) {
         if(this.curSellOffer == null){
            throw "Cannot shift sell offer because it is null";
         }
         this.pastSellOffers.push( [this.curSellOffer[0], endTime, this.curSellOffer[1]] );  // [startTimestamp, endTimestamp, price]
         this.curSellOffer = null;
      }

      return dataHistory;
   }

   return api;
});