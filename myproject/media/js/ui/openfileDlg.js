

// Author: xunli at asu.edu
define(['jquery','./utils','./msgbox', './message', './cartoProxy', './cartodbDlg', './mapManager', './uiManager'], 
function($, Utils, MsgBox, M, CartoProxy, CartoDlg, MapManager, UIManager) {

var OpenFileDlg = (function() {

  var instance;
  
  function init() {
    // singleton
    
    // private
    var dlg = $("#dialog-open-file"),
        dlgPrgBar = $('#progress_bar_openfile'),
        dlgTabs = $('#tabs-dlg-open-file').tabs(),
        idEl = $('#txt-carto-id'),
        keyEl = $('#txt-carto-key'),
        googleKeywords = $('#keywords'),
        googleKeyEl = $('#google-key');
    
    var google_types = ["accounting", "airport", "amusement_park","aquarium","art_gallery","atm","bakery","bank","bar","beauty_salon","bicycle_store","book_store","bowling_alley","bus_station","cafe","campground","car_dealer","car_rental","car_repair","car_wash","casino","cemetery","church","city_hall","clothing_store","convenience_store","courthouse","dentist","department_store","doctor","electrician","electronics_store","embassy","establishment","finance","fire_station","florist","food","funeral_home","furniture_store","gas_station","general_contractor","grocery_or_supermarket","gym","hair_care","hardware_store","health","hindu_temple","home_goods_store","hospital","insurance_agency","jewelry_store","laundry","lawyer","library","liquor_store","local_government_office","locksmith","lodging","meal_delivery","meal_takeaway","mosque","movie_rental","movie_theater","moving_company","museum","night_club","painter","park","parking","pet_store","pharmacy","physiotherapist","place_of_worship","plumber","police","post_office","real_estate_agency","restaurant","roofing_contractor","rv_park","school","shoe_store","shopping_mall","spa","stadium","storage","store","subway_station","synagogue","taxi_stand","train_station","travel_agency","university","veterinary_care","zoo",];
    
    googleKeywords.autocomplete({
      source: google_types
    });

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
  
    function AddCartoDBTableAsMap(table_name) {
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
    }
 
    function InitDialogs() {
      var ui = UIManager.getInstance(); 
      if (ui.IsDialogSetup()) {
        require(['ui/openfileDlg', 'ui/choroplethDlg', 'ui/histogramDlg', 'ui/lisaDlg', 'ui/moranDlg', 'ui/networkDlg', 'ui/scatterDlg', 'ui/spacetimeDlg', 'ui/spregDlg', 'ui/weightsDlg', 'ui/scattermatrixDlg', 'ui/parcoordsDlg'], function(FileDlg, ChoroplethDlg, HistogramDlg, LisaDlg, MoranDlg, NetworkDlg, ScatterDlg, SpacetimeDlg, SpregDlg, WeightsDlg, ScatterMatrixDlg, ParcoordsDlg){
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
          var scatMatrixDlg = ScatterMatrixDlg.getInstance();
          var parcoordsDlg = ParcoordsDlg.getInstance();
         
          ui.RegistDialogs([fileDlg, cartoDlg, choroDlg, histoDlg, lisaDlg, moranDlg, netwDlg, scatDlg, spacetimeDlg, spregDlg, wDlg, scatMatrixDlg, parcoordsDlg]); 
        });
      }
    } 
    
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
        AddCartoDBTableAsMap(table_name);
        InitDialogs();
        
      } else if (sel_id === 1) {
        var key = googleKeyEl.val();
        if (key === "" || key === undefined) {
          MsgBox.getInstance().Show("", "Please input Google Maps API key");
          return;
        }
        var keyword = googleKeywords.val();
        if (keyword === "" || keyword === undefined) {
          MsgBox.getInstance().Show("", "Please input a search keyword");
          return;
        }
        require(['ui/basemap'], function(Basemap){
          try {
            var bounds = Basemap.getInstance().GetBounds();
            //return [sw.lat, sw.lng, ne.lat, ne.lng];
            dlgPrgBar.show();
            $.get('../google_search_carto/', {
              'bounds[]' : bounds,
              'gkey' : key,
              'name' : keyword + Utils.guid(),
              'q' : keyword,
              'carto_uid' : CartoProxy.GetUID(),
              'carto_key' : CartoProxy.GetKey(),
            }).done(function(data){
              console.log(data);
              AddCartoDBTableAsMap(data.table_name);
              //data.status;
            });
          } catch(e) {
            console.log(e);
            MsgBox.getInstance().Show("", "Please load a map first.");
          }
        });
      }
    };
    
    dlg.dialog({
      height: 450,
      width: 500,
      autoOpen: false,
      modal: false,
      dialogClass: "dialogWithDropShadow",
      buttons: [
        {text: "OK",click: OnOKClick,},
        {text: "Close",click: function() { $( this ).dialog( "close" );}}
      ]
    });
    dlg.dialog('open');
    
    var dropZone = document.getElementById('drop_zone');
    var progress = document.querySelector('.percent');
    
    if (typeof window.FileReader === 'undefined') {
      console.log( 'File API not available.');
    }
    
    function UpdateProgress(evt) {
      // evt is an ProgressEvent.
      if (evt.lengthComputable) {
        var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded < 100) {
          progress.style.width = percentLoaded + '%';
          progress.textContent = percentLoaded + '%';
        }
      }
    }
    
    function UploadZipToCarto(blob, callback) {
        var formData = new FormData();
        formData.append('userfile', blob, "upload.zip");
        formData.append('csrfmiddlewaretoken', csrftoken);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '../upload_to_carto/');
        xhr.onload = function() {
          console.log("[Upload]", this.responseText);
          try{
            var metadata = JSON.parse(this.responseText);
            InitDialogs(metadata);
          } catch(e){
            console.log("[Error][Upload Files]", e);
          }
          ShowPrgDiv('', false);
          if (callback) callback();
        }; 
        xhr.upload.onprogress = UpdateProgress;
        xhr.send(formData);
    }
    
    function ProcessDropFiles(files, callback) {
      ShowPrgDiv('uploading...', true);
      var n = files.length,
          fileCnt = 0,
          zipWriter;
          
      function addFile(f, onend) {
        zipWriter.add(f.name, new zip.BlobReader(f), onend); 
      }
      
      function OnAddFile() {
        fileCnt += 1; 
        if (fileCnt < n) {
          addFile(files[fileCnt], OnAddFile);
        } else {
          zipWriter.close(function(blob){
            UploadZipToCarto(blob, callback);
          });
        }
      }
      zip.createWriter(new zip.BlobWriter(), function(writer){
        zipWriter = writer;
        addFile(files[0], OnAddFile);
      });
    }
    
    function HandleDropZipFile(f) {
      // find .shp file and .json file and .csv file and show map
    }
    
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
      
      var files = evt.dataTransfer.files, // FileList object.
          bShp=0, shpFile, dbfFile, shxFile, prjFile, proj,
          bJson=0, jsonFile,
          bCsv=0, csvFile;
      
      var reader = new FileReader();
      reader.onload = function(e) {
        console.log(reader.result);
        // read *.prj file
        var ip = reader.result;
        proj = proj4(ip, proj4.defs('WGS84'));
      };
          
      for (var i=0, n=files.length; i<n; i++) {
        var f = files[i],
            name = f.name,
            suffix = getSuffix(name);
            
        if (suffix === "zip") { // extract zip file
          HandleDropZipFile(f);
          UploadZipToCarto(f, function(){
            // Ensure that the progress bar displays 100% at the end.
            progress.style.width = '100%';
            progress.textContent = '100%';
            setTimeout("document.getElementById('progress_bar').className='';", 1000);
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
          bShp += 1;
          prjFile = f;
          reader.readAsText(f);
        }     
      }
      
      // check files
      if (bJson < 1 && bShp > 0 && bShp < 4) {
        ShowMsgBox("Error", "Please drag&drop three files (*.shp, *.dbf, *.shx and *.prj)  at the same time. (Tips: use ctrl (windows) or command (mac) to select multiple files.)");
        return false;
      } 
      if (proj) {
        ShowMsgBox("Info", "The *.prj file is not valid."); 
        return;
      }
      // compress the file to zip? no, let users to zip the files if they want 
      // to upload fast
      UploadFilesToCarto(files, function(){
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
