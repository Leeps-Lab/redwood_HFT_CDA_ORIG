//TESTING

RedwoodHighFrequencyTrading.factory("SVGGraphing", function () {
   var api = {};

   api.makeTradingGraph = function(svgElementID){
      var graph = {}
         
      graph.elementId = svgElementID
      graph.elementWidth = 0;
      graph.elementHeight = 0;
      graph.axisLabelWidth = 40;
      graph.svg = d3.select('#'+ graph.elementId);
      graph.minPrice = 2;
      graph.maxPrice = 27;
      graph.priceGridIncriment = 5;
      graph.timeInterval = 30; //In seconds
      graph.timeIncriment = 5; //In seconds
      graph.currentTime = 0;

      graph.calculateSize = function(){
         this.elementWidth = $('#'+ this.elementId).width();
         this.elementHeight = $('#'+ this.elementId).height();
      }
      
      graph.getSize = function(){
         return [this.elementWidth, this.elementHeight];
      }

      graph.mapPriceToYAxis = function(price){
         var percentOffset = (this.maxPrice - price) / (this.maxPrice - this.minPrice);
         return this.elementHeight * percentOffset;
      }

      graph.mapTimeToXAxis = function(timeStamp){
         var percentOffset = (timeStamp - (this.currentTime - (this.timeInterval * 1000))) / (this.timeInterval * 1000);
         return (this.elementWidth - this.axisLabelWidth) * percentOffset;
      }

      graph.millisToTime = function(timeStamp){
         var x = timeStamp / 1000;
         var seconds = parseInt(x % 60);
         x /= 60;
         var minutes = parseInt(x % 60);
         console.log("Minutes: " + minutes);
         x /= 60;
         var hours = parseInt(x % 24);
         return hours + ":" + minutes + ":" + seconds;
      }

      graph.calcPriceGridLines = function(){
         var gridLineVal = this.minPrice + this.priceGridIncriment - (this.minPrice % this.priceGridIncriment);
         var lines = [];
         while(gridLineVal < this.maxPrice){
            lines.push(gridLineVal);
            gridLineVal += this.priceGridIncriment;
         }
         return lines;
      }

      graph.calcTimeGridLines = function(timeStamp){
         var timeLineVal = timeStamp - (timeStamp % (this.timeIncriment * 1000));
         var lines = [];
         while(timeLineVal > timeStamp - this.timeInterval * 1000){
            lines.push(timeLineVal);
            timeLineVal -= this.timeIncriment * 1000;
         }
         lines.push(timeLineVal);
         return lines;
      }

      graph.getTimeGridClass = function(timeStamp){
         if(timeStamp % (this.timeIncriment * 2000) == 0)
            return "timeGridLight";
         else return "timeGridDark";
      }

      graph.draw = function(timeStamp){
         //Clear the svg element
         this.svg.selectAll("*").remove();
         //Record time
         this.currentTime = timeStamp;

         var graphRefr = this;
         var gridLines = this.calcPriceGridLines();
         var timeLines = this.calcTimeGridLines(this.currentTime);

         //Draw rectangles for time gridlines
         this.svg.selectAll("rect")
            .data(timeLines)
            .enter()
            .append("rect")
            .attr("x", function(d){return graphRefr.mapTimeToXAxis(d);})
            .attr("y", 0)
            .attr("width", this.timeIncriment / this.timeInterval * (this.elementWidth - this.axisLabelWidth))
            .attr("height", this.elementHeight)
            .attr("class", function(d){return graphRefr.getTimeGridClass(d);});
         //Draw labels for time gridlines
         this.svg.selectAll("text")
            .data(timeLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", function(d){return graphRefr.mapTimeToXAxis(d);})
            .attr("y", this.elementHeight)
            .text(function(d) {return graphRefr.millisToTime(d)})
            .attr("class", "timeGridLineText");
         //Draw the lines for the price gridlines
         this.svg.selectAll("line")
            .data(gridLines)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.elementWidth - this.axisLabelWidth)
            .attr("y1", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("y2", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("class", "priceGridLine");
         //Draw rectangle on right side for price axis
         this.svg.append("rect")
            .attr("x", this.elementWidth - this.axisLabelWidth)
            .attr("y", 0)
            .attr("width", this.axisLabelWidth)
            .attr("height", this.elementHeight)
            .attr("class", "priceAxisBox");
         //Draw the text that goes along with the price gridlines and axis
         /*this.svg.selectAll("text")
            .data(gridLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", this.elementWidth - this.axisLabelWidth + 5)
            .attr("y", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("class", "priceGridLineText")
            .text(function(d) {return d;});*/
      }

      graph.init = function(timeStamp){
         this.calculateSize();
         this.draw(timeStamp);
      }

      return graph;
   }



   return api;

});