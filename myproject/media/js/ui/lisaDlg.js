
// Author: xunli at asu.edu
define(['jquery', './utils','./mapManager','./cartoProxy','colorbrewer'], function($, Utils, MapManager, CartoProxy) {

var LisaDlg = (function($){
  var instance;

  function init() {
    // singleton

    // private methods/vars
    var sel_lisa_var = $('#sel-lisa-var'),
        prg_bar = $('#progress_bar_lisa');
    
    function ProcessLisaMap(result) {
      var mapCanvas = MapManager.getInstance().GetMapCanvas(),
          colors = colorbrewer['Lisa'][5],
          colorTheme = {};
      for ( var i=0, n = result.id_array.length; i<n; i++ ) {
        colorTheme[colors[i]] = result.id_array[i];
      }
      mapCanvas.updateColor(colorTheme);
      var type = " (" + result.col_name + ", LISA)",
        curTreeItem = $($('#sortable-layers li')[0]);
        newLayerName = $('#btnMultiLayer span').text() + type;
      $(curTreeItem.children()[1]).text(newLayerName);
      Utils.create_legend($('#legend'), result.bins, colors); 
    } 
  
    $("#dlg-lisa-map").dialog({
      dialogClass: "dialogWithDropShadow",
      width: 480,
      height: 400,
      autoOpen: false,
      modal: false,
      resizable:  false,
      draggable: false,
      open: function(event, ui) {
        $('#tabs-dlg-weights').appendTo('#lisa-weights-plugin');
      },
      beforeClose: function(event,ui){
        $('#dialog-arrow').hide();
      },
      buttons: {
        "Open": function() {
          prg_bar.show();
          var sel_var = $('#sel-lisa-var').val();
          var map = MapManager.getInstance().GetMap(); 
  
          if (map.uuid)  {
            // to PySAL server
            var params = {
              "layer_uuid": map.uuid,
              "var": sel_var, 
              "w": sel_w,
            };
            var that = $(this);
            $.get('../lisa_map/', params).done(function(result) {
              ProcessLisaMap(result);
              prg_bar.hide();
              that.dialog("close");
            });
        
          } else if (map.name) {
            // to cartodb
            var table_name = map.name;
        
            require(['ui/weightsDlg', 'geoda/esda/local_moran'], function(WeightsDlg, Moran_Local) {
              var w_conf = WeightsDlg.getInstance().GetCartoWeights();
              var moran_w, moran_y, moran_timer;
        
              function MoranI() {
                if (moran_w === undefined || moran_y === undefined) {
                  if (moran_timer === undefined)
                    moran_timer = setTimeout(MoranI, 10);
                } else {
                  clearTimeout(moran_timer);
                  // compute  spatial lagged y
                  var lm = new Moran_Local(moran_y, moran_w);
                  var p_sim = lm.p_sim,
                      q = lm.q,
                      not_sig = [], 
                      cluster1 = [], cluster2 = [], cluster3 = [], cluster4 = []; 
                  for (var i=0, n=q.length; i<n; i++) {
                    if (p_sim[i] < 0.05) {
                      if (q[i] === 1) cluster1.push(i);
                      else if (q[i] === 2) cluster2.push(i);
                      else if (q[i] === 3) cluster3.push(i);
                      else if (q[i] === 4) cluster4.push(i);
                    } else {
                      not_sig.push(i);
                    }
                  }
                  ProcessLisaMap({
                    'method': 'lisa',
                    'col_name': sel_var,
                    'bins': ["Not Significant","High-High","Low-High","Low-Low","Hight-Low"],
                    'id_array': [not_sig, cluster1, cluster2, cluster3, cluster4],
                  });
                  prg_bar.hide();
                  that.dialog("close");
                }
              } // end function MoranI()
              CartoProxy.GetVariables(table_name, [sel_var], function(data){
                moran_y = data[sel_var];
                MoranI();
              });
              if (w_conf.w_type === 0) {
                CartoProxy.CreateContiguityWeights(table_name, w_conf, function(w){
                  moran_w = w;
                  MoranI();
                });
              } else if (w_conf.w_type === 1) {
                CartoProxy.CreateDistanceWeights(table_name, w_conf, function(w){
                  moran_w = w;
                  MoranI();
                });
              } else if (w_conf.w_type === 2) {
                CartoProxy.CreateKernelWeights(table_name, w_conf, function(w){
                  moran_w = w;
                  MoranI();
                });
              }
            }); // end require
          }
        }, 
        Cancel: function() {$( this ).dialog( "close" );},
      },
    });  // end dialog
  
    return {
      // public methods/vars
      UpdateFields : function(fields) {
        Utils.updateSelector(fields, sel_lisa_var, ['integer', 'double']);
      },
    };
  } // end init()
    
  return {
    getInstance : function() {
      if (!instance) {
        instance = init();
      }
      return instance;
    },
  };

})($, Utils);

return LisaDlg;
});