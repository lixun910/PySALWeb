
var carto_uid, carto_key, carto_layer,
    lmap, uuid,  
    gProjSwitchOn = true,
    gHasProj     =false, 
    gShowLeaflet =false, 
    gAddLayer    =false,
    gProjectOpen = false;
  
var cartodb_att = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    esri_att = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    nokia_att = 'Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>',
    tileUrls = [
      'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      'http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
      'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/hybrid.day/{z}/{x}/{y}/256/png8?app_id=DXEWcinCPybfIS9yHKbM&app_code=vPBKeXjNk_iROosIzNNNRg',
      'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ];
  var tileProviders = {};
  tileProviders[tileUrls[0]] = cartodb_att;
  tileProviders[tileUrls[1]] = esri_att;
  tileProviders[tileUrls[2]] = cartodb_att;
  tileProviders[tileUrls[3]] = cartodb_att;
  tileProviders[tileUrls[4]] = nokia_att;
  tileProviders[tileUrls[5]] = esri_att;
var currentTileUrl = tileUrls[1];

var fields_combobox= {
  '#sel-var' : ['Integer','Real'], 
  '#sel-w-id': ['Integer'], 
  '#sel-histogram-x':['Integer','Real'], 
  '#sel-scatter-x':['Integer','Real'], 
  '#sel-scatter-y':['Integer','Real'], 
  '#sel-moran-var':['Integer','Real'],
  '#sel-lisa-var':['Integer','Real'],
  '#sel-st-lisa-var':['Integer','Real'],
  };
  
var html_load_img = "<img src=../../media/img/loading_small.gif>",
    html_check_img = "<img src=../../media/img/checkmark.png>",
    html_uncheck_img = "<img src=../../media/img/uncheckmark.png>";

var ShowMsgBox = function(title, content) {
  $("#msg-title").text(title);
  $("#msg-content").text(content);
  $('#dlg-msg').dialog('open');
  };
  
var local_map_names_sel = {
  '#sel-carto-table-upload':[1,2,3],
  '#sel-road-seg':[2],
  '#sel-road-snap-point-layer':[1],
  '#sel-road-snap-road-layer':[2],
  '#sel-road-w-layer':[2],
  '#sel-spacetime-table-poly':[3],
  '#sel-spacetime-table-point':[1],
  };

var toolbar_buttons = [
  '#btnShowTable',
  '#btnNewMap',
  '#btnExplore',
  '#btnSpace',
  '#btnSpreg',
];

var ToggleToolbarButtons = function(enable) {
  for( var i=0; i<toolbar_buttons.length; i++) {
    var btn = toolbar_buttons[i];
    if (enable) {
      $(btn).show('slide');
    } else {
      $(btn).hide();
    }
  }
};

var CleanLeafletMap = function() {
  if(lmap) {
    lmap.remove();
    lmap = null;
  }
  if (gViz) {
    gViz.Clean();
    gViz = undefined;
  }
};

var gBaselayer;

var CreateBaseLayer = function(){
  if (gBaselayer) {
    lmap.removeLayer(gBaselayer);
  }
  var attr = tileProviders[currentTileUrl],
      options = {
        attribution: attr,
        maxZoom: 18,
        subdomains: 'abcd',
      };
  if (attr = nokia_att) {
    options['app_id'] = 'DXEWcinCPybfIS9yHKbM';
    options['app_code'] = 'vPBKeXjNk_iROosIzNNNRg';
    options['base'] = 'aerial';
    options['mapID'] = 'newest';
    options['subdomains'] = '1234';
  }
  
  return L.tileLayer(currentTileUrl,options);
};

var SetupLeafletMap = function() {
  if (gViz && gViz.GetNumMaps() > 0) {
    return;
  }
  CleanLeafletMap();
  gViz = new d3viz($('#map-container'), $('.hl-canvas')); 
  gViz.SetupBrushLink();
  if (gShowLeaflet) {
    if (!lmap) lmap = new L.Map('map');
    gBaselayer = CreateBaseLayer(); 
    lmap.addLayer(gBaselayer);
  }
};

// Read zip file 
var ProcessDropZipFile = function(f, callback) {
  var bShp=0;
  zip.createReader(new zip.BlobReader(f), function(zipReader) {
    zipReader.getEntries(function(entries) {
      entries.forEach(function(entry) {
        var suffix = getSuffix(entry.filename);
        var writer;
        if (suffix === 'json' || suffix === 'geojson' || suffix === 'prj') {
          writer = new zip.TextWriter();
        } else {
          writer = new zip.BlobWriter();
        }
        entry.getData(writer, function(o) {
          if (entry.filename[0] === '_') 
            return;
          if (suffix === 'geojson' || suffix === 'json') {
            o = JSON.parse(o);
            ShowNewMap(o, 'geojson', entry.filename);
            $('#progress_bar_openfile').hide();
            if (callback) callback();
            return;
          } else if (suffix === "shp") {
            bShp += 1;
            shpFile = o;
          } else if (suffix === "shx") {
            bShp += 1;
          } else if (suffix === "dbf") {
            bShp += 1;
          } else if (suffix === "prj") {
            gHasProj = true;
            gPrj = proj4(o, proj4.defs('WGS84'));
          }
          if (bShp >= 3) {
            ShowNewMap(shpFile, 'shapefile', entry.filename);
            $('#progress_bar_openfile').hide();
            if (callback) callback();
          }
        });
      });
    });
  });  
};

var ShowPrgDiv = function(msg, visible) {
  if (visible == true) {
    $('#prgInfo span').text(msg);
    $('#prgInfo').show();
  } else {
    $('#prgInfo').hide();
  }
};

var AddExistMap = function(uuid, json_path) {
  if (!gPrj) gPrj = proj4(proj4.defs('WGS84'), proj4.defs('WGS84'));
  SetupLeafletMap();
  
  if (json_path.endsWith('zip')) {
    ShowPrgDiv('downloading...', true);
    var xhr = new XMLHttpRequest();
    xhr.responseType="blob";
    xhr.open("GET", json_path, true);
    xhr.onload = function(e) {
      ShowPrgDiv('downloading...', false);
      if(this.status == 200) {
        ProcessDropZipFile(this.response, function(){
          $.get('../get_metadata/', {'layer_uuid':uuid}).done(function(data){
            InitDialogs(data);
          });
        });
      }
    }
    xhr.send();
  } else if (json_path.endsWith('json')) {
    gViz.AddMap(getFileName(json_path), json_path, 'json', !gAddLayer, BeforeMapShown, OnMapShown, L, lmap, gPrj);
    $.get('../get_metadata/', {'layer_uuid':uuid}).done(function(data){
      InitDialogs(data);
    });
  }
};
  
var ShowNewMap = function(o, type, name, noForeground, recall) {
  if (recall == undefined) {
    SetupLeafletMap();
  }
  if ( gHasProj && gPrj == undefined) {
    // wait for reading *.prj file 
    setTimeout(function(){ShowNewMap(o, type, name, noForeground, true);}, 10);  
  } else {
    $('#map').show();
    if (noForeground==undefined) {
      noForeground = false;
    }
    if (gShowLeaflet) {
      gViz.AddMap(name, o, type, !gAddLayer, BeforeMapShown, OnMapShown,L, lmap, gPrj);
    } else {
      gViz.AddMap(name, o, type, !gAddLayer, BeforeMapShown, OnMapShown);
    }
  }
};

var ShowMapTitleTool = function(obj, flag) {
  var els = $(obj).children();
  if (flag == true) {
    $(els[1]).css('visibility','visible');
    $(els[2]).css('visibility','visible');
  } else {
    $(els[1]).css('visibility','hidden');
    $(els[2]).css('visibility','hidden');
  }
};

var PositionLayerTree = function() {
  return $('#layer-tree').css({ left: 50, bottom: 40, height: 'auto'});
};

var PlaceLayerName = function(name) {
  $('#btnMultiLayer').parent().width(200);
  $('#btnMultiLayer span').attr('title', name);
  $('#btnMultiLayer span').attr('title', name);
  $('#btnMultiLayer span').text(shrinkText(name));
  $('#btnMultiLayer').show();
};

var SwitchLayer = function(elm, idx) {
  if ($(elm).css('background-image').indexOf('off')>0) {
    $($('canvas')[idx]).show();
    $(elm).css({'background-image':'url("../../media/img/switch-on.png")'})
  } else {
    $($('canvas')[idx]).hide();
    $(elm).css({'background-image':'url("../../media/img/switch-off.png")'})
  }
};

var AddMapToLayerTree = function(name) {
  // add item in layer-tree
  var nMaps = gViz.GetNumMaps() - 1;
  var elm = '<li id="' +nMaps+ '" class="ui-state-default"><span class="ui-icon ui-icon-arrowthick-2-n-s"></span>' + name + '<span class="tree-item-delete"></span><span class="tree-item-eye" onclick="SwitchLayer(this, ' + nMaps +')"></span></li>';
  $(elm).prependTo($('#sortable-layers'));
  PositionLayerTree();
  // change current layer name
  PlaceLayerName(name);
  // update current buttons 
  //$('#btnShowTable').attr('href','../get_table/?layer_uuid=' + layer_uuid);
};

var BeforeMapShown = function() {
  $('#loading').show();
};

var gLmapMoveStart, gLmapMove, gLmapMoveEnd, gOffsetX, gOffsetY;

var OnMapShown = function(map) {
  $('#loading').hide();
  $('#dialog-open-file').dialog('close');
  gMap = map;
  if (gAddLayer==false) {
    if (gShowLeaflet == true) {
      lmap.on('zoomstart', function() {
        gViz.CleanMaps();
      });
      lmap.on('zoomend', function() {
        //gViz.UpdateMaps(); 
        // already taken care by moveend
      });
      lmap.on('movestart', function(e) {
        gLmapMoveStart = e.target._getTopLeftPoint();
        gViz.CleanMaps();
      });
      lmap.on('move', function(e) {
        gLmapMove = e.target._getTopLeftPoint();
        if (gLmapMoveStart == undefined) {
          // resize window
          gLmapMoveStart = e.target.getPixelOrigin();
          gViz.CleanMaps();
          return;
        }
        var offsetX = gLmapMove.x - gLmapMoveStart.x,
            offsetY = gLmapMove.y - gLmapMoveStart.y;
        if (Math.abs(offsetX) > 0 && Math.abs(offsetY) > 0) {
          gViz.PanMaps(-offsetX, -offsetY);
        }
      });
      lmap.on('moveend', function(e) {
        gLmapMoveEnd = e.target._getTopLeftPoint();
        var offsetX = gLmapMoveEnd.x - gLmapMoveStart.x,
            offsetY = gLmapMoveEnd.y - gLmapMoveStart.y;
        if (Math.abs(offsetX) > 0 || Math.abs(offsetY) > 0) {
          if (gOffsetX != offsetX || gOffsetY != offsetY) {
            gOffsetX = offsetX;
            gOffsetY = offsetY;
            gViz.UpdateMaps();
          }
        }
      });
    } else {
      $('#map').hide();
    }
    gProjectOpen = true;
  }
 
  // add name to layer-tree 
  AddMapToLayerTree(map.name);
};

var FillFieldsToControls = function(fields) {
  var field_names = [];
  for (var field in fields) {
    field_names.push(field);
  }
  field_names.sort();
  for (var var_cmb in fields_combobox) {
    var var_types = fields_combobox[var_cmb];
    $(var_cmb).find('option').remove().end();
    $(var_cmb).append($('<option>', {value: ''}).text(''));
    for (var field in fields) {
      var type = fields[field];
      if (var_types.indexOf(type) >= 0) {
        $(var_cmb).append($('<option>', {value: field}).text(field));
      }
    }
  }
  // in regression dialog
  $.each(['#y_box','#y_box','#y_box','#y_box'], function(i, box) {
    if ( !$(box).find(".placeholder")) {
      $(box).find('li').remove().end();
    } 
  });
  $('#ul-x-variables').find('li').remove().end();
  $.each(field_names, function(i, field) {
    var item = $('#ul-x-variables').append('<li><p class="name">'+field+'</p></li>');
  });
};

var InitDialogs = function(data) {
  var layer_uuid = data.layer_uuid,
      layer_name = data.name,
      fields = data.fields,
      field_names = [];
  
  
  // setup map meta data in GeoVizMap
  gViz.SetupMap(layer_uuid, data); 
  
  LoadMapNames();
  
  FillFieldsToControls(fields);
 
  // regression dialog 
  $( "#vars ul li" ).draggable({ helper: "clone" });
  new List('vars', {valueNames:['name']});
  
  // in weights box
  LoadWnames();
  setTimeout(LoadSpregP, 100);
  setTimeout(LoadModelNames, 100);
  //setTimeout(LoadMinPairDist, 3000);
  
  ToggleToolbarButtons(true);
};

// get all map names/uuid from server
var LoadMapNames = function(){
  $('#w-dist-loading').show();
  $.get("../get_map_names/", {})
  .done( function(nameDict) {
    $('#w-dist-loading').hide();
    for (var sel in local_map_names_sel) {
      var map_types =  local_map_names_sel[sel];
      $(sel).find('option').remove().end();
      for(var uuid in nameDict) {
        var name = nameDict[uuid][0],
            type = nameDict[uuid][1];
        if (map_types.indexOf(type) >= 0) {
          $(sel).append($('<option>', {value: uuid}).text(name));
        }
      }
    }
  });
};

var LoadFieldNames = function(callback) {
  if (gViz && gViz.GetUUID()) {
    var layer_uuid = gViz.GetUUID();
    $.get("../get_fields/", {"layer_uuid": layer_uuid})
    .done( function(fields) {
      FillFieldsToControls(fields);
      if (typeof callback === "function") {
        callback();
      }
    });
  }
};

var LoadMinPairDist = function() {
  if (gViz && gViz.GetUUID()) {
    var layer_uuid = gViz.GetUUID();
    $.get("../get_minmaxdist/", {"layer_uuid": layer_uuid})
    .done( function(data) {
      if ( data["success"] != 0 ) {
        $('#dist-slider').slider('option', {
          min: data['min'], max: data['max'], step: data['step']
        });
        $('#txt-dist-thr').val(data['min']);
      }
    });
  }
};

var LoadSpregP = function() {
  $.get("../get_spreg_p/", {},function() {})
  .done(function(data) {
    if ( data["success"] != 1 ) {
      console.log("get spreg preference failed.");
    } else {
      var txt_items = ['gmm_epsilon', 'gmm_max_iter', 'instruments_w_lags', 'other_missingValue', 'ml_epsilon'];
      var sel_items = ['gmm_inv_method', 'ml_method'];
      for ( var k in data ) {
        var v = data[k];
        if ( $.inArray(k, txt_items) >= 0 ) {
          $('input[name='+k+']').val(v[0]);
        } else if ( $.inArray(k, sel_items) >=0 ) {
          $('select[name='+k+']').val(v[0]);
        } else if ( k.match("^sig2n_k") ) {
          v = v ? 1 : 0;
          $('input[name='+k+'][value='+v+']').prop('checked', true);
        } else { 
          $('input[name='+k+']').prop('checked', v);
        }
      }
    }
  });
};

var LoadWnames = function() {
  if (gViz && gViz.GetUUID()){
    var layer_uuid = gViz.GetUUID();
    // get weights name:uuid
    $.get("../get_weights_names/", {"layer_uuid": layer_uuid},function() {
    }).done(function(data) {
      if ( "success" in data ) {
        ShowMsgBox("Error", "Get weights names failed.");
        return;
      }
      var w_names = [];
      for ( var key in data ) {
        w_names.push(key); 
      }
      w_names.sort();
      w_combobox= [
        '#sel-model-w-files', 
        '#sel-kernel-w-files', 
        '#sel-w-files',
        '#sel-lisa-w',
        '#sel-moran-w'
      ];
      $.each( w_combobox, function(i, w_cmb ) {
        $(w_cmb).find('option').remove().end();
        $.each(w_names, function(j, w_name) {
          wtype = data[w_name]["type"];
          if ( (wtype <= 1 && w_cmb == w_combobox[0]) 
                || (wtype == 2 && w_cmb == w_combobox[1]) 
                || (w_cmb == w_combobox[2] || w_cmb == w_combobox[3] || w_cmb == w_combobox[4]) ) {
            wuuid = data[w_name]["uuid"];
            $(w_cmb).append($('<option>', {value: wuuid}).text(w_name));
          }
        });
      });
      $('#sel-w-files').prop("selectedIndex", -1);
    });
  }
};

var LoadModelNames = function() {
  if (gViz && gViz.GetUUID()){
    var layer_uuid = gViz.GetUUID();
    $.get("../get_spreg_models/", {"layer_uuid": layer_uuid})
    .done(function(data){
      if ( data["success"] == 0 ) {
        console.log("ERROR: get_spreg_models()", layer_uuid); 
        return;
      }
      $('#open_spreg_model').find('option').remove().end();
      $.each(data, function(i, model) {
        $('#open_spreg_model').append($('<option>',{value: model}).text(model));
      });
    });
  }
};
var SaveMapThumbnail = function(layer_uuid, containerID) {
  var canvas = $('#' + containerID + ' canvas');
  if ( layer_uuid != undefined && canvas[0] != undefined &&
       layer_uuid == localStorage.getItem('current_layer')) {
    if (canvas.attr("id") == undefined ) {
      console.log("upload thumbnail");
      canvas.attr("id", layer_uuid);
      $("<div class='remove_map' id='"+layer_uuid+"'></div>").insertBefore(canvas.parent());
      $("<div class='download_map' id='"+layer_uuid+"'></div>").insertBefore(canvas.parent());
      InitRemoveButtons();
      var dataURL = canvas[0].toDataURL();
      $.ajax({
        type: "POST",
        url: "../upload_canvas/",
        data: { 
          imageData: dataURL,
          layer_uuid: layer_uuid,
          csrfmiddlewaretoken: csrf_token,
        }
      }).done(function(data) {
        console.log('save canvas:', data); 
      });
    }
  } else {
    setTimeout( function(){ SaveMapThumbnail(layer_uuid, containerID); }, 500); 
  }
};

var ShowCartoDBMap = function(carto_uid, carto_key, table_name, geo_type) {
  var css = "";
  if (geo_type == "Point") {
    css = '#layer {marker-fill: #FF6600; marker-opacity: 1; marker-width: 6; marker-line-color: white; marker-line-width: 1; marker-line-opacity: 0.9; marker-placement: point; marker-type: ellipse; marker-allow-overlap: true;}';
  } else if (geo_type == "Line") {
    css = '#layer {line-width: 2; line-opacity: 0.9; line-color: #006400; }';
  } else if (geo_type == "Polygon") {
    css = "#layer {polygon-fill: #006400; polygon-opacity: 0.9; line-color: #CCCCCC; }";
  }
  //show cartodb layer and downloading iconp
  SetupLeafletMap();
  lmap.setView(new L.LatLng(43, -98), 1);
  if (carto_layer) {
    lmap.removeLayer(carto_layer);
  }
  carto_layer = cartodb.createLayer(lmap, 
    {
      user_name: carto_uid, 
      type: 'cartodb',
      sublayers:[{
        sql:"SELECT * FROM " + table_name,
        cartocss: css
      }],
    },
    {
      https: true,
    }
  )
  .addTo(lmap)
  .on('done', function(layer_) {
    var sql = new cartodb.SQL({user: carto_uid});
    sql.getBounds("SELECT * FROM " + table_name).done(function(bounds){
      lmap.fitBounds(bounds);
    });
  });
};

var DownloadMap = function(layer_uuid) {
  $.download("../download_map/", "layer_uuid="+layer_uuid, "get");
};

var DeleteMap = function(obj, layer_uuid) {
  var that = obj;
  $('<div></div>').appendTo('body')
  .html('<br/><div>Are you sure you want to delete this map?</div>')
  .dialog({
    modal: true,
    title: "Confirmation required",
    buttons: {
      Yes: function() {
        var dlg = $(this);
        $.get("../remove_map/", {"layer_uuid": layer_uuid}).done(function(data){
          if (data["success"] == 1) {
            $(that).parent().remove();
            if($('#tabs-1').text().indexOf('a') > 0) {
              $('#tabs-dlg-open-file').tabs('option','active', 0);
            }  else {
              $('#tabs-dlg-open-file').tabs('option','active', 1);
            }
          }
          dlg.dialog("close");
        });
      },
      No: function() {
        $(this).dialog("close");
      }
    },
    close: function( evt, ui) { $(this).remove(); }
  });
};

$(document).ready(function() {
  ToggleToolbarButtons(false);

  
  $(window).resize(function() {
    $('#layer-tree, .tool-menu').hide();
  });
  
  $('#btn_logout').click(function(){
    $.post("../logout/", {'csrfmiddlewaretoken' : csrftoken})
    .done(function(data) {
      location.reload();
    });
  });
  //////////////////////////////////////////////////////////////
  //  Map
  //////////////////////////////////////////////////////////////
  localStorage.clear();  

  $("#switch").switchButton({
    checked: true,
    on_label: 'ON',
    off_label: 'Using Basemap? OFF',
    on_callback: function() {
      gShowLeaflet = true;
      if (gViz) {
        ShowNewMap(gViz.o, gViz.mapType, "");
      }
    },
    off_callback: function() {
      gShowLeaflet = false;
      if (gViz) {
        ShowNewMap(gViz.o, gViz.mapType, "", true);
      }
    },
  });
  
  var mapItems = $('#mapproviders').children();
  $(mapItems[4]).css({'border':'2px solid orange'});
  for (var i=0; i< mapItems.length; i++){
    $(mapItems[i]).click(function(){
      // update basemap
      currentTileUrl = tileUrls[parseInt($(this).attr('id'))];
      gBaselayer = CreateBaseLayer();
      if (!lmap) lmap = new L.Map('map');
      lmap.addLayer(gBaselayer);
      $('#mapproviders').children().css({'border':'none'});
      $(this).css({'border':'2px solid orange'});
    });
  }
  //////////////////////////////////////////////////////////////
  //  Init UI
  //////////////////////////////////////////////////////////////
  LoadMapNames();
   jQuery.fn.popupDiv = function (divToPop, text) {
    var pos=$(this).offset();
    var h=$(this).height();
    var w=$(this).width();
    if (w == 0) w = 40;
    if ( text != undefined ) {
      $(divToPop).html(text);
    }
    $(divToPop).css({ left: pos.left + w , top: pos.top - h });
    $(divToPop).show(function() {
      setTimeout(function(){ $(divToPop).fadeOut('slow');}, 2000);
    });
  };
  $('#w-dist-loading, #divPop, \
    #img-id-chk, #img-id-spin, #img-id-nochk, \
    .dlg-loading, #progress_bar_openfile, \
    #progress_bar_cartodb,#progress_bar_road,\
    #progress_bar_spacetime, #btnMultiLayer, \
    #progress_bar_lisa, #tool-menu-arrow, #dialog-arrow, #mapInfo, #prgInfo').hide();
    
  $( "#dlg-msg" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400, height: 200, autoOpen: false, modal: true,
    buttons: {OK: function() {$( this ).dialog( "close" );}}
  }).hide();

  $('#basemap').click(function(){
    $('#mapInfo').toggle();
  });
  
  $( "#sortable-layers" ).sortable({
    start: function(event, ui) {
      var start_pos = ui.item.index();
      ui.item.data('start_pos', start_pos);
    },
    change: function(event, ui) {
      var start_pos = ui.item.data('start_pos');
      var index = ui.placeholder.index() -1;
      ui.item.data('end_pos', index);
    },
    update: function(event, ui) {
      var start_pos = ui.item.data('start_pos');
      var end_pos = ui.item.data('end_pos');
      var layers = $('#sortable-layers').children();
      var current_layer = layers[0];
      var layer_name = current_layer.textContent;
      PlaceLayerName(layer_name);
     
      var layer_ids = []; 
      for (var i=layers.length-1; i>=0; i--) {
        layer_ids.push(parseInt(layers[i].id));
      }
      gViz.UpdateLayerOrder(layer_ids);
    }
  });
  $( "#sortable-layers" ).selectable(); 
  
  PositionLayerTree().hide();
    
  $('.tool-menu').css({ left: 0, bottom: 40}).hide();
  
  $(document).mouseup(function (e) {
    var container = $(".tool-menu");
    if (!container.is(e.target) // if the target of the click isn't the container...
        && container.has(e.target).length === 0
        && container.is($('canvas'))) // ... nor a descendant of the container
    {
        container.hide();
        $('#tool-menu-arrow').hide();
    }
  });
  
  $('#btnOpenData').click(function(){
    $('#dialog-open-file').dialog('open');
  });
  
  var OnToolMenuClick = function(btn, menu) {
    $(btn).click(function(){
      if (gViz && gViz.GetNumMaps() > 0) {
        if ($(menu).is(".visible") || $(menu).css('display') == 'block') {
          $(menu).hide();
          $('#tool-menu-arrow').hide();
        }
          $('div.tool-menu').hide();
          $(menu).show();
          // adjust the pos of arrow
          var pos = $(btn).offset();
          $('#tool-menu-arrow').css({'left':pos.left});
          $('#tool-menu-arrow').show();
      }
    });
  };
  
  var toolMenu = {
    '#btnMultiLayer':'#layer-tree', 
    '#btnNewMap':'#map-menu', 
    //'#btnShowTable':'#map-menu', 
    '#btnExplore':'#explore-menu', 
    '#btnSpace':'#space-menu', 
    //'#btnSpreg':'#spreg-menu'
  };
  for (var btn in toolMenu) {
    var menu = toolMenu[btn];
    OnToolMenuClick(btn, menu);
  }
 
  $('#btnCatMap').click(function(){
    $('#dlg-quantile-map').dialog('option', "position", {
      my: "bottom-38",
      at: "top",
      of: "#btnCatMap"
    });
    $('#dlg-quantile-map').dialog('open');
    var pos=$(this).offset();
    $('#dialog-arrow').css({'left':pos.left});
    $('#dialog-arrow').show();
  });
  
  $('#btnCartoDB').click(function(){
    if (gViz) {
      $('#dialog-cartodb').dialog('open');
    }
  });
  $('#btnRoadNetwork').click(function(){
    if (gViz) {
      $('#dialog-road').dialog('open');
    }
  });
  $('#btnSpaceTime').click(function(){
    if (gViz) { $('#dialog-spacetime').dialog('open');}
  });
  $('#btnCreateW').click(function(){
    if (gViz) { $('#dialog-weights').dialog('open');}
  });
  $('#btnSpreg').click(function(){
    if (gViz) { $('#dialog-regression').dialog('open');}
  });
  $('#btnScatterPlot').click(function(){
    if (gViz) { $('#dlg-scatter-plot').dialog('open');}
  });
  $('#btnHist').click(function(){
    if (gViz) { $('#dlg-histogram').dialog('open');}
  });
  $('#btnMoran').click(function(){
    if (gViz) { $('#dlg-moran-scatter-plot').dialog('open');}
  });
  $('#btnLISA').click(function(){
    if (gViz) {  $('#dlg-lisa-map').dialog('open');}
  });
  
  //////////////////////////////////////////////////////////////
  //  Open File 
  //////////////////////////////////////////////////////////////
  $('#tabs-dlg-open-file').tabs();
  if($('#tabs-1').text().indexOf('a') > 0) {
    $('#tabs-dlg-open-file').tabs('option','active', 0);
  }  else {
    $('#tabs-dlg-open-file').tabs('option','active', 1);
  }
  $( "#dialog-open-file" ).dialog({
    height: 450,
    width: 500,
    autoOpen: false,
    modal: false,
    dialogClass: "dialogWithDropShadow",
    buttons: [{
      text: "OK",
      click: function() {
        var sel_id = $("#tabs-dlg-open-file").tabs('option','active');
        if (sel_id == 2) {
          carto_uid = $('#txt-carto-id').val();
          carto_key = $('#txt-carto-key').val();
          var table_name = $('#sel-file-carto-tables').find(':selected').text(),
              geo_type = $('#sel-file-carto-tables').find(':selected').val();
          if ($('#chk-carto-download').is(':checked')) {
            $('#progress_bar_openfile').show();
            var params = {
              'cartodb_uid' : carto_uid,
              'cartodb_key' : carto_key,
              'table_name' : table_name,
            };
            $.get('../carto_download_table/', params).done(function(meta_data){
              $('#progress_bar_openfile').hide();
              var prj_url = meta_data.shp_url.slice(0,-3) + "prj";
              $.get(prj_url).done(function(prj_data){
                gPrj = proj4(prj_data, proj4.defs('WGS84'));
                ShowNewMap(meta_data.shp_url, 'shapefile', table_name);
                InitDialogs(meta_data);
              });
            });
          } else {
            ShowCartoDBMap(carto_uid, carto_key, table_name, geo_type) ;
          } 
        } 
      },
    },{
      text: "Close",
      click: function() {
        $( this ).dialog( "close" );
      },
    }]
  });
  if (getParameterByName("uuid")) {
    uuid = getParameterByName("uuid");
    ShowPrgDiv('downloading...', true);
    $.get('../get_metadata/', {'layer_uuid':uuid}).done(function(data){
      var n = data.n,
          zip = false,
          url = data.json_path;
      if ( n > 4000 ) {
        zip = true;
        url = data.json_path + ".zip";
      }
      var xhr = new XMLHttpRequest();
      xhr.responseType="blob";
      xhr.open("GET", url, true);
      xhr.onload = function(e) {
        ShowPrgDiv('', false);
        if(this.status == 200) {
          if (zip) {
            ProcessDropZipFile(this.response, function(){
              InitDialogs(data);
            });
          } else {
            AddExistMap(data.layer_uuid, url);
          }
        }
      }
      xhr.send();
    });
  } else {
    $('#dialog-open-file').dialog('open');
  }
   //////////////////////////////////////////////////////////////
  //  Drag & Drop
  //////////////////////////////////////////////////////////////
  var dropZone = document.getElementById('drop_zone');
  var progress = document.querySelector('.percent');
  
  if (typeof window.FileReader === 'undefined') {
    console.log( 'File API not available.');
  }
  
  var UpdateProgress = function(evt) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
      var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
      // Increase the progress bar length.
      if (percentLoaded < 100) {
        progress.style.width = percentLoaded + '%';
        progress.textContent = percentLoaded + '%';
      }
    }
  };
  
  var UploadFilesToServer = function(files, precall, callback) {
    if (typeof precall === "function") {
      ShowPrgDiv('uploading...', true);
      precall();
    }
    // zip files
    var n = files.length,
        fileCnt = 0,
        zipWriter;
    var addFile = function(f, onend) {
        zipWriter.add(f.name, new zip.BlobReader(f), onend); 
    };
    var OnAddFile = function() {
      fileCnt += 1; 
      if (fileCnt < n) {
        addFile(files[fileCnt], OnAddFile);
      } else {
        zipWriter.close(function(blob){
          var formData = new FormData();
          formData.append('userfile', blob, "upload.zip");
          formData.append('csrfmiddlewaretoken', csrftoken);
          var xhr = new XMLHttpRequest();
          xhr.open('POST', '../upload/');
          xhr.onload = function() {
            console.log("[Upload]", this.responseText);
            try{
              var metadata = JSON.parse(this.responseText);
              InitDialogs(metadata);
            } catch(e){
              console.log("[Error][Upload Files]", e);
            }
            if (typeof callback === "function") {
              ShowPrgDiv('', false);
              callback();
            }
          }; 
          xhr.upload.onprogress = UpdateProgress;
          xhr.send(formData);
        });
      }
    };
    
    zip.createWriter(new zip.BlobWriter(), function(writer){
      zipWriter = writer;
      addFile(files[0], OnAddFile);
    });
  };
  
  dropZone.ondragover = function(evt) {
    $("#"+evt.target.id).css("color", "black");
    return false;
  };
  
  dropZone.ondragend = function(evt) {
    $("#"+evt.target.id).css("color", "#bbb");
    return false;
  };
  
  dropZone.ondrop = function(evt) {
    evt.preventDefault();
    $("#"+evt.target.id).css("color", "#bbb");
    // Reset progress indicator on new file selection.
    progress.style.opacity = 1;
    progress.style.width = '0%';
    progress.textContent = '0%';
    var reader = new FileReader();
    reader.onload = function(e) {
      console.log(reader.result);
      // read *.prj file
      var ip = reader.result;
      gPrj = proj4(ip, proj4.defs('WGS84'));
    };
    gHasProj = false;
    var files = evt.dataTransfer.files, // FileList object.
        bShp=0, shpFile, dbfFile, shxFile, 
        bJson=0, jsonFile;
    for (var i=0, n=files.length; i<n; i++) {
      var f = files[i],
          name = f.name,
          suffix = getSuffix(name);
      if (suffix === "zip") { // extract zip file
        ProcessDropZipFile(f);
        UploadFilesToServer([f], function(){
          document.getElementById('progress_bar').className = 'uploading...';
        },function(){
          // Ensure that the progress bar displays 100% at the end.
          progress.style.width = '100%';
          progress.textContent = '100%';
          setTimeout("document.getElementById('progress_bar').className='';", 2000);
        });
        return;
      } 
      if (suffix === 'geojson' || suffix === 'json') {
        bJson = 1;
        jsonFile = f;
      } else if (suffix === "shp") {
        bShp += 1;
        shpFile = f;
      } else if (suffix === "shx") {
        bShp += 1;
        shxFile = f;
      } else if (suffix === "dbf") {
        bShp += 1;
        dbfFile = f;
      } else if (suffix === "prj") {
        gHasProj = true;
        reader.readAsText(f);
      }     
    }
    // check files
    if (bJson < 1 && bShp < 3) {
      ShowMsgBox("Error", "Please drag&drop either one json/geojson file, or ESRI Shapefiles (*.shp, *.dbf, *.shx and *.prj) ");
      return false;
    } else if (bJson < 1 && bShp < 3) {
      ShowMsgBox("Error", "Please drag&drop three files (*.shp, *.dbf, *.shx and *.prj)  at the same time. (Tips: use ctrl (windows) or command (mac) to select multiple files.)");
      return false;
    } 
    if (bShp >= 3 && !gHasProj ) {
      gProjSwitchOn = false;
      ShowMsgBox("Info", "The *.prj file is not found. The map will not be shown using Leaflet. You can still use the swtich button to display the map on Leaflet."); 
    }
    // compress the file to zip? no, let users to zip the files if they want 
    // to upload fast
    UploadFilesToServer(files, function(){
      document.getElementById('progress_bar').className = 'uploading...';
    },function(){
      // Ensure that the progress bar displays 100% at the end.
      progress.style.width = '100%';
      progress.textContent = '100%';
      setTimeout(function(){
        document.getElementById('progress_bar').className='';
        progress.style.opacity = 0;
      }, 2000);
    });
    
    // display map directly
    if (shpFile) {
      ShowNewMap(shpFile, 'shapefile', shpFile.name);
    } else if (jsonFile) {
      ShowNewMap(jsonFile, 'json', jsonFile.name);
    }
  };
  
  //////////////////////////////////////////////////////////////
  //  DropBox
  //////////////////////////////////////////////////////////////
  var dropboxOptions = {
    success: function(files) {
      if ( files.length == 0 ) { 
        return;
      }
      var ready = false;
      var fileLink = files[0].link;
      var suffix = getSuffix(fileLink);
      var params = {'csrfmiddlewaretoken':  csrftoken};
      if ( suffix === 'geojson' || suffix === 'json') {
        ShowNewMap(fileLink, 'geojson', getFileName(fileLink));
        params['json'] = fileLink;
        ready = true;
      } else if ($.inArray( suffix, ['shp', 'dbf','shx','prj']) >= 0) {
        var shpUrl, shxUrl, dbfUrl, prjUrl, fname = getFileNameNoExt( fileLink );
        $.each(files, function(i, file) {
          var f = file.link,
              currentName = getFileNameNoExt(f);
          if (getSuffix(f)=='shp' && fname==currentName) {
            shpUrl = f;
          } else if (getSuffix(f)=='dbf' && fname==currentName) {
            dbfUrl = f;
          } else if (getSuffix(f)=='shx' && fname==currentName) {
            shxUrl = f;
          } else if (getSuffix(f)=='prj' && fname==currentName) {
            prjUrl = f;
          }
        });
        if (shpUrl && shxUrl && dbfUrl) {
          params['shp'] = shpUrl;
          params['shx'] = shxUrl;
          params['dbf'] = dbfUrl;
          if (prjUrl) {
            params['prj'] = prjUrl;
            $.get(prjUrl, function(data) {
              var ip = data;
              gPrj = proj4(ip, proj4.defs('WGS84'));
              ShowNewMap(shpUrl, 'shapefile', getFileName(shpUrl));
            });
          } else {
            ShowNewMap(shpUrl, 'shapefile', getFileName(shpUrl));
          } 
          ready = true;
        } else {
          ShowMsgBox("Error","Please select *.shp, *.dbf, and *.shx files at the same time.");
        }
      } else if (suffix === 'zip') {
        $('#progress_bar_openfile').show();
        params['zip'] = fileLink;
        var xhr = new XMLHttpRequest();
        xhr.responseType="blob";
        xhr.open("GET", fileLink, true);
        xhr.onload = function(e) {
          if(this.status == 200) {
            var blob = this.response;
            ProcessDropZipFile(blob);
          }
        }
        xhr.send();
        ready = true;
      }
      if ( ready ) {
        ShowPrgDiv('uploading...', true);
        $.get("../upload/", params).done( function(data) {
          ShowPrgDiv('', false);
          InitDialogs(data);
          //SaveMapThumbnail(layer_uuid, containerID);
        });
      }
    },
    cancel: function() {
      //$('#progressCont').hide();
    },
    linkType: "direct", // or "preview"
    multiselect: true, // or true
    extensions: ['.json', '.geojson', '.zip', '.shp','.shx','.dbf','.prj'],
  };
  var button = Dropbox.createChooseButton(dropboxOptions);
  $("#dropbox_div").append(button);

  //////////////////////////////////////////////////////////////
  //  CartoDB
  //////////////////////////////////////////////////////////////
  var carto_table_sel = ['#sel-carto-table-download', '#sel-file-carto-tables', '#sel-carto-table-count1','#sel-carto-table-count2'];
  
  var fill_carto_tables = function(tables) {
    $.each(carto_table_sel, function(i, sel) {
      $(sel).find('option').remove().end();
      for (var table_name in tables) {
        var geo_type = tables[table_name];
        $(sel).append($('<option>', {value: geo_type}).text(table_name));
      }
    });
  };
  
  $('#btn-cartodb-get-all-tables').click(function(){
    if (gViz) {
      $('#progress_bar_cartodb').show();
      var uid = $('#txt-carto-setup-id').val(),
          key = $('#txt-carto-setup-key').val();
      var params = {
        'cartodb_uid' : uid,
        'cartodb_key' : key,
      };
      $.get('../carto_get_tables/', params).done(function(data){
        $('#progress_bar_cartodb').hide();
        fill_carto_tables(data);
      });
    }   
  });
  $('#btn-file-cartodb-get-all-tables').click(function(){
    $('#progress_bar_openfile').show();
    var uid = $('#txt-carto-id').val(),
        key = $('#txt-carto-key').val();
    var params = {
      'cartodb_uid' : uid,
      'cartodb_key' : key,
    };
    $.get('../carto_get_tables/', params).done(function(data){
      $('#progress_bar_openfile').hide();
      fill_carto_tables(data);
    });
  });
  $('#tabs-dlg-cartodb').tabs();
  $( "#dialog-cartodb" ).dialog({
    height: 500,
    width: 550,
    autoOpen: false,
    modal: false,
    dialogClass: "dialogWithDropShadow",
    buttons: [{
      text: "OK",
      click: function() {
        var that = $(this);
        var sel_id = $("#tabs-dlg-cartodb").tabs('option','active'),
            uid = $('#txt-carto-setup-id').val(),
            key = $('#txt-carto-setup-key').val();
        $('#progress_bar_cartodb').show();
        if (sel_id == 0) {
          // setup
          gViz.CartoGetAllTables(uid, key, function(msg) {
            $('#progress_bar_cartodb').hide();
            fill_carto_tables(msg['tables']);
          });
          
        } else if (sel_id == 1) {
          // download to local disk
          var table_name = $('#sel-carto-table-download').find(':selected').text();
          gViz.CartoDownloadTable(uid, key, table_name, function(msg){
            $('#progress_bar_cartodb').hide();
            var name = msg.name;  
            // create a url and download
            $.download('./cgi-bin/download.py','name='+name,'get');
          });
        } else if (sel_id == 2) {
          // upload: using uuid send command to call cartodb_upload()
          var upload_uuid = $('#sel-carto-table-upload').find(':selected').val();
          gViz.CartoUploadTable(uid, key, upload_uuid, function(msg){
            $('#progress_bar_cartodb').hide();
            var new_table_name = msg["new_table_name"];
            if (new_table_name == undefined || new_table_name == "") {
              ShowMsgBox("Error", "Upload table to CartoDB failed. Please try again or contact our administators.");
            } else {
              ShowMsgBox("", "Upload table to CartoDB done. A new table [" + new_table_name + "] has been created.");
              $.each(carto_table_sel, function(i, sel) {
                $(sel).append($('<option>', {value: new_table_name}).text(new_table_name));
              });
            }
          });
        } else if (sel_id == 3) {
          // count
          var first_layer = $('#sel-carto-table-count1').find(':selected').text(),
              second_layer = $('#sel-carto-table-count2').find(':selected').text(),
              col_name = $('#txt-carto-col-name').val(),
              method = "contain";
          gViz.CartoSpatialCount(uid, key, first_layer, second_layer, col_name, function(msg) {
            $('#progress_bar_cartodb').hide();
            if (msg["result"] != true) {
              ShowMsgBox("[Error]","CartoDB spatial counts faield. Please try again or contact our administators.");
            } else {
              ShowMsgBox("","CartoDB spatial counts done.");
            }
            that.dialog( "close" );
          });
        }
      },
    },{
      text: "Close",
      click: function() {
        $( this ).dialog( "close" );
      },
    }]
  });
  
  //////////////////////////////////////////////////////////////
  //  Road
  //////////////////////////////////////////////////////////////
  $('#tabs-dlg-road').tabs();
  $( "#dialog-road" ).dialog({
    height: 380,
    width: 520,
    autoOpen: false,
    modal: false,
    dialogClass: "dialogWithDropShadow",
    buttons: [{
      text: "OK",
      click: function() {
        var that = $( this );
        var sel_id = $("#tabs-dlg-road").tabs('option','active'),
            uid = $('#txt-carto-setup-id').val(),
            key = $('#txt-carto-setup-key').val();
        $('#progress_bar_road').show();
        
        if (sel_id == 0) {
          // segment road
          var road_uuid = $('#sel-road-seg').find(':selected').val(),
              seg_length = $('#txt-seg-road-length').val(),
              output_filename = $('#txt-seg-road-name').val();
          var params = {
            'cartodb_uid' : uid,
            'cartodb_key' : key,
            'road_uuid' : road_uuid,
            'road_seg_length' : seg_length,
            'road_seg_fname' : output_filename,
          };
          $.get('../road_segment/', params).done( function(data){
            $('#progress_bar_road').hide();
            if ( data["success"] == 1 ) {
              ShowMsgBox("","Road segmentation done.");
              LoadMapNames();
            } else {
              ShowMsgBox("Error","Road segmentation failed.");
            }
            //if (output_filename.indexOf(".shp") >=0 ){
            //  output_filename = output_filename.substring(0,output_filename.indexOf('.shp'));
            //  $.download('./cgi-bin/download.py','name='+output_filename,'get');
            //} else {
            //  $.download('./cgi-bin/download.py','name='+output_filename,'get');
            //}
          });
        } else if (sel_id == 1) {
          // snapping point to road
          var point_uuid = $('#sel-road-snap-point-layer').find(':selected').val(),
              road_uuid = $('#sel-road-snap-road-layer').find(':selected').val(),
              count_col_name = $('#txt-snap-count-col-name').val(),
              road_seg_length = $('#txt-snap-seg-road-length').val();
          var params = {
            'cartodb_uid' : uid,
            'cartodb_key' : key,
            'point_uuid' : point_uuid,
            'road_uuid' : road_uuid,
            'count_col_name' : count_col_name,
            'road_seg_length' : road_seg_length,
          };
          $.get('../road_snap_points/', params).done(function(data) {
            $('#progress_bar_road').hide();
            if ( data["success"] == 1 ) {
              ShowMsgBox("","Snapping points to roads done.");
              if (gViz.GetUUID() == road_uuid) {
                LoadFieldNames();
              }
            } else {
              ShowMsgBox("","Snapping points to roads done.");
            }
          });
        } else if (sel_id == 2) {
          //create weights for roads
          var road_uuid = $('#sel-road-w-layer').find(':selected').val(),
              road_seg_length = $('#txt-w-seg-road-length').val(),
              w_name = $('#txt-road-w-name').val(),
              w_type = $('#sel-road-cont-type').find(':selected').val();
          var params = {
            'cartodb_uid' : uid,
            'cartodb_key' : key,
            'road_uuid' : road_uuid,
            'w_name' : w_name,
            'w_type' : 0,
            'road_seg_length' : road_seg_length,
          };
          $.get('../road_create_w/', params).done(function(data) {
            $('#progress_bar_road').hide();
            if ( data["success"] == 1 ) {
              ShowMsgBox("","Create W for roads done.");
              if (gViz.GetUUID() == road_uuid) {
                LoadWnames();
              }
            } else {
              ShowMsgBox("","Create W for roads fialed.");
            }
          });
              
        }
      },
    },{
      text: "Close",
      click: function() {
        $( this ).dialog( "close" );
      },
    }]
  });
  
  //////////////////////////////////////////////////////////////
  //  Space Time
  //////////////////////////////////////////////////////////////
  $('#datepicker-start').datepicker();
  $('#datepicker-end').datepicker();
  $('#tabs-dlg-spacetime').tabs();
  $( "#spacetime_catalog" ).accordion({
    autoHeight: false});
  $( "#dialog-spacetime" ).dialog({
    height: 490,
    width: 580,
    autoOpen: false,
    modal: false,
    dialogClass: "dialogWithDropShadow",
    buttons: [{
      text: "OK",
      click: function() {
        var poly_uuid = $('#sel-spacetime-table-poly').find(':selected').val(),
            point_uuid = $('#sel-spacetime-table-point').find(':selected').val(),
            count_col_name = $('#txt-spacetime-col-name').val();
        var params = {
          'poly_uuid' : poly_uuid,
          'point_uuid' : point_uuid,
          'count_col_name' : count_col_name
        };
        $.get('../spacetime/', params, function(){
          $('#progress_bar_spacetime').show();
        }).done( function( data ) {
          $('#progress_bar_spacetime').hide();
          if ( data["success"] == 1 ) {
            ShowMsgBox("","Space(time) aggregation done.");
            LoadFieldNames();
          } else {
            ShowMsgBox("Error","Space(time) aggregation failed.");
          }
        });
        $( this ).dialog( "close" );
      },
    },{
      text: "Close",
      click: function() {
        $( this ).dialog( "close" );
      },
    }]
  });
  //////////////////////////////////////////////////////////////
  //  Weights creation
  //////////////////////////////////////////////////////////////
  $('#sel-w-files').change( function() {
    var uuid = gViz.GetUUID();
    var w_name = $('#sel-w-files').val();
    if ( w_name && uuid ) {
      var w_type = $('#sel-w-type').val();
      $.download(
        "../download_w/",
        "uuid=" + uuid + "&w_name=" + w_name + "&w_type=" + w_type,
        "get"
      ); 
    }
    $(this).prop("selectedIndex", -1);
  });
  
  var timeoutRef;
  var checkWname = function() {
    if (!timeoutRef) return;
    timeoutRef = null;
    if (!gViz || !gViz.GetUUID()) return;
    var layer_uuid = gViz.GetUUID(),
        w_name = $("#txt-w-name").val();
    $('#txt-w-name').next().remove();
    if ( layer_uuid && w_name ) { 
      $(html_load_img).insertAfter("#txt-w-name");
      $.get('../check_w/', { 'w_name': w_name, 'layer_uuid':layer_uuid,}, function(){
        $('#txt-w-name').next().remove();
      }).done( function( data ) {
        $('#txt-w-name').next().remove();
        if ( data == "1" ) {
          $('<font color=red>duplicated name</span>').insertAfter($("#txt-w-name"));
        } else {
          $(html_check_img).insertAfter("#txt-w-name");
        }
      }).always( function() {});
    }
  };
  $('#txt-w-name').keypress(function() {
    var el = this;
    if ( timeoutRef ) clearTimeout(timeoutRef);
    timeoutRef = setTimeout(function() {checkWname.call(el);}, 1000);
    $('#txt-w-name').blur(function(){ checkWname.call(el); });
  });
  
  $("#img-id-chk, #img-id-nochk, #img-id-spin").hide();          
  $('#dist-slider').slider({
    min: 0, max: 100,
    slide: function( event, ui ) { $('#txt-dist-thr').val(ui.value); }
  });
  $('#spn-pow-idst, #spn-cont-order, #spn-dist-knn').spinner();
  $('#tabs-dlg-weights').tabs();
  
  $('#sel-w-id').prop("selectedIndex", -1);
  $('#sel-w-id').change(function() {
    var layer_uuid = gViz.GetUUID();
        id_name = $('#sel-w-id').val();
    $("#img-id-chk, #img-id-nochk, #img-id-spin").hide();          
    if (id_name == "") {
      return;
    } else if (id_name == "0") {
      $('#dlg-add-uniqid').dialog('open');
      return;
    } else if (id_name && layer_uuid) {
      $("#img-id-spin").show();          
      $.get('../check_ID/',{'layer_uuid':layer_uuid, 'id_name':id_name},function(){ 
        $("#img-id-spin").show(); 
      }).done(function(data) {
        if ( data == "1" ) {
          $("#img-id-chk").show();          
          $("#img-id-nochk, #img-id-spin").hide();          
        } else {
          $("#img-id-nochk").show();          
          $("#img-id-chk, #img-id-spin").hide();          
        }
      });
    }
  });
  
  $('input:radio[name=rdo-dist]').change(function(){
    dist_method = $('input:radio[name=rdo-dist]:checked').attr("id");
    if (dist_method == 1 && gViz) {
      LoadMinPairDist();
    }
  });
  
  $( "#dialog-weights" ).dialog({
    height: 380, 
    width: 480,
    autoOpen: false, 
    modal: false,
    dialogClass: "dialogWithDropShadow",
    buttons: [{
      text: "Create",
      id: "btn-create-w",
      click: function() {
        if ( !gViz || !gViz.GetUUID()) return;
        var w_name = $('#txt-w-name').val(),
        w_id = $('#sel-w-id').find(":selected").val(),
        active = $('#tabs-dlg-weights').tabs("option","active");
        if ( w_name.length == 0 ) {
          ShowMsgBox("Error", "Weights name can't be empty.");
          return;
        }
        if ( w_id.length == 0 || $('#img-id-nochk').is(":visible") ) {
          ShowMsgBox("Error", "An unique ID for weights creation is required.");
          return;
        }
        var post_param = {
          'layer_uuid': gViz.GetUUID(), 
          'w_id': w_id, 
          'w_name': w_name, 
          'csrfmiddlewaretoken': csrftoken,
        };
        if ( active == 0 ) {
          var cont_type = $('#sel-cont-type').find(":selected").val(),
              cont_order = $('#spn-cont-order').val(),
              cont_ilo = $('#cbx-cont-ilo').prop("checked");
              post_param['cont_type'] = parseInt(cont_type);
              post_param['cont_order'] = parseInt(cont_order);
              post_param['cont_ilo'] = cont_ilo;
        } else if ( active == 1) {
          var dist_value = "",
              dist_metric = $('#sel-dist-metr').val(),
              dist_method =$('input:radio[name=rdo-dist]:checked').attr("id");
          if ( dist_method == 0 ) {
            dist_value = $('#spn-dist-knn').val();
          } else if ( dist_method == 1 ) {
            dist_value = $('#txt-dist-thr').val();
          } else if ( dist_method == 2 ) {
            dist_value = $('#txt-dist-thr').val() + "," + $('#spn-pow-idst').val();
          } else {
            ShowMsgBox("","Please select a distance method.");
            return;
          }
          post_param['dist_metric'] = dist_metric;
          post_param['dist_method'] = dist_method;
          post_param['dist_value'] = parseFloat(dist_value);
        } else if ( active == 2) {
          post_param['kernel_type'] = $("#sel-kel-type").val(); 
          post_param['kernel_nn'] = parseInt($("#txt-kel-nn").val());
        }
  
        // submit request
        $("#btn-create-w").attr("disabled",true).fadeTo(0, 0.5);
        $(html_load_img).insertBefore("#btn-create-w");
        post_param['w_type'] = active;
        
        $.post("../create_weights/", post_param, function(){})
        .done(function( data ) {
          console.log("create_weights", data);
          if ( data["success"] == 1 ) {
            $('#txt-w-name').val("").next().remove();
            $('#sel-w-id').next().remove();
            LoadWnames();
            $('#sel-w-id').prop("selectedIndex", -1);
            ShowMsgBox("","Create weights done.");
            return;
          }
          ShowMsgBox("Error", "Create weights failed.");
        })
        .fail(function() { ShowMsgBox("Error", "Create weights failed."); })
        .always(function(){
          $("#btn-create-w").attr("disabled",false)
            .fadeTo(0, 1)
            .prev().remove();
        });
      }
    },{
      text: "Close",
      click: function() {
        $( this ).dialog( "close" );
      },
    }]
  });
  //////////////////////////////////////////////////////////////
  //  Spatial Regression 
  //////////////////////////////////////////////////////////////
  var prev_obj;
  $( "#tabs" ).tabs();
  $( "#spreg-result-tabs" ).tabs();
  
  $( "#btn_open_model" ).button({icons: {primary: "ui-icon-folder-open"}})
  .click(function() {
    $('#dlg-open-model').dialog('open');
  });
  $( "#btn_save_model" ).button({icons: {primary: "ui-icon-disk"}})
  .click(function() {
    $('#dlg-save-model').dialog('open');
  });
  
  $( "#btn_reset_model" ).button({icons: {primary: "ui-icon-)circle-close"}})
  .click(function() { restSpreg(); });
  
  $( "#btn_preference" ).button({icons:{primary: "ui-icon-gear",}})
  .click(function(){ $('#dialog-preference').dialog('open');});
  
  $( "#btn_result" ).button({icons: {primary: "ui-icon-document",}})
  .click(function(){
    $('#dialog-spreg-result').dialog('open').draggable('disable');
  }).hide();
    
  $( "#btn_create_w" ).button({icons: {primary: "ui-icon-plus",}})
  .click(function(){
    $('#dialog-weights').dialog('open');
  });
  // save spreg result to datasource
  $('#btn-save-predy').click(function() {
    var count=0,
        param;
    $('#txt-spreg-predy').children("table").each(function(i,tbl) {
      var content = $(tbl).html().replace(/\<th\>|\<\/th\>|\<tbody\>|\<\/tbody\>|\<tr\>|\<\/tr\>|\<\/td\>/g,"").replace(/\<td\>/g,",");
      if (param == undefined) param = {};
      param["predy" + i] = content;
      count = i;
    });
    var layer_uuid = gViz.GetUUID();
    if (param && layer_uuid) {
      param["n"] = count+1;
      param["layer_uuid"] = layer_uuid;
      param["csrfmiddlewaretoken"] = csrftoken;
      $(this).attr("disabled", "disabled");
      $(html_load_img).insertAfter("#btn-save-predy");
      $.post("../save_spreg_result/", param, function() {
      }).done( function(result) {
        console.log(result);
      }).always( function() {
        $("#btn-save-predy").next().remove();
        $(html_check_img).insertAfter("#btn-save-predy");
      });
    }
  });
  // save spreg result to csv
  $('#btn-export-predy').on('click', function(event) {
    exportTableToCSV.apply(this, [$('#txt-spreg-predy>table'),'export.csv']);
  });
   // reset Spreg dialog
  var restSpreg = function() {
    $.each($('#x_box li, #y_box li, #ye_box li, #inst_box li, #r_box li'), function(i, v) { $(v).dblclick();});
    $('input[name="model_type"][value="0"]').prop('checked', true)
    $('input[name="method"]').prop('disabled', true)
    $('input[name="method"][value="0"]').prop('checked', true).prop('disabled', false);
    $('input:checkbox[name=stderror]').each(function(i,obj){
      $(obj).prop('checked', false);
    });
  };
  // init Spreg dialg: tabs
  $( "#y_catalog" ).accordion();
  $( "#x_catalog" ).accordion();
  $( "#w_catalog_model" ).accordion();
  $( "#w_catalog_kernel" ).accordion();
  $( "#vars ul li" ).draggable({ helper: "clone"});
  $( ".drop_box ol li" ).dblclick(function() {});
  $( ".drop_box ol" ).droppable({
    activeClass: "ui-state-default",
    hoverClass: "ui-state-hover",
    accept: ":not(div)",
    drop: function(event, ui) {
      $(this).find(".placeholder").remove();
      // customized behavior for different dropbox
      var box_id = $(this).closest("div").attr("id");
      var n_items = $(this).children().length;
      if ( n_items > 0) {
        if (box_id === 'y_box'||box_id==='r_box') 
          return; 
      }
      // drop gragged item
      $("<li></li>").text( ui.draggable.text() ).appendTo( this )
      .dblclick(function(){
        $(this).remove();
        ui.draggable.show();
      });
      ui.draggable.hide();
    }
  }).sortable({
    items: "li:not(.placeholder)",
    sort: function() {
      // gets added unintentionally by droppable interacting with sortable
      // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
      $( this ).removeClass( "ui-state-default" );
    }
  });
  $('#ui-accordion-y_catalog-header-1').click(function() {
    $('#gmm').prop('disabled', false);
    $('#gmm').prop('checked', true);
    $('#ols').prop('checked', false);
    $('#ols').prop('disabled', true);
  });
  $('#ui-accordion-y_catalog-header-1').click(function() {
    $('#gmm').prop('disabled', false);
    $('#gmm').prop('checked', true);
    $('#ols').prop('checked', false);
    $('#ols').prop('disabled', true);
  }); 
  // model type
  $('input:radio[name=model_type]').click( function() {
    var model_type = $(this).val();
    if ( model_type == 0 ) {
      $("input[name='method'], input[name='stderror']").prop('disabled', false);
      $('#ml, #gmm, #het').prop('disabled', true);
      $('#ols').prop('checked', true);
      $("input[name='stderror']").prop('checked', false);
    } else if ( model_type == 1 ) {
      $("input[name='method'], input[name='stderror']").prop('disabled', false);
      $('#ols, #het').prop('disabled', true);
      $('#gmm').prop('checked', true);
      $("input[name='stderror']").prop('checked', false);
    } else if ( model_type == 2 ) {
      $("input[name='method'], input[name='stderror']").prop('disabled', false);
      $('#ols, #white, #hac').prop('disabled', true);
      $('#gmm').prop('checked', true);
      $("input[name='stderror']").prop('checked', false);
    } else if ( model_type == 3 ) {
      $("input[name='method'], input[name='stderror']").prop('disabled', false);
      $('#ols, #ml, #white, #hac').prop('disabled', true);
      $('#gmm').prop('checked', true);
      $("input[name='stderror']").prop('checked', false);
    }
  });
  $('input:radio[name=model_type]:first').click();

  $( "#dialog-preference" ).dialog({
    height: 400,
    width: 580,
    autoOpen: false,
    modal: true,
    dialogClass: "dialogWithDropShadow",
    buttons: {
      "Restore Defaults": function() {
        $( this ).dialog( "close" );
      },
      "Restore System Defaults": function() {
        $( this ).dialog( "close" );
      },
      Cancel: function() {
        $( this ).dialog( "close" );
      },
      "Save": function() {
        console.log($("#form-pref").serialize());
        $.ajax({
        url: "../save_spreg_p/",
          type: "post",
          data: $("#form-pref").serialize(),
          success: function( data ) {}
        });
      },
    }
  });
  $( "#dialog-spreg-result" ).dialog({
    height: 500,
    width: 800,
    autoOpen: false,
    modal: true,
    dialogClass: "dialogWithDropShadow",
    buttons: {
      "Save to pdf": function() {
        //$( this ).dialog( "close" );
        if (gViz && gViz.GetUUID()) {
          var layer_uuid = gViz.GetUUID(),
              txt = $('#txt-spreg-summary').text();
          txt = txt.replace(/"/g, '');
          txt = txt.replace(/<br>/g, '\n');
          txt = txt.replace(/<\/tr>/g, '\n');
          txt = txt.replace(/<\/td>/g, '    ');
          console.log(txt);
          var inputs = '';
          inputs += '<input type="hidden" name="layer_uuid" value="' + layer_uuid + '" />';
          inputs += '<input type="hidden" name="csrfmiddlewaretoken" value="'+csrftoken+'" />';
          inputs += '<input type="hidden" name="text" value="' + txt + '" />';
          jQuery('<form action="../save_pdf/" method="post">' + inputs + '</form>')
          .appendTo('body').submit().remove();
        }
      },
      Cancel: function() {$( this ).dialog( "close" );},
    }
  });
  
  var options = { valueNames: ['name'] };
  var varList = new List('vars', options);
  
  $( "#dialog-regression" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 900,
    height: 600,
    autoOpen: false,
    modal: true,
  });
  $('#btn-w-add-uid').click(function(){
    $('#dlg-add-uniqid').dialog('open');
  });
  $( "#dlg-add-uniqid" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: {
      "Add": function() {
        var that = $(this);
        if (gViz && gViz.GetUUID()) {
          var layer_uuid = gViz.GetUUID(),
              name = $('#uniqid_name').val(),
              conti = true;
          $.each($('#sel-w-id').children(), function(i,j) { 
            if( name == $(j).text()) {
              ShowMsgBox("","Input unique ID field already exists.");
              conti = false;
              return;
            }
          })
          if (conti == true) {
            params = {
              'layer_uuid': layer_uuid, 
              'name': name,
              'csrfmiddlewaretoken' : csrftoken,
            };
            $.post("../add_UID/", params, function() {}).done(function(data) { 
              console.log("add_uid", data); 
              if (data["success"] == 1) {
                LoadFieldNames(function() {
                  $('#sel-w-id').val(name).change();
                });
                that.dialog( "close" );
                ShowMsgBox("", "Add uniue ID successful.");
              }
            });
          }
        }
      },
      Cancel: function() {$(this).dialog("close");},
    }
  });
  $( "#dlg-save-model" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: {
      "Save": function() {
        if (gViz && gViz.GetUUID()) {
          var layer_uuid = gViz.GetUUID(),
              w_list = $.GetValsFromObjs($('#sel-model-w-files :selected')),
              wk_list = $.GetValsFromObjs($('#sel-kernel-w-files :selected')),
              model_type = $('input:radio[name=model_type]:checked').val(),
              method = $('input:radio[name=method]:checked').val(),
              name = $('#model_name').val(),
              x = $.GetTextsFromObjs($('#x_box li')),
              y = $.GetTextsFromObjs($('#y_box li')),
              ye = $.GetTextsFromObjs($('#ye_box li')),
              h = $.GetTextsFromObjs($('#inst_box li')),
              r = $.GetTextsFromObjs($('#r_box li'));
          //var t = $.GetTextsFromObjs($('#t_box li'));
          var t = [],
              error = [0,0,0];
          $('input:checkbox[name=stderror]').each(function(i,obj){
            if (obj.checked) {
              error[i] = 1;
            }
          });
          params = {
            'uuid': uuid,
            'name': name,
            'w': w_list,
            'wk': wk_list,
            'type': model_type,
            'method': method,
            'error': error,
            'x': x, 'y': y, 'ye': ye, "h": h, "r": r, "t": t
          };
          console.log(params);
          $.post("../save_spreg_model/", params, function() {
          }).done(function(data) { 
            console.log(data); 
            loadModelNames();
            ShowMsgBox("","Save model done.");
          });
        }
        $(this).dialog("close");
      },
      Cancel: function() {$( this ).dialog( "close" );},
    }
  });
  $("#dlg-open-model").dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: {
      "Open": function() {
        var layer_uuid = gViz.GetUUID();
        if (layer_uuid) {
          var model_name = $('#open_spreg_model').val();
          if (model_name) {
            $.get("../load_spreg_model/", {
              'uuid':uuid,'name':model_name
            }, function(){})
            .done(function(data) {
              console.log(data);
              if (data["success"] != 1) {
                console.log("load spreg model failed.");
                return;
              }
              resetSpreg();
              $('input[name="model_type"][value='+data['type']+']').prop('checked', true);
              $('input[name="method"][value='+data['method']+']').prop('checked', true);
              var error = data['stderror'];
              $('input:checkbox[name=stderror]').each(function(i,obj){
                if (error[i] == 1) {
                  $(obj).prop('checked', true);
                }
              });
              $.each( data['w'], function(i, w) {
                $('#sel-model-w-files').val(w);
              });
              $.each( data['kw'], function(i, w) {
                $('#sel-kernel-w-files').val(w);
              });
              var load_vars = function( vars, box ) {
                $.each( vars, function(i, v) {
                  if ( v && v.length > 0 ) {
                    if (i == 0) {
                      box.find( ".placeholder" ).remove();
                    }
                    var item = $('#ul-x-variables p').filter(function(i, p){ 
                      return $(p).text() == v;
                    }).parent().hide();
                    var ctn = box.closest("div").children().first();
                    $( "<li></li>" ).text(v).appendTo(ctn).dblclick(function(){
                      $(this).remove();
                      item.show();
                    });
                  }
                });
              };
              load_vars( data['y'], $('#y_box') );
              load_vars( data['x'], $('#x_box') );
              load_vars( data['ye'], $('#ye_box') );
              load_vars( data['h'], $('#inst_box') );
              load_vars( data['r'], $('#r_box') );
              //load_vars( data['t'], $('#t_box') );
            });
          }
        }
        $(this).dialog("close");
      },
      Cancel: function() {$( this ).dialog( "close" );},
    },
  });
 $( "#btn_run" ).button({icons: {primary: "ui-icon-circle-triangle-e",}})
  .click(function() {
    if (!gViz|| !gViz.GetUUID()) return;
    var layer_uuid = gViz.GetUUID();
    var w_list = $.GetValsFromObjs($('#sel-model-w-files :selected'));
    var wk_list = $.GetValsFromObjs($('#sel-kernel-w-files :selected'));
    var model_type = $('input:radio[name=model_type]:checked').val();
    var method = $('input:radio[name=method]:checked').val();
    // y, x, w, 
    var x = $.GetTextsFromObjs($('#x_box li'));
    var y = $.GetTextsFromObjs($('#y_box li'))[0];
    var ye = $.GetTextsFromObjs($('#ye_box li'));
    var h = $.GetTextsFromObjs($('#inst_box li'));
    var r = $.GetTextsFromObjs($('#r_box li'));
    //var t = $.GetTextsFromObjs($('#t_box li'));
    var t = [];
    // check error flag 
    var error = [0,0,0];
    var conti = true;
    $('input:checkbox[name=stderror]').each(function(i,obj){
      if (obj.checked){ 
        error[i] = 1;
        if (i==1 && w_list.length==0) {
          ShowMsgBox("","Please select weights file for model.");
          conti = false;
          return;
        }
        if (i==1 && wk_list.length==0) {
          ShowMsgBox("","Please select kernel weights file for model.");
          conti = false;
          return;
        }
      }
    });
    if (conti==false) return;
    // run model
    $('#dlg-run').dialog("open").html('<img src="img/loading.gif"/><br/>Loading ...');
    $('#dlg-run').siblings('.ui-dialog-titlebar').hide();
    params = {
      'command': 'spatial_regression', 
      'layer_uuid': layer_uuid, 'w': w_list, 'wk': wk_list, 
      'type': model_type, 'method': method, 'error': error, 
      'x': x, 'y': y, 'ye': ye, "h": h, "r": r, "t": t,
      'csrfmiddlewaretoken': csrftoken,
    };
    $.post("../spatial_regression/", params, function() {
      $('#btn_result').hide();
    }).done(function(data) {
      $('#dlg-run').dialog("close");
      try {
        data = JSON.parse(data);
        if (data['success']==1) {
          $('#btn_result').show();
          if (data['report']) {
            var predy = "", 
                summary = "", 
                cnt= 0;
            $.each(data['report'], function(id, result) { 
              cnt+=1;
            });
            cnt = cnt.toString();
            $.each(data['report'], function(id, result) {
              var idx = parseInt(id) + 1;
              summary += "Report " + idx + "/" + cnt + 
                "\n\n"+result['summary'] + "\n\n";
              predy += "<b>Report " + idx + "/" + cnt +"</b><br/><br/>";
              predy += "<table border=1 width=100% id='predy" + id + 
                "'><tr><th>Predicted Values</th><th>Residuals</th></tr>";
              var n = result['predy'][0].length;
              for ( var i=0; i< n; i++ ) {
                predy += "<tr><td>" + result['predy'][0][i] + "</td><td>" + 
                  result['residuals'][0][i] + "</td></tr>";
              }
              predy += "</table><br/><br/>";
            });
            $('#txt-spreg-predy').html(predy);
            $('#txt-spreg-summary').text(summary);
          }
          $('#btn_result').popupDiv('#divPop','Click this button to see result.');
        }
      } catch (e) {
        console.log(e);
      }
    })
    .fail(function(data){ 
      $('#dlg-run').dialog("close");
      ShowMsgBox("Erro","Spatial regression failed.");
    });
  });
  
  //////////////////////////////////////////////////////////////
  //  Thematic Map
  //////////////////////////////////////////////////////////////
  $( "#dlg-quantile-map" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: false,
    beforeClose: function(event,ui){
        $('#dialog-arrow').hide();
    },
    buttons: {
      "Open": function() {
        if (!gViz && !gViz.GetUUID()) return;
        var sel_method = $('#sel-quan-method').val(),
            sel_var = $('#sel-var').val(),
            sel_cat = $('#quan-cate').val();
        if (sel_var == '') {
          ShowMsgBox("Info", "Please select a variable for choropleth map.")
          return;
        }
        if (sel_cat == '') {
          ShowMsgBox("Info", "Please select a category number for choropleth map.")
          return;
        }
        var params = {
          "layer_uuid": gViz.GetUUID(),
          "method": sel_method, 
          "var": sel_var, 
          "k": sel_cat
        };
        $.get('../thematic_map/', params, function(){
        }).done(function(result){
          gMsg = result;
          gViz.PopupThematicMap();
        });
        $(this).dialog("close");
      }, 
      Cancel: function() {
        $( this ).dialog( "close" );},
    },
  });
  //////////////////////////////////////////////////////////////
  //   LISA Map
  //////////////////////////////////////////////////////////////
  $("#dlg-lisa-map").dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: {
      "Open": function() {
        if (!gViz) return;
        $('#progress_bar_lisa').show();
        var sel_var = $('#sel-lisa-var').val();
        var sel_w = $('#sel-lisa-w').val();
        if (!sel_w || sel_w.length == 0) {
          ShowMsgBox("Info", "Please select a weights first. Note: You can create a weights by click the weights creation button");
          return;
        }
        var params = {
          "layer_uuid": gViz.GetUUID(),
          "var": sel_var, 
          "w": sel_w,
        };
        $.ajax({
          timeout: 60000,
          type: 'GET',
          url: '../lisa_map/', 
          data: params, 
        }).done(function(result){
          $('#progress_bar_lisa').hide();
          gMsg = result;
          gViz.PopupThematicMap();
          $(this).dialog("close");
        });
      }, 
      Cancel: function() {$( this ).dialog( "close" );},
    },
  });  
  //////////////////////////////////////////////////////////////
  //  Moran Scatter Plot
  //////////////////////////////////////////////////////////////
  $( "#dlg-moran-scatter-plot" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: {
      "Open": function() {
        if (!gViz && !gViz.GetUUID()) return;
        var sel_var = $('#sel-moran-var').val();
            sel_w = $('#sel-moran-w').val();
        if (!sel_w || sel_w.length == 0) {
          ShowMsgBox("Info", "Please select a weights first. Note: You can create a weights by click the weights creation button");
          return;
        }
        var params = {
          "layer_uuid": gViz.GetUUID(),
          "var_x": sel_var, 
          "wuuid": sel_w,
        };
        $.get('../moran_scatter_plot/', params).done(function(result){
          gMsg = result;
          gViz.PopupMoranScatterPlot();
        });
        $(this).dialog("close");
      }, 
      Cancel: function() {$( this ).dialog( "close" );},
    },
  });
  //////////////////////////////////////////////////////////////
  //  Scatter Plot
  //////////////////////////////////////////////////////////////
  $( "#dlg-scatter-plot" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: {
      "Open": function() {
        if (!gViz && !gViz.GetUUID()) return;
        var sel_x = $('#sel-scatter-x').val();
        var sel_y = $('#sel-scatter-y').val();
        if (sel_x == '' || sel_y == '') {
          ShowMsgBox("Info", "Please select variables for scatter plot.")
          return;
        }
        var params = {
          "layer_uuid": gViz.GetUUID(),
          "var_x": sel_x, 
          "var_y": sel_y
        };
        $.get('../scatter_plot/', params, function(){
        }).done(function(result){
          gMsg = result;
          gViz.PopupScatterPlot();
        });
        $(this).dialog("close");
      }, 
      Cancel: function() {$( this ).dialog( "close" );},
    },
  });
  //////////////////////////////////////////////////////////////
  //  Histogram
  //////////////////////////////////////////////////////////////
  $( "#dlg-histogram" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 400,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: {
      "Open": function() {
        if (!gViz && !gViz.GetUUID()) return;
        var sel_x = $('#sel-histogram-x').val();
        if (sel_x == '') {
          ShowMsgBox("Info", "Please select variable for histogram plot.")
          return;
        }
        var params = {
          "layer_uuid": gViz.GetUUID(),
          "var_x": sel_x, 
        };
        $.get('../histogram/', params, function(){
        }).done(function(result){
          gMsg = result;
          gViz.PopupHistogram();
        });
        $(this).dialog("close");
      }, 
      Cancel: function() {$( this ).dialog( "close" );},
    },
  });
   
});



