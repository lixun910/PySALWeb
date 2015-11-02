
// Author: xunli at asu.edu
define(['jquery', './utils','./cartoProxy','html2canvas','jquery.chosen'], 
       function($, Utils, CartoProxy) {

var window = this;

var CartoDlg = (function($, CartoProxy) {

  var instance;
  
  function init() {
    // singleton
    
    // private
    var userid = null;
    var viz_dict = {}; // vizname: viztitle
    var viztype_dict = {}; // vizname: viztype
    
    function GetCartoViz() {
      $.get("../carto_get_viz/", {}).done(function(data){
        for (var i=0, n=data.length; i<n; i++) {
          var row = data[i];
          if (viz_dict[row.vizname] === undefined) {
            $('#sel-carto-viz').append($('<option>', {value:row.vizname}).text(row.viztitle));
          }
          userid = row.userid;
          viz_dict[row.vizname] = row.viztitle;
          viztype_dict[row.vizname] = row.viztype;
        }
      });
    }
    
    GetCartoViz();
    
    var carto_table_sel = [
      '#sel-carto-table-download', 
      '#sel-file-carto-tables', 
      '#sel-carto-table-count1',
      '#sel-carto-table-count2'
    ];
   
    // one click share to social 
    function ShareScreenshot() {
      require(['ui/mapManager'], function(MapManager) {
      
        //$('#dialog-cartodb').dialog('close');
        
        var canvas_list = $(".paint-canvas");
        
        if (canvas_list && canvas_list.length > 0) {
          // Hack: html2canvas needs to tweek this 
          $('canvas').height($('body').height());
          
          var table_name = MapManager.getInstance().GetMap(0).name;   
          
          html2canvas($('#map-page')[0], {
            allowTaint : false,
            logging: true,
            profile: false,
            useCORS: true,
            //height: $('body').height(),
          }).then(function(canvas) {
            console.log(canvas.toDataURL("image/png"));
            
            $('canvas').css("height","100%");
            var title = $('#txt-carto-vizjson').val();
            
            $.ajax({
              type: "POST",
              url: "../publish_to_social/",
              data: { 
                imageData: canvas.toDataURL("image/png"),
                csrfmiddlewaretoken: csrftoken,
                "table_name" : table_name, 
                "title" : title,
              }
            }).done(function(data) {
              console.log('save canvas:', data); 
            });
          });
        }
      }); // end require()
    }
    
    var dlgPrgBar = $('#progress_bar_cartodb').hide();
    
    var dlgTabs = $('#tabs-dlg-cartodb').tabs();
    
    var dlg = $( "#dialog-cartodb" );
   
    function OpenVizWindow(vizname, viztitle)  {
      var viztype = viztype_dict[vizname];
      if (viztype == 0) {
        window.open(
          '../../static/test.html?uid='+userid+'&vizname='+vizname+'&'+Utils.guid(),
          "_blank",
          "width=900, height=700, scrollbars=yes"
        );
      } else {
        window.open(
          '../../static/cartoviz.html?uid='+userid+'&vizname='+vizname+'&'+Utils.guid(),
          "_blank",
          "width=900, height=700, scrollbars=yes"
        );
      }
    }
    
    $('#sel-carto-viz').change(function(){
      var viz_name= $(this).val(),
          viz_title= $('#sel-carto-viz :selected').text();
      OpenVizWindow(viz_name, viz_title, 0);
    });
    
    $('#btn-cartodb-get-all-tables').click(function(){
      // if (gViz)
      dlgPrgBar.show();
      GetAllTables(function(){dlgPrgBar.hide();});
    });
  
    var fill_carto_tables = function(tables) {
      $.each(carto_table_sel, function(i, sel) {
        $(sel).find('option').remove().end();
        for (var table_name in tables) {
          var geo_type = tables[table_name];
          $(sel).append($('<option>', {value: geo_type}).text(table_name));
        }
        //$(sel).chosen({no_results_text: "Oops, nothing found!",});
      });
    };
  
    var getParams = function(idCtl, keyCtl) {
      var uid = $('#' + idCtl).val(),
          key = $('#' + keyCtl).val();
      return {
        'cartodb_uid' : uid,
        'cartodb_key' : key,
      };
    };
    
    var GetAllTables = function(onSuccess) {
      var params = this.getParams('txt-carto-setup-id', 'txt-carto-setup-key');
      $.get('../carto_get_tables/', params).done(function(data){
        onSuccess();
        fill_carto_tables(data);
      });
    };
  
    function CreateShareViz() {
        var title = $('#txt-carto-vizjson').val(),
            uid = CartoProxy.GetUID(),
            key = CartoProxy.GetKey();
        require(['ui/mapManager', 'ui/basemap'], function(MapManager, Basemap) {
          var mapManager = MapManager.getInstance(),
              n_maps = mapManager.GetNumMaps(),
              basemap =  Basemap.getInstance(),
              viz_confs = [];
                    
          for (var i=0; i<n_maps; i++) {
            var mapcanvas = mapManager.GetMapCanvas(i),
                map = mapcanvas.map,
                fields = [];
                
            for (var fld in map.fields) 
              fields.push(fld);
            
            viz_confs.push({
              'map_name' : map.name,
              'map_type' : mapcanvas.shpType,
              'fields' : fields,
              'legend_name' : map.name,
              'legend_field' : mapcanvas.field,
              'legend_txts' : mapcanvas.legend_txts,
              'bins' : mapcanvas.bins,
              'colors' : mapcanvas.colors,
              'stroke_clr' : mapcanvas.STROKE_CLR,
              'fill_clr' : mapcanvas.FILL_CLR,
              'stroke_width' : mapcanvas.STROKE_WIDTH,
              'alpha' : mapcanvas.ALPHA,
            });
          }
              
          // get plots
          plot_confs = [];
          $('iframe').each(function(idx, obj) {
            var url = obj.src;
            if (url != "") {
              var plot_conf = {},
                  items = url.split("?");
                  
              var pos = $(obj).parent();
              if (pos) 
                plot_conf['pos'] = pos.position();
                  
              var plot_type = items[0].split("/"),
                  plot_type = plot_type[plot_type.length-1],
                  plot_type = plot_type.split(".")[0];
              plot_conf['plot_type'] = plot_type;
              
              var plot_params = items[1].split("&"),
                  n_params = plot_params.length;
              for (var i=0; i<n_params; i++) {
                var param = plot_params[i].split("=");
                plot_conf[param[0]] = param[1];
              }
              
              plot_confs.push(plot_conf);
            }
          });
          
          $.get("../carto_create_viz/", {
            'carto_uid' : uid,
            'carto_key' : key,
            'title' : title,
            'bounds[]' : basemap.GetBounds(),
            'center[]' : basemap.GetCenter(),
            'zoom' : basemap.GetZoom(),
            'tile_idx' : basemap.GetTileIdx(),
            'viz_confs' : JSON.stringify(viz_confs),
            'viz_type' : 0,
            'plot_confs' : JSON.stringify(plot_confs),
          }).done(function(data){
            console.log(data);
            userid = data.userid;
            var vizname = data.vizname,
                viztitle = data.viztitle,
                viztype = data.viztype;
            if (viz_dict[vizname] === undefined) {
              $('#sel-carto-viz').append($('<option>', {value:vizname}).text(viztitle));
              viz_dict[vizname] = viztitle;
              viztype_dict[vizname] = viztype;
            }
            OpenVizWindow(vizname, viztitle, viztype);
          });
          
          dlgPrgBar.hide();
        });
    }
    
    var OnOKClick = function() {
    
      var that = $(this);
      var sel_id = dlgTabs.tabs('option','active'),
          uid = CartoProxy.GetUID(),
          key = CartoProxy.GetKey();
          
      dlgPrgBar.show();
      
      if (sel_id === 0) {
        // setup
        
      } else if (sel_id === 1) {
          
        var auth_provider = $('#auth_provider').val();
        
        Utils.ShowYesNoDlg("Do you want to share this map to your "+auth_provider +"?", function() {
          ShareScreenshot();
          CreateShareViz();
        }, function() {
          CreateShareViz();
        });
          
        
      } else if (sel_id === 2) {
        // download to local disk
        var table_name = $('#sel-carto-table-download').find(':selected').text();
        gViz.CartoDownloadTable(uid, key, table_name, function(msg){
          $('#progress_bar_cartodb').hide();
          var name = msg.name;  
          // create a url and download
          $.download('./cgi-bin/download.py','name='+name,'get');
        });
        
      } else if (sel_id == 3) {
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
        
      } 
    };
    
    dlg.dialog({
      height: 300,
      width: 550,
      autoOpen: false,
      modal: false,
      dialogClass: "dialogWithDropShadow",
      buttons: [{
        text: "OK",
        click:  OnOKClick,
      },{
        text: "Close",
        click: function() {
          $( this ).dialog( "close" );
        },
      }]
    });
    
    return {
      // public
      UpdateTableSel: function(tables) {
        $.each(carto_table_sel, function(i, sel) {
          $(sel).find('option').remove().end();
          for (var table_name in tables) {
            var geo_type = tables[table_name];
            $(sel).append($('<option>', {value: geo_type}).text(table_name));
          }
          //$(sel).chosen({no_results_text: "Oops, nothing found!",});
        });
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

})($, CartoProxy);

return CartoDlg;

});
