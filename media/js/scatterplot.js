var draw_linear_regression = function(svg, sorted_data, xScale, yScale) {
  svg.select(".reg").remove();
  svg.append('path')
    .datum(function() {
      var xValues = [], yValues = [];
      var lin = ss.linear_regression()
        .data(sorted_data.map(function(d){ return d;}))
        .line();
      var lin_data = xScale.domain().map(function(x) {
        return [xScale(x), yScale(lin(x))];
      });
      return lin_data; 
    })
    .attr('class', 'reg')
    .style("stroke-dasharray", ("3, 3"))
    .attr('d', d3.svg.line()
      .interpolate('basis')
      .x(function(d) { 
          return d[0]; 
      })
      .y(function(d) { 
          return d[1]; 
      })
    );
};

// Render the fitted line
var draw_loess = function(bandwidth, svg, sorted_data, xScale, yScale) {
  svg.select(".line").remove();
  svg.append('path')
    .datum(function() {
      var xValues = [], yValues = [];
      var loess = science.stats.loess();
      loess.bandwidth(bandwidth);
      for (var i in sorted_data) {
        xValues.push(sorted_data[i][0]);
        yValues.push(sorted_data[i][1]);
      }
      var yValuesSmoothed = loess(xValues, yValues);
      xValues = xValues.map(xScale);
      yValuesSmoothed = yValuesSmoothed.map(yScale);
      return d3.zip(xValues, yValuesSmoothed);
    })
    .attr('class', 'line')
    .attr('d', d3.svg.line()
      .interpolate('basis')
      .x(function(d) { return d[0]; })
      .y(function(d) { return d[1]; })
    );
};

// Clear the previously-active brush, if any.
var brushstart = function(p) {
  if (brush.data !== p) {
    brush.clear();
  }
  if (buffer) {
    //var ctx = background.getContext('2d');
    //ctx.clearRect(0,0,svg_w,svg_h);
    //ctx.drawImage(buffer, 0,0);
  }
};

var highlight = function(ids) {
  var ctx = background.getContext('2d');
  ctx.strokeStyle = "rgba(255,0,0,1)";
  ctx.fillStyle = "rgba(255,255,0,1)";
  ctx.clearRect(0,0, svg_w+1, svg_h+1);
  ctx.drawImage(buffer, 0,0);
  for (var i=0, n=ids.length; i< n; i++ ) {
    var id = ids[i];
    var x = data[id][0], y = data[id][1];
    x = xMap(data[i]);
    y = yMap(data[i]);
    ctx.fillRect(x, y, 4,4);
  }
};

// Highlight the selected circles.
var brush = function(p) {
  if (svg_w == undefined || svg_h == undefined) return;
  var e = brush.extent();
  var x0 = e[0][0], y0 = e[0][1], 
      x1 = e[1][0], y1 = e[1][1];
  var ctx = background.getContext('2d');
  ctx.clearRect(0,0, svg_w+1, svg_h+1);
  ctx.drawImage(buffer, 0,0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0,y0, x1-x0, y1-y0);
  ctx.clip();
  ctx.drawImage(hbuffer, 0, 0);
  ctx.restore();
  
  x0 = xScale.invert(x0),
  x1 = xScale.invert(x1),
  y0 = yScale.invert(y0),
  y1 = yScale.invert(y1);
 
  selected = [];
  search(quadtree, x0, y1, x1, y0);
        
  // clean up select rect since it's ids only
  if (localStorage["HL_MAP"] ) {
    hm = JSON.parse(localStorage["HL_MAP"]);
    delete hm[uuid];
    localStorage["HL_MAP"] = JSON.stringify(hm);
  }
  var hl = {};
  if ( localStorage["HL_IDS"] ){ 
    hl = JSON.parse(localStorage["HL_IDS"]);
  }
  hl[uuid] = selected;
  localStorage["HL_IDS"] = JSON.stringify(hl);
};

// If the brush is empty, select all circles.
var brushend = function() {
  if (brush.empty()) {
    var ctx = background.getContext('2d');
    ctx.clearRect(0,0, svg_w+1, svg_h+1);
    ctx.drawImage(buffer, 0,0);
  }
};

// Find the nodes within the specified rectangle.
var search = function(quadtree, x0, y0, x3, y3) {
  quadtree.visit(function(node, x1, y1, x2, y2) {
    var p = node.point;
    if (p) {
      if (p[0] >= x0 && p[0] < x3 && p[1] >= y0 && p[1] < y3) {
        selected.push(data_dict[p]);
      }
    }
    return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
  });
};

