
// Author: xunli at asu.edu
define(['jquery', './utils','./cartoProxy', './mapManager', 'd3', 'ss', 'jquery.colorpicker','colorbrewer'], function($, Utils, CartoProxy, MapManager, d3, ss) {

var ChoroplethDlg = (function($){
  var instance;

  function init() {
    // singleton

  // private methods/vars
  var sel_var = $('#sel-var');

  var GetMapCanvas = function() {
    return MapManager.getInstance().GetMapCanvas();
  };

  $('#colorpicker-fill').colorpicker({
    buttonColorize: true, 
    showOn: 'both',
    close: function(evt, clr) {
      clr = '#' + clr.formatted;
      var mapcanvas = GetMapCanvas();
      if (clr != mapcanvas.FILL_CLR)
        mapcanvas.update({'fill_color':clr});
    },
  });
  $('#colorpicker-stroke').colorpicker({
    buttonColorize: true, 
    showOn: 'both',
    close: function(evt, clr) {
      clr = '#' + clr.formatted;
      var mapcanvas = GetMapCanvas();
      if (clr != mapcanvas.STROKE_CLR)
        mapcanvas.update({'stroke_color':clr});
    },
  });
  $('#stroke-width').change(function(){
    var str_wdt = parseFloat($(this).val());
    var mapcanvas = GetMapCanvas();
    if (str_wdt != mapcanvas.STROKE_WIDTH)
      mapcanvas.update({'stroke_width':str_wdt});
  });
  $('#opacity-slider').slider({
    min: 0, max: 1, step: 0.01, value: 0.9,
    slide: function( evt, ui) {
      var opacity = ui.value;
      $('#opacity').text(opacity);
      var mapcanvas = GetMapCanvas();
      mapcanvas.update({'transparency':opacity});
    }
  });
  $('#sel-map-conf').change(function(){
    var config_name = $(this).val(),
      config = gViz.GetMapConfig(),
      sel_conf = config[config_name];
    var mapcanvas = GetMapCanvas();
    mapcanvas.update(sel_conf);
    if ('stroke_color' in sel_conf) $('#colorpicker-stroke').val(sel_conf.stroke_color);
    if ('fill_color' in sel_conf) $('#colorpicker-fill').val(sel_conf.fill_color);
    if ('transparency' in sel_conf) {
      $('#opacity-slider').slider('value',sel_conf.transparency);
      $('#opacity').text(sel_conf.transparency);
    }
    if ('stroke_width' in sel_conf) $('#stroke-width').val(sel_conf.stroke_width);
  });

  var dlg = $( "#dlg-simple-map" );
  dlg.dialog({
    dialogClass: "dialogWithDropShadow",
    width: 350,
    height: 300,
    autoOpen: false,
    modal: false,
    resizable:  false,
    draggable: false,
    beforeClose: function(event,ui){
      $('#dialog-arrow').hide();
    },
    buttons: [{
      text: "Save",
      click: function() {
        //$('#map-conf-name').val($('#sel-map-conf').val());
        //$('#dlg-save-map-conf').dialog('open');
        $( this ).dialog( "close" );
      },
    }]
  });

  var confDlg = $( "#dlg-save-map-conf");
  confDlg.dialog({
    dialogClass: "dialogWithDropShadow",
    width: 500,
    height: 200,
    autoOpen: false,
    modal: true,
    buttons: [{
      text: "Save",
      click: function() {
        var conf_name = $('#map-conf-name').val();
        var params = {
          'layer_uuid' : gViz.GetUUID(),
        'fill_color' : '#' + $('#colorpicker-fill').val(),
        'stroke_color' : '#' + $('#colorpicker-stroke').val(),
        'stroke_width' : parseFloat($('#stroke-width').val()),
        'transparency' : parseFloat($('#opacity').text()),
        'conf_name' : conf_name,
        };
        $.get('../save_map_conf/', params).done(function(results){
          if ('success' in results && results.success == 1) {
            if ($("#sel-map-conf option[value='"+conf_name+"']").length == 0) {
              $('#sel-map-conf').append($('<option selected>').text(conf_name));
            }
            var conf = gViz.GetMapConfig();
            conf[conf_name] = params;
            ShowMsgBox('', "Map Configuration has been saved successfully.")
          } else {
            ShowMsgBox('Error', "Save Map Configuration error.")
          }
        });
        $( this ).dialog( "close" );
      },
    }]
  });

  // fill content of color-selector
  $.each(colorbrewer, function(k,v){
    $('#color-selector').append($("<option></option>").attr("value", k).text(k));
  });

  $( "#dlg-quantile-map" ).dialog({
    dialogClass: "dialogWithDropShadow",
    width: 300,
    height: 300,
    autoOpen: false,
    modal: false,
    resizable:  false,
    draggable: false,
    beforeClose: function(event,ui){
      $('#dialog-arrow').hide();
    },
    buttons: {
      "Open": function() {
        var sel_method = $('#sel-quan-method').val(),
          sel_var = $('#sel-var').val(),
          sel_cat = $('#quan-cate').val();
    
        if (sel_var === '') {
          ShowMsgBox("Info", "Please select a variable for choropleth map.")
          return;
        }
      
        if (sel_cat === '') {
          ShowMsgBox("Info", "Please select a category number for choropleth map.")
          return;
        }
      
        var mapCanvas = MapManager.getInstance().GetMapCanvas(),
          current_map = MapManager.getInstance().GetMap(),
          table_name = current_map.name,
          clr_name = $('#color-selector option:selected').text(),
          k = parseInt(sel_cat),
          colors = colorbrewer[clr_name][k],
          colorTheme = {};
      
        for (var i=0; i<k; i++) {
          colorTheme[colors[i]] = [];	  
        }
      
        function updateUI(col_name, k, bins) {
          var txts = Utils.create_legend($('#legend'), bins, colors); 
          mapCanvas.updateColor(colorTheme, col_name, bins, colors, txts);
          var type = " (" + col_name + ",k=" + k + ")",
              curTreeItem = $($('#sortable-layers li')[0]);
              newLayerName = $('#btnMultiLayer span').text() + type;
              
          $(curTreeItem.children()[1]).text(newLayerName);
        }
      
        if (sel_method === "quantile" || sel_method === "fisher jenks" ||
          sel_method === "equal interval") 
        {  
          CartoProxy.GetVariables(table_name, [sel_var], false, function(result) {
            var data = result[sel_var],
                minX = ss.min(data),
                maxX = ss.max(data),
                scale,
                bins;
                
            if (sel_method === "equal interval") {
              bins = [];
              var itv = (maxX - minX) / k;
              for (var i=1; i<k-1; i++) {
                bins.push(itv*i);
              }
              bins.push(maxX);
              for (var i=0, n=data.length; i<n; i++) {
                var idx = ( data[i] / itv ) | 0;
                if (idx == k) idx = idx -1;
                colorTheme[colors[idx]].push(i);
              }
              
            } else {
              if (sel_method === "quantile") {
                scale = d3.scale.quantile().domain([minX, maxX]).range(
                  d3.range(k).map(function(i) {return colors[i];})
                );
                bins = scale.quantiles();
                
              } else if (sel_method === "fisher jenks") {
                bins = ss.jenks(data, k);
                bins[k] += 0.1;
                bins = bins.slice(1);
                scale = d3.scale.threshold().domain(bins).range(
                  d3.range(k).map(function(i) {return colors[i];})
                );
               
              } 
              for (var i=0, n=data.length; i<n; i++) {
                colorTheme[ scale(data[i]) ].push(i);	      
              }
            }
                          
            updateUI(sel_var, k, bins);
          });
      
        } else {
        
          // we need PYSAL server
          var params = {
            "method": sel_method, 
            "var": sel_var, 
            "k": sel_cat,
            "table_name" :  table_name,
            "carto_uid" : CartoProxy.GetUID(),
            "carto_key" : CartoProxy.GetKey(),
            //"y" : MapManager.getInstance().GetVariable(sel_val, table_name),
          };
          var that = $(this);
          $.get('../d_thematic_map/', params).done(function(data){
        
            var clr_name = $('#color-selector option:selected').text(),
              colors = colorbrewer[clr_name][data.k],
              colorTheme = {};
            for ( var i=0, n = data.id_array.length; i<n; i++ ) {
              colorTheme[colors[i]] = data.id_array[i];
            }
            var legend_txts = Utils.create_legend($('#legend'), data.bins, colors); 
            mapCanvas.updateColor(colorTheme, sel_var, data.bins, colors, legend_txts);
            
            var type = " (" + data.col_name + ",k=" + data.k + ")",
              curTreeItem = $($('#sortable-layers li')[0]);
              newLayerName = $('#btnMultiLayer span').text() + type;
            $(curTreeItem.children()[1]).text(newLayerName);
          
        
            that.dialog("close");
          });
        }
      }, 
      Cancel: function() {
        $( this ).dialog( "close" );
      },
      "Reset": function() {
        $('#legend').hide();
        var mapCanvas = MapManager.getInstance().GetMapCanvas();
        mapCanvas.updateColor(undefined, "", [], [],[]);
        $( this ).dialog( "close" );
      },
    },
  });

  
    return {
      // public methods/vars
      UpdateFields : function(fields) {
        Utils.updateSelector(fields, sel_var, ['integer', 'double']);
      },
    };
  };

  return {
    getInstance : function() {
      if (!instance) {
        instance = init();
      }
      return instance;
    },
  };

})($);

return ChoroplethDlg;
});
