
var SetupDragDrop = function(dropZone, progress) {
  if (!dropZone || !progress ) return;
  var reader;
  
  if (typeof window.FileReader === 'undefined') {
    console.log( 'File API not available.');
  }
  
  function updateProgress(evt) {
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
    progress.style.width = '0%';
    progress.textContent = '0%';
    reader = new FileReader();
    reader.onload = function(e) {
      console.log(reader.result);
      // read *.prj file
      var ip = reader.result;
      prj = proj4(ip, proj4.defs('WGS84'));
    };
    var formData = new FormData(),
        files = evt.dataTransfer.files, // FileList object.
        bJson = 0, bShp = 0, bDbf =0, bShx =0,
        shpFileName = "", shpFile;
    gHasProj = false,
    $.each(files, function(i, f) {
      var name = f.name,
          suffix = getSuffix(name);
      if (suffix === 'geojson' || suffix === 'json') {
        bJson = 1;
        shpFileName = name;
        shpFile = f;
      } else if (suffix === "shp") {
        bShp = 1;
        shpFileName = name;
        shpFile = f;
      } else if (suffix === "shx") {
        bShx = 1;
      } else if (suffix === "dbf") {
        bDbf = 1;
      } else if (suffix === "prj") {
        gHasProj = true;
        reader.readAsText(f);
      }
    });
    // check files
    if (!bJson && !bShp && !bShx && !bDbf ) {
      ShowMsgBox("Error", "Please drag&drop either one json/geojson file, or ESRI Shapefiles (*.shp, *.dbf, *.shx and *.prj) ");
      return false;
    } else if (!bJson && (!bShp || !bShx || !bDbf )) {
      ShowMsgBox("Error", "Please drag&drop three files (*.shp, *.dbf, *.shx and *.prj)  at the same time. (Tips: use ctrl (windows) or command (mac) to select multiple files.)");
      return false;
    } 
    if (!bJson && !gHasProj ) {
      gProjSwitchOn = false;
      ShowMsgBox("Info", "The *.prj file is not found. The map will not be shown using Leaflet. You can still use the swtich button to display the map on Leaflet."); 
    }
    $.each(files, function(i, f) {
      if ($.inArray(getSuffix(f.name), ['json','geojson','shp','shx','dbf', 'prj'] ) >=0) {
        formData.append('userfile', f, f.name);
      }
    });
    // upload files to server
    formData.append('csrfmiddlewaretoken', '{{ csrf_token }}');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '../upload.py');
    xhr.onload = function() {
      console.log("[Upload]", this.responseText);
      try{
        var data = JSON.parse(this.responseText);
        if ( data['uuid'] != undefined) {
          var path = data["path"];
          if ( gAddLayer == false ) { // open new map
            uuid = data["uuid"];
            viz.nameDict[uuid] = data['filename'];
            if ( gHasProj || gShowLeaflet == true) {
              showLeafletMap(uuid);
            } else {
              showPlainMap(uuid);
            }
          } else { // add new layer
            var subUuid = data["uuid"];
            viz.nameDict[subUuid] = data['filename'];
            if ( gHasProj || gShowLeaflet == true) {
              viz.AddLeafletMap(subUuid, L, lmap, prj);
            } else {
              viz.AddPlainMap(subUuid);
            }
          }
          UpdateLocalMapSel();
          var msg =  {"command":"new_data", "uuid": data['uuid'],"path":path};
          viz.NewDataFromWeb(msg);
        }
      } catch(e){
        console.log("[Error][Upload Files]", e);
      }
      // Ensure that the progress bar displays 100% at the end.
      progress.style.width = '100%';
      progress.textContent = '100%';
      setTimeout("document.getElementById('progress_bar').className='';", 2000);
    }; 
    xhr.upload.onprogress = updateProgress;
    xhr.send(formData);
    document.getElementById('progress_bar').className = 'loading';
  };
  
  // display map directly
  if (shpFile) {
    var shapefile = new Shapefile(shpFile);
  }
};