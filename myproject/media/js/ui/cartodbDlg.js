
// Author: xunli at asu.edu
define(['jquery', './cartoProxy'], function($, CartoProxy) {

var CartoDlg = (function($, CartoProxy) {

  var instance;
  
  function init() {
    // singleton
    
    // private
    var carto_table_sel = [
      '#sel-carto-table-download', 
      '#sel-file-carto-tables', 
      '#sel-carto-table-count1',
      '#sel-carto-table-count2'
    ];
    
    var dlgPrgBar = $('#progress_bar_cartodb').hide();
    
    var dlgTabs = $('#tabs-dlg-cartodb').tabs();
    
    var dlg = $( "#dialog-cartodb" );
    
    
    $('#btn-cartodb-get-all-tables').click(function(){
      // if (gViz)
      self.dlgPrgBar.show();
      self.GetAllTables(function(){self.dlgPrgBar.hide();});
    });
  
    var fill_carto_tables = function(tables) {
      $.each(carto_table_sel, function(i, sel) {
        $(sel).find('option').remove().end();
        for (var table_name in tables) {
          var geo_type = tables[table_name];
          $(sel).append($('<option>', {value: geo_type}).text(table_name));
        }
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
  
    var OnOKClick = function() {
    
      var that = $(this);
      var sel_id = self.dlgTabs.tabs('option','active'),
          uid = $('#txt-carto-setup-id').val(),
          key = $('#txt-carto-setup-key').val();
          
      self.dlgPrgBar.show();
      
      if (sel_id === 0) {
        // setup
        self.GetAllTables(function(msg) {
          $('#progress_bar_cartodb').hide();
          fill_carto_tables(msg['tables']);
        });
        
      } else if (sel_id === 1) {
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
    };
    
    dlg.dialog({
      height: 500,
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
