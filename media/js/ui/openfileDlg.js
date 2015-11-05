

// Author: xunli at asu.edu
define(['jquery','./utils','./msgbox', './message', './cartoProxy', './mapManager', './uiManager','proj4'], 
function($, Utils, MsgBox, M, CartoProxy, MapManager, UIManager, proj4) {

// plugin
$.fn.extend({
    donetyping: function(callback,timeout){
        timeout = timeout || 1e3; // 1 second default timeout
        var timeoutReference,
            doneTyping = function(el){
                if (!timeoutReference) return;
                timeoutReference = null;
                callback.call(el);
            };
        return this.each(function(i,el){
            var $el = $(el);
            // Chrome Fix (Use keyup over keypress to detect backspace)
            // thank you @palerdot
            $el.is(':input') && $el.on('keyup keypress paste',function(e){
                // This catches the backspace button in chrome, but also prevents
                // the event from triggering too premptively. Without this line,
                // using tab/shift+tab will make the focused element fire the callback.
                if (e.type=='keyup' && e.keyCode!=8) return;
                
                // Check if timeout has been set. If it has, "reset" the clock and
                // start over again.
                if (timeoutReference) clearTimeout(timeoutReference);
                timeoutReference = setTimeout(function(){
                    // if we made it here, our timeout has elapsed. Fire the
                    // callback
                    doneTyping(el);
                }, timeout);
            }).on('blur',function(){
                // If we can, fire the event since we're leaving the field
                doneTyping(el);
            });
        });
    }
});

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
   
    keyEl.donetyping(function() {
      GetCartoTables();
      CartoProxy.SaveAccount();
    });
    
    CartoProxy.GetAccount(function(uid, key){
      idEl.val(uid);
      keyEl.val(key);
      $('#txt-carto-setup-id').val(uid);
      $('#txt-carto-setup-key').val(key);
      GetCartoTables();
    });
    
    var google_types = ["accounting", "airport", "amusement_park","aquarium","art_gallery","atm","bakery","bank","bar","beauty_salon","bicycle_store","book_store","bowling_alley","bus_station","cafe","campground","car_dealer","car_rental","car_repair","car_wash","casino","cemetery","church","city_hall","clothing_store","convenience_store","courthouse","dentist","department_store","doctor","electrician","electronics_store","embassy","establishment","finance","fire_station","florist","food","funeral_home","furniture_store","gas_station","general_contractor","grocery_or_supermarket","gym","hair_care","hardware_store","health","hindu_temple","home_goods_store","hospital","insurance_agency","jewelry_store","laundry","lawyer","library","liquor_store","local_government_office","locksmith","lodging","meal_delivery","meal_takeaway","mosque","movie_rental","movie_theater","moving_company","museum","night_club","painter","park","parking","pet_store","pharmacy","physiotherapist","place_of_worship","plumber","police","post_office","real_estate_agency","restaurant","roofing_contractor","rv_park","school","shoe_store","shopping_mall","spa","stadium","storage","store","subway_station","synagogue","taxi_stand","train_station","travel_agency","university","veterinary_care","zoo",];
    
    googleKeywords.autocomplete({source: google_types});
    
    googleKeyEl.donetyping(function() {});
    
    $.get('../get_google_key/').done(function(data) {
      if (data && data.key)
        googleKeyEl.val(data.key);
    });
    

    // Get table names from CartoDB account
    function GetCartoTables() {
      var uid = idEl.val(),
          key = keyEl.val();
      if (uid === "" || key === "") return;
      dlgPrgBar.show();
      CartoProxy.SetUID(uid);
      CartoProxy.SetKey(key);
      CartoProxy.GetAllTables(uid, key, function(tables) {
        dlgPrgBar.hide();
        require(['ui/cartodbDlg', 'ui/spacetimeDlg', 'ui/networkDlg'], function(CartoDlg, SpacetimeDlg, NetworkDlg){
          CartoDlg.getInstance().UpdateTableSel(tables);
          CartoProxy.GetGeomTypes(tables, function(tbl_geo){
            //console.log(tbl_geo);
            SpacetimeDlg.getInstance().UpdateTableSel(tbl_geo);
            NetworkDlg.getInstance().UpdateTableSel(tbl_geo);
          });
        });
      });
    } 
    
    GetCartoTables();
    
    var ShowPrgDiv = function(msg, visible) {
      if (visible == true) {
        $('#prgInfo span').text(msg);
        $('#prgInfo').show();
      } else {
        $('#prgInfo').hide();
      }
    };
    
    // hookup refresh button in cartodb tab  
    $('#btn-file-cartodb-get-all-tables').click(function(){
      GetCartoTables();
    });
  
    function AddCartoDBTableAsMap(table_name, callback) {
      dlgPrgBar.show();
      CartoProxy.DownloadTable(table_name, function(data){
        require(['ui/mapManager'], function(MapManager){
          dlgPrgBar.hide();
          MapManager.getInstance().AddMap(data, function(map){
            // add map name to space-time dialog
            GetCartoTables();
            //$('#sel-spacetime-table-point')
            CartoProxy.GetFields(table_name, function(fields){
              map.fields = fields;
              UIManager.getInstance().SetupMap(map);
              if (callback) callback();
            });
          });
        });
      });
    }
 
    function InitDialogs() {
      var ui = UIManager.getInstance(); 
      if (ui.IsDialogSetup()) {
        require(['ui/openfileDlg', 'ui/cartodbDlg', 'ui/choroplethDlg', 'ui/histogramDlg', 'ui/lisaDlg', 'ui/moranDlg', 'ui/networkDlg', 'ui/scatterDlg', 'ui/spacetimeDlg', 'ui/spregDlg', 'ui/weightsDlg', 'ui/scattermatrixDlg', 'ui/parcoordsDlg', 'ui/boxplotDlg'], 
        function(FileDlg, CartoDlg, ChoroplethDlg, HistogramDlg, LisaDlg, MoranDlg, NetworkDlg, ScatterDlg, SpacetimeDlg, SpregDlg, WeightsDlg, ScatterMatrixDlg, ParcoordsDlg, BoxplotDlg){
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
          var boxplotDlg = BoxplotDlg.getInstance();
         
          ui.RegistDialogs([fileDlg, cartoDlg, choroDlg, histoDlg, lisaDlg, moranDlg, netwDlg, scatDlg, spacetimeDlg, spregDlg, wDlg, scatMatrixDlg, parcoordsDlg, boxplotDlg]); 
        });
      }
    } 
    
    var bAccepts = false;
    
    // hookup file dialog OK button 
    var OnOKClick = function() {
      bAccepts = true;
      var sel_id = dlgTabs.tabs('option','active'),
          that = $(this);
      if (sel_id === 0) {
        that.attr("disabled", "disabled");
        var table_name = $('#sel-file-carto-tables').find(':selected').text();
        if (table_name === "")  {
          MsgBox.getInstance().Show(M.m100001, M.m100002);
          return;
        }
        AddCartoDBTableAsMap(table_name, function(){
          that.dialog("close");
        });
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
            $.get('../save_google_key/', {'key': googleKeyEl.val()}).done(function(){});
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
              that.dialog("close");
              
            });
          } catch(e) {
            console.log(e);
            MsgBox.getInstance().Show("", "Please load a map first.");
            return;
          }
        });
      }
    };
    
    // the main OpenFile Dialog
    dlg.dialog({
      height: 480,
      width: 670,
      autoOpen: false,
      modal: false,
      dialogClass: "dialogWithDropShadow",
      close : function() { 
        if (bAccepts) 
          $( '#btnOpenData').css("opacity", "0.2"); 
        else  
          $( '#btnOpenData').css("opacity", "1.0");
      },
      buttons: [
        {text: "OK",click: OnOKClick,},
        {text: "Close",click: function() { 
            $( this ).dialog( "close" );
            $( '#btnOpenData').css("opacity", "1.0");
          }
        }
      ]
    });
    dlg.dialog('open');
    
    // Drag and Drop elements
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
    
    // upload drag & drop zip file to CartoDB via our server
    function UploadZipToCarto(blob, callback) {
      var formData = new FormData();
      formData.append('userfile', blob, "upload.zip");
      formData.append('csrfmiddlewaretoken', csrftoken);
      formData.append('carto_uid', CartoProxy.GetUID());
      formData.append('carto_key', CartoProxy.GetKey());
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '../upload_zipfile_to_carto/');
      xhr.onload = function() {
        console.log("[Upload ZipFile]", this.responseText);
        try{
          var result = JSON.parse(this.responseText);
          if (result["success"] == 0) {
            MsgBox.getInstance().Show("Error", "Upload Zip file to CartoDB failed. Please try again or contact administror.");
            return;
          }
          InitDialogs();
          // need to get tables from cartodb, get fields from cartodb using returned table_name
          if (callback) callback(result["table_name"]);
        } catch(e){
          console.log("[Error][Upload ZipFile]", e);
        }
        ShowPrgDiv('', false);
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
    
    function HandleDropZipFile(f, callback) {
      // find .shp file or .json file and show map
      
      var bShp=0;
      zip.createReader(new zip.BlobReader(f), function(zipReader) {
        zipReader.getEntries(function(entries) {
        
          var i = 0,
              n = entries.length,
              bShp = false,
              bShx = false,
              bDbf = false,
              bPrj = false,
              shpFile, dbfFile, prjFile,
              fileName = '',
              proj;
              
          entries.forEach(function(entry) {
            var suffix = Utils.getSuffix(entry.filename);
            var writer;
            if (suffix === 'json' || suffix === 'geojson' || suffix === 'prj') {
              writer = new zip.TextWriter();
            } else {
              writer = new zip.BlobWriter();
            }
            
            entry.getData(writer, function(o) {
              i += 1;
              if (entry.filename[0] === '_') 
                return;
                
              if (suffix === 'geojson' || suffix === 'json') {
                o = JSON.parse(o);
                data = {
                  'file_type' : 'json',
                  'file_name' : entry.filename,
                  'file_content' : o,
                };
                if (callback)
                  callback(data);
                return;
              } else if (suffix === "shp") {
                bShp = true;
                shpFile = o;
                fileName = entry.filename;
              } else if (suffix === "shx") {
                bShx = true;
              } else if (suffix === "dbf") {
                bDbf = true;
                dbfFile = o;
              } else if (suffix === "prj") {
                bPrj = true;
                prjFile = o;
                proj = proj4(o, proj4.defs('WGS84'));
                if (proj == undefined) {
                  MsgBox.getInstance().Show("Error", "Please drag&drop three files (*.shp, *.dbf, *.shx and *.prj)  at the same time. (Tips: use ctrl (windows) or command (mac) to select multiple files.)");
                  return false;
                }
              }
              
              if (i==n) {
                if (bShp && bShx && bDbf && bPrj) {
                  data = {
                    'file_type' : 'shp',
                    'file_name' : entry.filename,
                    'file_content' :  {'shp': shpFile, 'dbf' : dbfFile, 'prj':prjFile},
                  };
                  if (callback)
                    callback(data);
                  return;
                } else {
                  MsgBox.getInstance().Show("Error", "Please drag&drop three files (*.shp, *.dbf, *.shx and *.prj)  at the same time. (Tips: use ctrl (windows) or command (mac) to select multiple files.)");
                  return false;
                }
              }
            }); // entry.getData() 
          }); // end entries.forEach()
        }); // end zipReader.getEntries()
      }); // end zip.createReader()
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
      
      var files = evt.dataTransfer.files; // FileList object.
      
      for (var i=0, n=files.length; i<n; i++) {
        var f = files[i],
            suffix = Utils.getSuffix(f.name);
            
        if (suffix === "zip") { // extract zip file
          HandleDropZipFile(f, function(data){
            /**
              data = {
                 'file_type' : 'shp',
                 'file_name' : shpFile.name,
                 'file_content' : {'shp': shpFile, 'dbf' : dbfFile, 'prj':prjFile},
              };
            */
            progress.style.width = '50%';
            progress.textContent = '50%';
            require(['ui/mapManager'], function(MapManager){
              dlgPrgBar.hide();
              MapManager.getInstance().AddMap(data, function(map){
                // wait until upload completed
                UploadZipToCarto(f, function(table_name){
                
                  // update map.name retrieved from cartodb
                  map.name = table_name;
                  
                  // Ensure that the progress bar displays 100% at the end.
                  progress.style.width = '100%';
                  progress.textContent = '100%';
                  setTimeout(function(){
                    //document.getElementById('progress_bar').className='';
                    progress.style.opacity = 0;
                  }, 2000);
                  
                  // add map name to space-time dialog
                  GetCartoTables();
                  CartoProxy.GetFields(table_name, function(fields){
                    map.fields = fields;
                    UIManager.getInstance().SetupMap(map);
                    $('#dialog-open-file').dialog('close');
                  });
                  
                });  // end UploadZipToCarto()
                
              }); // end AddMap()
            }); // end require[]
          }); // end HandleDropZipFile()
          return;
        }  // end if (suffix==zip)
      } // end for()
      
      
      //
      MsgBox.getInstance().Show("Error", "Please drag&drop a Zip file of *.json or (*.shp  + *.dbf + *.shx + *.prj).");
      
    }; // end dropZone.ondrop()
    
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
        var suffix = Utils.getSuffix(fileLink);
        var params = {
          'csrfmiddlewaretoken':  csrftoken,
          'carto_uid' : CartoProxy.GetUID(),
          'carto_key' : CartoProxy.GetKey(),
        };
        if (suffix === 'zip') {
          $('#progress_bar_openfile').show();
          params['zip'] = fileLink;
          
          // download the zip file from Dropbox to browser for rendering directly
          var xhr = new XMLHttpRequest();
          xhr.responseType="blob";
          xhr.open("GET", fileLink, true);
          xhr.onload = function(e) {
            if(this.status == 200) {
              var blob = this.response;
              ShowPrgDiv('uploading...', true);
              HandleDropZipFile(blob, function(data) {
                // data = {'file_type' : "shp", 'file_name', '', 'file_content': {'shp':shpFile}} 
                require(['ui/mapManager'], function(MapManager){
                  dlgPrgBar.hide();
                  MapManager.getInstance().AddMap(data, function(map){
                    $('#dialog-open-file').dialog('close');
                    InitDialogs();
                    // ask server to download zip file and upload to create table in CartoDB 
                    $.get("../upload_zipurl_to_carto/", params).done(function(result) {
                      if (result["success"] == 0) {
                        MsgBox.getInstance().Show("Error", "Upload Zip file to CartoDB failed. Please try again or contact administror.");
                        return;
                      }
                      var table_name = result["table_name"];
                      // update map.name retrieved from cartodb
                      map.name = table_name;
                      // add map name to space-time dialog
                      GetCartoTables();
                      CartoProxy.GetFields(table_name, function(fields){
                        map.fields = fields;
                        UIManager.getInstance().SetupMap(map);
                      });
                      ShowPrgDiv('', false);
                    });  // end $.get()
                    
                  }); // end AddMap()
                }); // end require[]

              }); // end HandleDropZipFile()
            }
          }
          xhr.send();
          ready = true;
        }
      },
      cancel: function() {
        //$('#progressCont').hide();
      },
      linkType: "direct", // or "preview"
      multiselect: false, // or true
      extensions: ['.zip'],
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
