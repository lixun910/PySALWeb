function JsonMap(o) {
    var map = {};

    var defaults = {
      startManually: false,
      mapOffset: [0, 0],
      colorOn: false,
      colorSet: 'YlOrBr',
      colorScale: 'quantile',
      colorReverse: false,
      tooltipOn: true,
      tooltipContent: function(d) {
        var output = '';
        for (var p in d.properties) {
          if (d.properties.hasOwnProperty(p)) {
            output += p + ': ' + d.properties[p] + '<br />';
          }
        }
        return output;
      },
      projection: 'none',
      legendFormatter: d3.format(','),
      legendOn: true,
      legendTitle: 'Legend',
      legendOffset: [10, 10],
      styles: {},
      stylesHover: {},
      stylesBackground: {},
      stylesLegendContainer: {},
      stylesLegendTitleText: {},
      stylesLegendText: {},
      stylesLegendSwatch: {},
      stylesGraticule: {},
      stylesGlobe: {},
      canvasDragOn: false,
      mapDragOn: false,
      legendDragOn: false,
      graticuleOn: false
    };
    //Create SVG element
    var svg = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "canvas");


    //Load in GeoJSON data
    var createJsonMap = function(json) {
        if (localStorage.getItem(jsonFilePath) == null) {
            localStorage.setItem(jsonFilePath, 1);
            // store the content to indexedDB
            var fileurl = jsonFilePath;
            var filename = getFileName(fileurl);
            var fileid = filename;
            var filecontent = JSON.stringify(json);
            addFile(fileid, filename, fileurl, filecontent);
        }

        var minX = Number.POSITIVE_INFINITY,
            maxX = Number.NEGATIVE_INFINITY,
            minY = Number.POSITIVE_INFINITY,
            maxY = Number.NEGATIVE_INFINITY;
        data = json;
        json.features.forEach(function(feat,i) {
            feat.geometry.coordinates.forEach(function(coords,j) {
                coords.forEach(function(xy,k){
                    x = xy[0], y = xy[1];
                    if (x > maxX) {maxX = x;}
                    if (x < minX) {minX = x;}
                    if (y > maxY) {maxY = y;}
                    if (y < minY) {minY = y;}
                });
            });
        });

        console.log(minX,maxX,minY,maxY);
        var xyratio = (maxX-minX)/(maxY-minY);
        var offsetW = 0.0;
        var offsetH = 0.0;
        if (w/h > xyratio) {
            // canvas is too wide
            offsetW = (w - h*xyratio)/2.0;
        } else if (w/h < xyratio) {
            // canvas is too tall
            offsetH = (h - w/xyratio)/2.0;
        }

        var scaleX = d3.scale.linear()
            .domain([minX,maxX])
            .range([0, w-offsetW*2]);
        scaleY = d3.scale.linear()
            .domain([minY, maxY])
            .range([h-offsetH*2,0]);

        function matrix(a, b, c, d, tx, ty) {
            return d3.geo.transform({
                point: function(x, y) { 
                    this.stream.point(scaleX(x)+offsetW, scaleY(y)+offsetH); 
                }});
        }
        var path = d3.geo.path().projection(matrix(-1, 0, 0, 1, 0, 0));
        var polys = svg.append("g")
            .selectAll("path")
            .data(json.features)
            .enter().append("path")
            .attr("id", function(d,i){ return i;}) 
            .attr("d", path);

        polys.append("title")
            .text(function(d,i){return i;});

        polys 
            .each(function(d,i){})
            .on("mouseover", function(d){
                d3.select(this).attr("class", "selected");
                console.log(this.id);
                var msg = {'SELECTED':[d.properties.FIPS]};
                socket.send(JSON.stringify(msg));
            })
            .on("mouseout", function(d){
                d3.select(this).attr("class", "unselected"); 
                var msg = {'SELECTED':[]};
                socket.send(JSON.stringify(msg));
            });
    };

    if (localStorage.getItem(jsonFilePath) == null) {
        console.log("load from raw data");
        d3.json(jsonFilePath, createJsonMap);
    } else {
        console.log("load from cache:");
        queryFile(jsonFilePath, function(e) {
            if (e.target.result) {
                jsonContent = e.target.result.filecontent;
                json = JSON.parse(jsonContent);
                createJsonMap(json);
            } else {
                console.log("load from cache error.");
            }
        });
    }
} // end function ShowJsonMap()
