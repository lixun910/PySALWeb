
(function(window,undefined){

  /***
   * One web page <---> one d3viz
   */
  var d3viz = function(wid, container, canvas) {
  
    this.id = wid;
    this.socket = undefined;
    this.map = undefined;
    this.version = "0.1";
    this.mapDict = {}; // uuid:GeoVizMap
    this.dataDict = {};
    this.nameDict = {}; // uuid:name
    this.prj = undefined;
    this.canvas = canvas;
    this.container = container;
    
    // carto db
    this.userid = undefined;
    this.key = undefined;
    
    this.RequestParam_callback = undefined;
    this.CreateWeights_callback = undefined;
    this.LISA_callback = undefined;
    this.RunSpreg_callback = undefined;
    this.callback_GetAllTables = undefined;
    this.callback_DownloadTable = undefined;
    this.callback_UploadTable = undefined;
    this.callback_SpatialCount = undefined;
    
    this.callback_RoadSegment = undefined;
    this.callback_RoadSnapPoint = undefined;
    self = this;
  };
 
  d3viz.prototype.GetJSON = function(url, successHandler, errorHandler) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        successHandler && successHandler(xhr.response);
      } else {
        errorHandler && errorHandler(status);
      }
    };
    xhr.send();
  };

  /**
   * Setup Brushing/Linking for base map
   */
  d3viz.prototype.SetupBrushLink = function() { 
    mapDict = this.mapDict;
    window.addEventListener('storage', function(e) {
      var hl_ids = JSON.parse(localStorage.getItem('HL_IDS')),
          hl_ext = JSON.parse(localStorage.getItem('HL_MAP'));
      for ( var uuid in hl_ids ) {
        if ( mapDict && uuid in mapDict ) {
          var map = mapDict[uuid];
          var ids = hl_ids[uuid];
          if ( hl_ext && uuid in hl_ext ) {
            map.highlightExt(ids, hl_ext[uuid]);
          } else if ( hl_ids && uuid in hl_ids ) {
            var context = undefined;
            var nolinking = true;
            map.highlight(hl_ids[uuid], context, nolinking);
          }
        }
      }
    }, false);
  };
   
  /**
   * Setup and function for PopUp window
   */
  d3viz.prototype.RandUrl = function(url) {
    var rnd = Math.random().toString(36).substring(7)
    if ( url.indexOf('?')  === -1 ) {
      return url + "?" + rnd;
    }
    return url + "&" + rnd;
  };
 
  d3viz.prototype.NewPopUp = function(url, msg) {
    if ( url.indexOf('?')  === -1 ) {
      url = url + "?msgid=" + msg.id;
    } else {
      url = url + "&msgid=" + msg.id;
    }
    var win = window.open(
      this.RandUrl(url),
      "_blank",
      "width=600, height=500, scrollbars=yes"
    );
  };
 
  d3viz.prototype.GetJsonUrl = function(uuid) {
    var json_url = "./tmp/" + uuid + ".json";
    return json_url; 
  };
  
  /**
   * ShowMainMap() could be:
   * 1. Drag&Drop local ESRI Shape file
   * 2. Drag&Drop local GeoJson file
   * 3. Dropbox file url of ESRI Shape file
   * 4. Dropbox file url of GeoJson file
   */
  d3viz.prototype.ShowMainMap = function(o, type, precall, callback, L, lmap, prj) {
    if (typeof precall === "function") {
      precall();
    }
    
    var map;
    var options = {"hratio": 1, "vratio": 1, "alpha": 0.8, "noforeground": false};

    if ( typeof o == "string") {
      if (type == 'shapefile') {
        // file url
        var xhr = new XMLHttpRequest();
        xhr.open("GET", o, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function(evt) {
          map = new ShpMap(new ShpReader(xhr.response), L, lmap, prj);
          self.map = new GeoVizMap(map, self.canvas);
          if (typeof callback === "function") {
            callback();
          }
        };
        xhr.send(null);
      } else if (type == 'geojson' || type == 'json') {
        var json_url = o;
        this.GetJSON( json_url, function(json) {
          map = new JsonMap(json, L, lmap, prj); 
          self.map = new GeoVizMap(map, self.canvas);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      
    } else if (!!o.lastModifiedDate || o.constructor == Blob) {
      // drag& drop file 
      var reader = new FileReader();
      reader.onload = function(e) {
        if (type == 'shapefile') {
          map = new ShpMap(new ShpReader(reader.result), L, lmap, prj);
        } else if (type == 'geojson' || type == 'json') {
          var json = JSON.parse(reader.result);
          map = new JsonMap(json, L, lmap, prj);
        }
        self.map = new GeoVizMap(map, self.canvas);
        if (typeof callback === "function") {
          callback();
        }
      };
      if (type == 'shapefile') {
        reader.readAsArrayBuffer(o);
      } else if (type == 'geojson' || type == 'json') {
        reader.readAsText(o);
      }
      
    } else if (typeof o == 'object'){
      // JSON object 
      map = new JsonMap(o, L, lmap, prj); 
      self.map = new GeoVizMap(map, self.canvas);
      if (typeof callback === "function") {
        callback();
      }
    } else {
      return false;
    }
    //self.mapDict[uuid] = self.map;
    //self.dataDict[uuid] = data;
  };
  
  /**
   * Create a new Leaftlet map
   */
  d3viz.prototype.ShowLeafletMap = function(data, L, lmap, prj, options, callback) {
    if ( typeof data == "string") {
      data = JSON.parse(data);
    }
    self.map = new GeoVizMap(new LeafletMap(data, L, lmap, prj), self.canvas, options);
    self.mapDict[uuid] = self.map;
    self.dataDict[uuid] = data;
    if (typeof callback === "function") {
      callback();
    }
  };
  
  d3viz.prototype.AddLeafletMap = function(subUuid, L, lmap, prj, callback) {
    var json_url = this.GetJsonUrl(subUuid);
    this.GetJSON( json_url, function(data) {
      if ( typeof data == "string") {
        data = JSON.parse(data);
      }
      self.map.addLayer(subUuid, new LeafletMap(data, L, lmap, prj));
      self.mapDict[subUuid] = self.map;
      self.dataDict[subUuid] = data;
    });
    if (typeof callback === "function") {
      callback();
    }
  };
  
  d3viz.prototype.AddPlainMap = function(subUuid) {
    var json_url = this.GetJsonUrl(subUuid);
    this.GetJSON( json_url, function(data) {
      if ( typeof data == "string") {
        data = JSON.parse(data);
      }
      self.map.addLayer(subUuid, new JsonMap(data));
      self.mapDict[subUuid] = self.map;
      self.dataDict[subUuid] = data;
    });
    if (typeof callback === "function") {
      callback();
    }
  };
  /**
   * add layer in an existing map
   * parameters: canvas -- $() jquery object
   * parameters: container -- $() jquery object
   */
  d3viz.prototype.AddLayer = function(msg) {
    if ( "uuid" in msg && this.canvas && this.canvas.length > 0 ){
      var uuid = msg.uuid,
          json_path = this.RandUrl("./tmp/" + uuid + ".json");
      
      this.GetJSON( json_path, function(data) {
        if ( typeof data == "string") {
          data = JSON.parse(data);
        }
        self.map.addLayer(uuid, new JsonMap(data)); 
        //self.mapDict[uuid] = self.map;
        self.dataDict[uuid] = data;
      });
    }
  };
  
  /**
   * Create a new thematic map
   */
  d3viz.prototype.ShowThematicMap = function(uuid, colorTheme, callback) {
    var json_url = this.GetJsonUrl(uuid);
    if (this.canvas == undefined) {
      this.canvas = $('<canvas id="' + uuid + '"></canvas>').appendTo(this.container);
    }
    this.GetJSON( json_url, function(data) {
      if ( typeof data == "string") {
        data = JSON.parse(data);
      }
      self.map = new GeoVizMap(new JsonMap(data), self.canvas, {
        "color_theme" : colorTheme
      });
      self.mapDict[uuid] = self.map;
      self.dataDict[uuid] = data;
      if (typeof callback === "function") {
        callback();
      }
    });
  };
  
  d3viz.prototype.UpdateThematicMap = function(uuid, newColorTheme, callback) {
    var map = self.mapDict[uuid];
    map.updateColor(newColorTheme);
    if (typeof callback === "function") {
      callback();
    }
  };
 
  /**
   * Create a new Leaftlet map
   */
  d3viz.prototype.ShowScatterPlot = function(msg) {
    var w = window.open(
      this.RandUrl('scatterplot_loess.html'), // quantile, lisa,
      "_blank",
      "width=900, height=700, scrollbars=yes"
    );
  };
  
  /**
   * Create a new Moran Scatter Plot
   */
  d3viz.prototype.ShowMoranScatterPlot = function(msg) {
    var w = window.open(
      this.RandUrl('moran_scatter.html'), // quantile, lisa,
      "_blank",
      "width=900, height=700, scrollbars=yes"
    );
  };

  /**
   * Create a new Cartodb map
   */
  d3viz.prototype.ShowCartodbMap= function(msg) {
    var w = window.open(
      this.RandUrl('cartodb_map.html'), // quantile, lisa,
      "_blank",
      "width=900, height=700, scrollbars=yes"
    );
  };
  
  /**
   * Close all PopUp windows
   */
  d3viz.prototype.CloseAllPopUps = function() {
  };
 
  /**
   * Get selected ids from map
   */
  d3viz.prototype.GetSelected = function(msg) {
    var uuid = msg["uuid"];
    var select_ids = "";
    if (localStorage.getItem('HL_IDS')) {
      var hl_ids = JSON.parse(localStorage.getItem('HL_IDS'));
      if ( uuid in hl_ids) {
        var ids = hl_ids[uuid];
        for (var i=0, n=ids.length; i<n; i++ ) {
          select_ids += ids[i] + ",";
        }
      }
    }
    var rsp = {"uuid":uuid,"ids":select_ids};
    return rsp;
  };
   
  d3viz.prototype.SelectOnMap = function(msg) {
    var hl_ids = JSON.parse(localStorage.getItem('HL_IDS')),
        hl_ext = JSON.parse(localStorage.getItem('HL_MAP'));
    if (!hl_ids) hl_ids = {};
    if (!hl_ext) hl_ext = {};
    var uuid = msg.uuid;
    if (uuid in this.mapDict ) {
      var map = this.mapDict[uuid];
      var ids = msg.data;
      
      if ( hl_ext && uuid in hl_ext ) {
        map.highlightExt(ids, hl_ext[uuid]);
      } else {
        map.highlight(ids);
      }
      hl_ids[uuid] = ids;
    }
    localStorage['HL_IDS'] = JSON.stringify(hl_ids);
  };
  
  d3viz.prototype.NewDataFromWeb = function(msg) {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
    } else {
      setTimeout(function(){self.NewDataFromWeb(msg);}, 10);
    }
  };
  
  d3viz.prototype.NewChoroplethMap = function(msg) {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
    } else {
      setTimeout(function(){self.NewChoroplethMap(msg)}, 10);
    }
  };
  
  d3viz.prototype.NewScatterPlot = function(msg) {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
    } else {
      setTimeout(function(){self.NewMoranScatterPlot(msg)}, 10);
    }
  };
  
  d3viz.prototype.NewMoranScatterPlot = function(msg) {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
    } else {
      setTimeout(function(){self.NewMoranScatterPlot(msg)}, 10);
    }
  };
  
  d3viz.prototype.NewLISAMap= function(msg, callback) {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.LISA_callback = callback;
    } else {
      setTimeout(function(){self.NewLISAMap(msg,callback)}, 10);
    }
  };
  
  d3viz.prototype.RunSpreg = function(msg, callback) {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.RunSpreg_callback = callback;
    } else {
      setTimeout(function(){self.RunSpreg(msg, callback)}, 10);
    }
  };
  
  d3viz.prototype.CreateWeights = function(msg, callback) {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.CreateWeights_callback = callback;
    } else {
      setTimeout(function(){self.CreateWeights(msg, callback)}, 10);
    }
  };
  
  d3viz.prototype.RequestParameters = function( winID, callback) {
    var msg = {'command':'request_params', 'wid' : winID};
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.RequestParam_callback = callback;
    } else {
      setTimeout(function(){self.RequestParameters( winID, callback)}, 10);
    }
  };
  
  
  d3viz.prototype.CartoGetAllTables = function(uid, key, successHandler) {
    var msg = {"command":"cartodb_get_all_tables"};
    msg["wid"] = this.id;
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_GetAllTables = successHandler;
    } else {
      setTimeout(function(){self.CartoGetAllTables(uid, key, successHandler)}, 10);
    }
  };
  
  d3viz.prototype.CartoDownloadTable = function(uid, key, table_name, successHandler) {
    var msg = {"command":"cartodb_download_table", "wid":this.id};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (table_name) msg["table_name"] = table_name;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_DownloadTable = successHandler;
    } else {
      setTimeout(function(){self.CartoDownloadTable(uid, key, table_name,successHandler)}, 10);
    }
  };
  
  d3viz.prototype.CartoUploadTable = function(uid, key, uuid, successHandler) {
    var msg = {"command":"cartodb_upload_table", "wid":this.id};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (uuid) msg["uuid"] = uuid;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_UploadTable = successHandler;
    } else {
      setTimeout(function(){self.CartoUploadTable(uid, key, uuid, successHandler)}, 10);
    }
  };  
  
  d3viz.prototype.CartoSpatialCount = function(uid, key, first_layer, second_layer, count_col_name, successHandler) {
    var msg = {"command":"cartodb_spatial_count", "wid":this.id};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    msg["firstlayer"] = first_layer;
    msg["secondlayer"] = second_layer;
    msg["columnname"] = count_col_name;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_SpatialCount = successHandler;
    } else {
      setTimeout(function(){self.CartoSpatialCount(uid, key, first_layer, second_layer, count_col_name, successHandler)}, 10);
    }
  };  
  
  d3viz.prototype.RoadSegment = function(uid, key, uuid, length, ofn, successHandler) {
    var msg = {"command":"road_segment", "wid":this.id};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    msg["uuid"] = uuid;
    msg["length"] = length;
    msg["ofn"] = ofn;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_RoadSegment = successHandler;
    } else {
      setTimeout(function(){self.RoadSegment(uid, key, uuid, length, ofn, successHandler)}, 10);
    }
  };  
  
  d3viz.prototype.RoadSnapPoint = function(uid, key, point_uuid, road_uuid, successHandler) {
    var msg = {"command":"road_snap_point", "wid":this.id};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    msg["pointuuid"] = point_uuid;
    msg["roaduuid"] = road_uuid;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_RoadSnapPoint = successHandler;
    } else {
      setTimeout(function(){self.RoadSnapPoint(uid, key, point_uuid, road_uuid, successHandler)}, 10);
    }
  };  
  /**
   * Setup WebSocket Server Communications
  PySal can send a command "add_layer:{uri:abc.shp}" to ws server.
  Ws serverthen notifies all app web pages.--- ? Let's make it simple:
  There is only one main web page that communicate with WS server.
  This main web page can popup many child/sub pages for different maps/plots, 
  and they will communicate with each other using LocalStorage.
  
  If the user send "add_layer" command again with different data. This main page
  should stack the new layer as multi-layer scenario.
  */
  d3viz.prototype.SetupWebSocket = function(server_addr) {
    /*
    if (! ("WebSocket" in window)) WebSocket = MozWebSocket; // firefox
    this.socket = new WebSocket("ws://127.0.0.1:9000");
    var socket = this.socket;
    socket.onopen = function(event) {
      //socket.send('{connected:'+ pageid + '}');
      var msg, command, winID, addMsg, rspMsg;
      socket.onmessage = function(e) {
        try {
          msg = JSON.parse(e.data);
          command = msg.command;  
          winID = msg.wid;
        } catch (err) {
          console.error("Parsing server msg error:", msg, err);            
        }
      };
    };
    */
  };
 
  // End and expose d3viz to 'window'
  window["d3viz"] = d3viz;
})(self);
