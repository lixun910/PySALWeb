

// Author: xunli at asu.edu
define(['jquery','./msgbox', './message', './cartoProxy', './cartodbDlg', './mapManager', './uiManager'], 
function($, MsgBox, M, CartoProxy, CartoDlg, MapManager, UIManager) {

var OpenFileDlg = (function() {

  var instance;
  
  function init() {
    // singleton
    
    // private
    var dlg = $("#dialog-open-file");
    var dlgPrgBar = $('#progress_bar_openfile');
    var dlgTabs = $('#tabs-dlg-open-file').tabs();
    var idEl = $('#txt-carto-id');
    var keyEl = $('#txt-carto-key');
    
    // detect if user's space empty -- show drag&drag tab
    if($('#tabs-1').text().indexOf('a') > 0) {
      dlgTabs.tabs('option','active', 0);
    }  else {
      dlgTabs.tabs('option','active', 1);
    }
    
    function GetCartoTables() {
      dlgPrgBar.show();
      var uid = idEl.val(),
          key = keyEl.val();
      CartoProxy.GetAllTables(uid, key, function(tables) {
        dlgPrgBar.hide();
        CartoDlg.getInstance().UpdateTableSel(tables);
      });
    } 
    
    GetCartoTables();
    
    // hookup refresh button in cartodb tab  
    $('#btn-file-cartodb-get-all-tables').click(function(){
      GetCartoTables();
    });
  
    // hookup file dialog OK button 
    var OnOKClick = function() {
      var sel_id = dlgTabs.tabs('option','active');
      if (sel_id === 0) {
        var table_name = $('#sel-file-carto-tables').find(':selected').text(),
            geo_type = $('#sel-file-carto-tables').find(':selected').val();
        if (table_name === "")  {
          MsgBox.getInstance().Show(M.m100001, M.m100002);
          return;
        }
        dlgPrgBar.show();
        CartoProxy.DownloadTable(table_name, function(data){
          require(['ui/mapManager'], function(MapManager){
            dlgPrgBar.hide();
            MapManager.getInstance().AddMap(data, function(map){
              CartoProxy.GetFields(table_name, function(fields){
                map.fields = fields;
                UIManager.getInstance().SetupMap(map);
              });
            });
          });
        });
        /*
        if ($('#chk-carto-download').is(':checked')) {
          $.get('../carto_download_table/', {uid:uid, key:key, table:table_name})
          .done(function(data) {
          });
        } else {
          CartoProxy.GetGeomType(uid, key, table_name, function(geotype){
            var basemap = Basemap.getInstance();
            basemap.ShowCartoDBMap(uid, key, table_name, geotype);
          });
        } 
        */
        require(['ui/openfileDlg', 'ui/choroplethDlg', 'ui/histogramDlg', 'ui/lisaDlg', 'ui/moranDlg', 'ui/networkDlg', 'ui/scatterDlg', 'ui/spacetimeDlg', 'ui/spregDlg', 'ui/weightsDlg'], function(FileDlg, ChoroplethDlg, HistogramDlg, LisaDlg, MoranDlg, NetworkDlg, ScatterDlg, SpacetimeDlg, SpregDlg, WeightsDlg){
          var fileDlg = FileDlg.getInstance();
          var cartoDlg = CartoDlg.getInstance();
          var choroDlg = ChoroplethDlg.getInstance();
          var histoDlg = HistogramDlg.getInstance();
          var lisaDlg = LisaDlg.getInstance();
          var moranDlg = MoranDlg.getInstance();
          var netwDlg = NetworkDlg.getInstance();
          var scatDlg = ScatterDlg.getInstance();
          var spacetimeDlg = SpacetimeDlg.getInstance();
          var spregDlg = SpregDlg.getInstance();
          var wDlg = WeightsDlg.getInstance();
         
          var ui = UIManager.getInstance(); 
          ui.RegistDialogs([fileDlg, cartoDlg, choroDlg, histoDlg, lisaDlg, moranDlg, netwDlg, scatDlg, spacetimeDlg, spregDlg, wDlg]); 

        });
      }
    };
    
    dlg.dialog({
      height: 450,
      width: 500,
      autoOpen: false,
      modal: false,
      dialogClass: "dialogWithDropShadow",
      buttons: [{
        text: "OK",
        click: OnOKClick,
      },{
        text: "Close",
        click: function() { $( this ).dialog( "close" );},
      }]
    });
    
    dlg.dialog('open');
    
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
 
    
    return {
      // public
      Show : function() {
        dlg.dialog('open');
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

})();

return OpenFileDlg;

});
