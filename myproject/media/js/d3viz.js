
(function(window,undefined){

/***
 * One web page <---> one d3viz
 */
var d3viz = function(container, hlcanvas) {

  this.version = "0.1";
  this.socket = undefined;
  this.name = undefined;
  this.uuid = undefined;
  this.mapCanvas = undefined; // GeoVizMap
  this.mapDict = {}; // uuid:map
  this.nameDict = {}; // uuid:name
  this.dataDict = {};  // not used
  
  this.o = undefined;
  this.prj = undefined;
  this.map = undefined;
  this.mapType = undefined; //shapefile or json
  
  
  this.container = container; 
  this.hlcanvas = hlcanvas;
  this.uuids = []; 
  this.geoviz = new GeoVizMap(container, hlcanvas);
  // carto db
  this.userid = undefined;
  this.key = undefined;
  
  self = this;
};

d3viz.prototype = {

  GetUUID : function() {
    return this.uuids[this.geoviz.numMaps-1];
  },
  
  GetNumMaps : function() {
    return this.geoviz.numMaps;
  },
  
  GetMap : function(idx) {
    return this.geoviz.getMap(idx);
  },
  
  RemoveMap : function(idx) {
    var n = this.geoviz.numMaps;
    idx = typeof(idx) == "undefined" ? n - 1 : parseInt(idx);
    $('canvas[id=' + idx + ']').remove();
    
    // update canvas ids
    for (var i =0; i < n; i++) {
      if ( i > idx ) {
        $('canvas[id=' + i + ']').attr('id', i - 1);
      }
    }
  },
  
  SetupMapUUID : function(uuid) {
    this.uuids.push(uuid);
  },
 
  PanMaps : function(offsetX, offsetY) {
    this.geoviz.moveAllMaps(offsetX, offsetY);
  },
  
  UpdateMaps : function(params) {
    this.geoviz.updateAllMaps(params);
  },
 
  CleanMaps  : function() {
    this.geoviz.cleanAllMaps();
  },
  
  UpdateLayerOrder : function(orders) {
    var newOrders = [];
    for (var i=0; i < orders.length; i++) {
      $('canvas[id=' + orders[i] + ']').appendTo(this.container);
      newOrders.push(orders[i]);
    }
    this.geoviz.reorderMaps(newOrders);
  },
  
  /**
   * AddMap() could be:
   * 1. Drag&Drop local ESRI Shape file
   * 2. Drag&Drop local GeoJson file
   * 3. Dropbox file url of ESRI Shape file
   * 4. Dropbox file url of GeoJson file
   */
  _setupGeoVizMap : function(isMainMap, map, type, colorTheme, callback) {
    self.geoviz.addMap(map, {'color_theme':colorTheme});
    if (typeof callback === "function") {
      callback(map);
    }
  },
  
  AddMap : function(name, o, type, isMainMap, precall, callback,L, lmap, prj, colorTheme) {
    if (typeof precall === "function") { precall();}
    
    var map;
    var options = {"hratio": 1, "vratio": 1, "alpha": 0.8, "noforeground": false};

    if ( typeof o == "string") {
      if (type == 'shapefile') {
        // file url
        var xhr = new XMLHttpRequest();
        xhr.open("GET", o, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function(evt) {
          map = new ShpMap(name, new ShpReader(xhr.response), L, lmap, prj);
          self._setupGeoVizMap(isMainMap, map, type, colorTheme, callback);
        };
        xhr.send(null);
      } else if (type == 'geojson' || type == 'json') {
        var json_url = o;
        this.GetJSON( json_url, function(json) {
          map = new JsonMap(name, json, L, lmap, prj); 
          self._setupGeoVizMap(isMainMap, map, type, colorTheme, callback);
        });
      }
      
    } else if (!!o.lastModifiedDate || o.constructor == Blob) {
      // drag& drop file 
      var reader = new FileReader();
      reader.onload = function(e) {
        if (type == 'shapefile') {
          map = new ShpMap(name, new ShpReader(reader.result), L, lmap, prj);
        } else if (type == 'geojson' || type == 'json') {
          var json = JSON.parse(reader.result);
          map = new JsonMap(name, json, L, lmap, prj);
        }
        self._setupGeoVizMap(isMainMap, map, type, colorTheme, callback);
      };
      if (type == 'shapefile') {
        reader.readAsArrayBuffer(o);
      } else if (type == 'geojson' || type == 'json') {
        reader.readAsText(o);
      }
      
    } else if (typeof o == 'object'){
      if (o instanceof ShpReader || o.constructor.name == 'ShpReader') {
        // ShpReader object 
        map = new ShpMap(name, o, L, lmap, prj); 
      } else {
        // JSON object 
        map = new JsonMap(name, o, L, lmap, prj); 
      }
      self._setupGeoVizMap(isMainMap, map, type, colorTheme, callback);
    } 
    self.o = o;
  },
  
  Clean : function() {
  },
  
  GetJSON : function(url, successHandler, errorHandler) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        var a = xhr.response;
        if (typeof(a) == 'string') {
          a = a.replace(/\n/g,"");
          a = JSON.parse(a);
        }
        successHandler && successHandler(a);
      } else {
        errorHandler && errorHandler(status);
      }
    };
    xhr.send();
  },

  /**
   * Setup Brushing/Linking for base map
   */
  SetupBrushLink : function() { 
    mapDict = this.mapDict;
    window.addEventListener('storage', function(e) {
      var hl_ids = JSON.parse(localStorage.getItem('HL_IDS')),
          hl_ext = JSON.parse(localStorage.getItem('HL_MAP'));
      for ( var uuid in hl_ids ) {
        //if ( mapDict && uuid in mapDict ) {
          var map = self.mapCanvas;//mapDict[uuid];
          var ids = hl_ids[uuid];
          if ( hl_ext && uuid in hl_ext ) {
            map.highlightExt(ids, hl_ext[uuid]);
          } else if ( hl_ids && uuid in hl_ids ) {
            var context = undefined;
            var nolinking = true;
            map.highlight(hl_ids[uuid], context, nolinking);
          }
        //}
      }
    }, false);
  },
   
  /**
   * Setup and function for PopUp window
   */
  RandUrl : function(url) {
    var rnd = Math.random().toString(36).substring(7)
    if ( url.indexOf('?')  === -1 ) {
      return url + "?" + rnd;
    }
    return url + "&" + rnd;
  },
 
  /**
   * Create a new thematic map
   */
  ShowThematicMap : function(map, colorTheme, callback) {
    self.mapCanvas = new GeoVizMap(map, self.canvas, {
      "color_theme" : colorTheme
    });
    if (typeof callback === "function") {
      callback();
    }
  },
  
  UpdateThematicMap : function(uuid, newColorTheme, callback) {
    var map = self.mapDict[uuid];
    self.mapCanvas.updateColor(newColorTheme);
    if (typeof callback === "function") {
      callback();
    }
  },
 
  /**
   * Create a new Leaftlet map
   */
  PopupThematicMap : function() {
    var w = window.open(
      this.RandUrl('../../static/thematicmap.html'), // quantile, lisa,
      "_blank",
      "titlebar=no,toolbar=no,location=no,width=900, height=700, scrollbars=yes"
    );
  },
  /**
   * Create a new Leaftlet map
   */
  PopupScatterPlot : function() {
    var w = window.open(
      this.RandUrl('../../static/scatterplot.html'), // quantile, lisa,
      "_blank",
      "titlebar=no,toolbar=no,location=no,width=900, height=700, scrollbars=yes"
    );
  },
  
  /**
   * Create a new Moran Scatter Plot
   */
  PopupMoranScatterPlot : function() {
    var w = window.open(
      this.RandUrl('../../static/moran_scatterplot.html'), // quantile, lisa,
      "_blank",
      "titlebar=no,toolbar=no,location=no,width=900, height=700, scrollbars=yes"
    );
  },

  /**
   * Create a new Moran Scatter Plot
   */
  PopupHistogram : function() {
    var w = window.open(
      this.RandUrl('../../static/histogram.html'),
      "_blank",
      "titlebar=no,toolbar=no,location=no,width=900, height=700, scrollbars=yes"
    );
  },
  /**
   * Create a new Cartodb map
   */
  ShowCartodbMap: function(msg) {
    var w = window.open(
      this.RandUrl('cartodb_map.html'), // quantile, lisa,
      "_blank",
      "width=900, height=700, scrollbars=yes"
    );
  },
  
  /**
   * Close all PopUp windows
   */
  CloseAllPopUps : function() {
  },
 
  /**
   * Get selected ids from map
   */
  GetSelected : function(msg) {
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
  },
   
  SelectOnMap : function(msg) {
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
  },
  
  CartoGetAllTables : function(uid, key, successHandler) {
    var msg = {"command":"cartodb_get_all_tables"};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_GetAllTables = successHandler;
    } else {
      setTimeout(function(){self.CartoGetAllTables(uid, key, successHandler)}, 10);
    }
  },
  
  CartoDownloadTable : function(uid, key, table_name, successHandler) {
    var msg = {"command":"cartodb_download_table"};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (table_name) msg["table_name"] = table_name;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_DownloadTable = successHandler;
    } else {
      setTimeout(function(){self.CartoDownloadTable(uid, key, table_name,successHandler)}, 10);
    }
  },
  
  CartoUploadTable : function(uid, key, uuid, successHandler) {
    var msg = {"command":"cartodb_upload_table"};
    if (uid) msg["uid"] = uid;
    if (key) msg["key"] = key;
    if (uuid) msg["uuid"] = uuid;
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(msg));
      this.callback_UploadTable = successHandler;
    } else {
      setTimeout(function(){self.CartoUploadTable(uid, key, uuid, successHandler)}, 10);
    }
  },
  
  CartoSpatialCount : function(uid, key, first_layer, second_layer, count_col_name, successHandler) {
    var msg = {"command":"cartodb_spatial_count"};
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
  },
}; 

// End and expose d3viz to 'window'
window["d3viz"] = d3viz;

})(self);
