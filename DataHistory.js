RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function(){
      
      //Variables
      dataHistory = {};
      dataHistory.fundementalPrices = [[Date.now(), 15]];  //Cheating right now by recording initial FV
      dataHistory.curBuyOffer = null;
      dataHistory.pastBuyOffers = [];

      // Functions
      // Adds fundemental price change to history
      dataHistory.recordFPCchange = function(fpcMsg) {
         this.fundementalPrices.push([fpcMsg.msgData[0], fpcMsg.msgData[1]]); // index 0 = timestamp, index 1 = new price value
      }

      // Records a new buy offer
      dataHistory.recordBuyOffer = function(buyMsg) {
         this.curBuyOffer = [buyMsg.msgData[2], buyMsg.msgData[1]];   // [timestamp, price]
      }

      // Shifts buy offer from currently being active into the history
      dataHistory.storeBuyOffer = function(endTime) {
         if(this.curBuyOffer == null){
            throw "Cannot shift buy offer because it is null";
         }
         this.pastBuyOffers.push( [this.curBuyOffer[0], endTime, this.curBuyOffer[1]] );  // [startTimestamp, endTimestamp, price]
         this.curBuyOffer = null;

         //console.log(this.pastBuyOffers[0][0]);
         //console.log(this.pastBuyOffers[0][1]);
         //console.log(this.pastBuyOffers[0][2]);
      }

      return dataHistory;
   }

   return api;
});