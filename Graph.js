/* Angular service used for creating svg elements that graphically represent a market
*  Created by Zachary Petersen - zacharypetersen1@gmail.com
*
*  To use this service, inject it and call makeTradingGraph(svgElementID)
*     This will return a new graph object. Call graph.init(timeStamp) to
*     initialize the graph, call graph.draw(timeStamp) to update the graph.
*/
RedwoodHighFrequencyTrading.factory("Graphing", function () {
   var api = {};

   // Returns new grpah object - pass in id of svg element on which graph will be drawn
   api.makeTradingGraph = function(svgElementID){
      var graph = {};

      graph.elementId = svgElementID;  //id of the svg element
      graph.elementWidth = 0;          //Width and Height of svg element
      graph.elementHeight = 0;         //    (use calculateSize to determine)
      graph.axisLabelWidth = 40;       //Width of area where price axis labels are drawn
      graph.svg = d3.select('#'+ graph.elementId); //svg element
      graph.minPrice = 85;              //min price on price axis
      graph.maxPrice = 115;             //max price on price axis
      graph.priceGridIncriment = 5;    //amount between each line on price axis
      graph.timeInterval = 30;         //Amount in seconds displayed at once on full time axis
      graph.timeIncriment = 5;         //Amount in seconds between lines on time axis
      graph.currentTime = 0;           //Time displayed on graph
      graph.priceLines = [];           //
      graph.timeLines = [];
      graph.startTime = 0;
      graph.pricesArray = [];
      graph.dataObj = {
         prices: [],
         buyOffers: [[500,15,2]],
         sellOffers: [],
         drawData: []
      };

      graph.calculateSize = function(){
         this.elementWidth = $('#'+ this.elementId).width();
         this.elementHeight = $('#'+ this.elementId).height();
         this.curTimeX = this.elementWidth - this.axisLabelWidth;
      };

      graph.getSize = function(){
         return [this.elementWidth, this.elementHeight];
      };

      graph.mapPriceToYAxis = function(price){
         var percentOffset = (this.maxPrice - price) / (this.maxPrice - this.minPrice);
         return this.elementHeight * percentOffset;
      };

      graph.mapTimeToXAxis = function(timeStamp){
         var percentOffset = (timeStamp - (this.currentTime - (this.timeInterval * 1000))) / (this.timeInterval * 1000);
         return (this.elementWidth - this.axisLabelWidth) * percentOffset;
      };

      graph.priceUnit = function(){
         return this.elementHeight / (this.maxPrice - this.minPrice);
      };

      graph.millisToTime = function(timeStamp){
         var x = timeStamp / 1000;
         var seconds = parseInt(x % 60);
         x /= 60;
         var minutes = parseInt(x % 60);
         
         x /= 60;
         var hours = parseInt(x % 24);
         return hours + ":" + minutes + ":" + seconds;
      };

      graph.calcPriceGridLines = function(){
         var gridLineVal = this.minPrice + this.priceGridIncriment - (this.minPrice % this.priceGridIncriment);
         var lines = [];
         while(gridLineVal < this.maxPrice){
            lines.push(gridLineVal);
            gridLineVal += this.priceGridIncriment;
         }
         return lines;
      };

      graph.calcTimeGridLines = function(timeStamp){
         var timeLineVal = timeStamp - (timeStamp % (this.timeIncriment * 1000));
         var lines = [];
         while(timeLineVal > timeStamp - this.timeInterval * 1000){
            lines.push(timeLineVal);
            timeLineVal -= this.timeIncriment * 1000;
         }
         lines.push(timeLineVal);
         return lines;
      };

      graph.getTimeGridClass = function(timeStamp){
         if(timeStamp % (this.timeIncriment * 2000) == 0)
            return "time-grid-box-light";
         else return "time-grid-box-dark";
      };


      graph.drawTimeGridLines = function(graphRefr){
         //Draw rectangles for time gridlines
         this.svg.selectAll("rect")
            .data(this.timeLines)
            .enter()
            .append("rect")
            .attr("x", function(d){return graphRefr.mapTimeToXAxis(d);})
            .attr("y", 0)
            .attr("width", this.timeIncriment / this.timeInterval * (this.elementWidth - this.axisLabelWidth))
            .attr("height", this.elementHeight)
            .attr("class", function(d){return graphRefr.getTimeGridClass(d);});
         //If necisarry, draw the dark gray space to signify the "dead zone" before exp. started
         if(this.currentTime < this.startTime + this.timeInterval * 1000){
            this.svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.mapTimeToXAxis(this.startTime))
            .attr("height", this.elementHeight)
            .attr("class", "dead-zone");
         }
         //Draw labels for time gridlines
         this.svg.selectAll("text.time-grid-line-text")
            .data(this.timeLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", function(d){return graphRefr.mapTimeToXAxis(d)+5;})
            .attr("y", this.elementHeight-5)
            .text(function(d) {return graphRefr.millisToTime(d)})
            .attr("class", "time-grid-line-text");
      };


      graph.drawPriceGridLines = function(graphRefr){
         //Draw the lines for the price gridlines
         this.svg.selectAll("line.price-grid-line")
            .data(this.priceLines)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.elementWidth - this.axisLabelWidth)
            .attr("y1", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("y2", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("class", "price-grid-line");
      };


      graph.drawPriceLine = function(graphRefr, dataHistory){
         //Draw the price line
         this.svg.selectAll("line.price-line")
            .data(dataHistory.fundementalPrices)
            .enter()
            .append("line")
            .attr("x1", function(d){ return graphRefr.mapTimeToXAxis( d[0] ); })
            .attr("x2", function(d, i){
               if(i != dataHistory.fundementalPrices.length-1)
                  return graphRefr.mapTimeToXAxis( dataHistory.fundementalPrices[i+1][0] );
               else
                  return graphRefr.elementWidth - graphRefr.axisLabelWidth;
            })
            .attr("y1", function(d){ return graphRefr.mapPriceToYAxis(d[1]); })
            .attr("y2", function(d){ return graphRefr.mapPriceToYAxis(d[1]); })
            .attr("class", "price-line");
      };


      // If current buy offer exists, draw it on the graph
      graph.drawCurBuyOffer = function(graphRefr, dataHistory){
         if(dataHistory.curBuyOffer != null)
         this.svg.append("line")
            .attr("x1", this.mapTimeToXAxis(dataHistory.curBuyOffer[0]) )
            .attr("x2", this.curTimeX)
            .attr("y1", this.mapPriceToYAxis(dataHistory.curBuyOffer[1]) )
            .attr("y2", this.mapPriceToYAxis(dataHistory.curBuyOffer[1]) )
            .attr("class", "cur-buy-offer");
      };

      // If current buy offer exists, draw it on the graph
      graph.drawCurSellOffer = function(graphRefr, dataHistory){
         if(dataHistory.curSellOffer != null)
         this.svg.append("line")
            .attr("x1", this.mapTimeToXAxis(dataHistory.curSellOffer[0]) )
            .attr("x2", this.curTimeX)
            .attr("y1", this.mapPriceToYAxis(dataHistory.curSellOffer[1]) )
            .attr("y2", this.mapPriceToYAxis(dataHistory.curSellOffer[1]) )
            .attr("class", "cur-sell-offer");
      };

      graph.drawPastBuyOffers = function(graphRefr, dataHistory){
         this.svg.selectAll("line.past-buy-offer")
            .data(dataHistory.pastBuyOffers)
            .enter()
            .append("line")
            .attr("x1", function(d){ return graphRefr.mapTimeToXAxis(d[0]); })
            .attr("x2", function(d){ return graphRefr.mapTimeToXAxis(d[1]); })
            .attr("y1", function(d){ return graphRefr.mapPriceToYAxis(d[2]); })
            .attr("y2", function(d){ return graphRefr.mapPriceToYAxis(d[2]); })
            .attr("class", "past-buy-offer");
      };

      graph.drawPastSellOffers = function(graphRefr, dataHistory){
         this.svg.selectAll("line.past-sell-offer")
            .data(dataHistory.pastSellOffers)
            .enter()
            .append("line")
            .attr("x1", function(d){ return graphRefr.mapTimeToXAxis(d[0]); })
            .attr("x2", function(d){ return graphRefr.mapTimeToXAxis(d[1]); })
            .attr("y1", function(d){ return graphRefr.mapPriceToYAxis(d[2]); })
            .attr("y2", function(d){ return graphRefr.mapPriceToYAxis(d[2]); })
            .attr("class", "past-sell-offer");
      };

 /*     graph.drawMinSpread = function(graphRefr, drawData){
         //Draw the spread over the price line
         this.svg.selectAll("rect.spread")
            .data(drawData)
            .enter()
            .append("rect")
            .attr("x", function(d){ return graphRefr.mapTimeToXAxis( d.price[0] + graphRefr.startTime ); })
            .attr("width", function(d, i){
               var startLoc = graphRefr.mapTimeToXAxis( d.price[0] + graphRefr.startTime );
               if (i != drawData.length-1) {
                  return graphRefr.mapTimeToXAxis( drawData[i+1].price[0] + graphRefr.startTime ) - startLoc;
               }
               else {
                  return 0;
               }
            })
            .attr("y", function(d){ return graphRefr.mapPriceToYAxis(d.price[1]) - 2 * graphRefr.priceUnit(); })
            .attr("height", 4 * graphRefr.priceUnit())
            .attr("class", "spread");
      }

      graph.drawMySpread = function(graphRefr){
         
      }
*/
/*
      graph.drawMarketEvents = function(graphRefr){
            
         //Draw all of the buys
         this.svg.selectAll("line.buy-line")
            .data(this.dataObj.buyOffers)
            .enter()
            .append("line")
            .attr("x1", function(d){ return graphRefr.mapTimeToXAxis(d[0] + graphRefr.startTime); })
            .attr("x2", function(d){ return graphRefr.mapTimeToXAxis(d[0] + graphRefr.startTime); })
            .attr("y1", function(d){ return graphRefr.mapPriceToYAxis(d[1]); })
            .attr("y2", function(d){ return graphRefr.mapPriceToYAxis(d[1]) + graphRefr.priceUnit() * d[2]; })
            .attr("class", "buy-line");
      }*/


      graph.drawPriceAxis = function(graphRefr){
         //Draw rectangle on right side for price axis
         this.svg.append("rect")
            .attr("x", this.elementWidth - this.axisLabelWidth)
            .attr("y", 0)
            .attr("width", this.axisLabelWidth)
            .attr("height", this.elementHeight)
            .attr("class", "price-axis-box");
         //Draw the text that goes along with the price gridlines and axis
         this.svg.selectAll("text.price-grid-line-text")
            .data(this.priceLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", this.elementWidth - this.axisLabelWidth + 5)
            .attr("y", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("class", "price-grid-line-text")
            .text(function(d) {return d;});
      };


      graph.draw = function(dataHistory){
         //Clear the svg element
         this.svg.selectAll("*").remove();

         var graphRefr = this;

         this.currentTime = Date.now();

         //Check if it is necisary to recalculate timeLines
         if(this.currentTime > this.timeLines[0] + this.timeIncriment){
            this.timeLines = this.calcTimeGridLines(this.currentTime);
         }

         //Invoke all of the draw functions
         this.drawTimeGridLines(graphRefr);
         this.drawPriceGridLines(graphRefr);
         this.drawPriceLine(graphRefr, dataHistory);
         this.drawCurBuyOffer(graphRefr, dataHistory);
         this.drawCurSellOffer(graphRefr, dataHistory);
         this.drawPastBuyOffers(graphRefr, dataHistory);
         this.drawPastSellOffers(graphRefr, dataHistory);
         //this.drawMarketEvents(graphRefr, drawData);
         //this.drawMinSpread(graphRefr, drawData);
         this.drawPriceAxis(graphRefr);
      };

      graph.init = function(){

         //FOR NOW USE THIS TIME AS START TIME Eventually will get this from admin page
         this.startTime = Date.now();

         this.calculateSize();
         this.priceLines = this.calcPriceGridLines();
         this.timeLines = this.calcTimeGridLines(Date.now());
      };

      return graph;
   }



   return api;

});
