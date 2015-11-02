
// Author: xunli at asu.edu
define(['./msgbox', './message', './utils'], function(MsgBox, M, Utils) {

var zip = this.zip;

var carto_uid;
var carto_key;
var is_changed = false;

var csrftoken = this.csrftoken;

var data_cache = {};

var CartoProxy = {

  GetAllTables : function(uid, key, onSuccess) {
    carto_uid = uid;
    carto_key = key;
    var sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name";
    var url = "https://" + uid + ".cartodb.com/api/v2/sql?api_key=" + key + "&q=" + sql + '&' + Utils.guid();
    var that = this;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var content = JSON.parse(xhr.response);
      if (content['rows'] === undefined ) {
        MsgBox.getInstance().Show("Error:Get all tables from CartoDB returns empty", JSON.stringify(content));
        return;
      }
      var rows = content.rows;
      var table_name, geom_type, tables = {};
      for (var i=0, n=rows.length; i<n; i++) {
        table_name = rows[i]["table_name"];
        if (table_name !== 'raster_columns' &&
            table_name !== 'raster_overviews' &&
            table_name !== 'spatial_ref_sys' &&
            table_name !== 'geometry_columns' &&
            table_name !== 'geography_columns' ) 
        {
          tables[table_name] = "";
        }
      }
      if (onSuccess) onSuccess(tables);
    };
    xhr.send(null);
  },
  SetChange : function(flag) { is_changed = true;},
  GetUID : function() {return carto_uid;},
  GetKey: function() {return carto_key;},
  
  SetUID : function(obj) {carto_uid = obj;},
  SetKey: function(obj) {
    if (obj != carto_key) is_changed = true;
    carto_key = obj;
  },
  
  GetAccount : function(callback) {
    $.get('../get_cartodb_account/').done(function(data){
      carto_uid = data.id;
      carto_key = data.key;
      if(callback) callback(carto_uid, carto_key);
    });
  },
  
  SaveAccount: function() {
    if (is_changed === false) return;
    // upload carto_uid and carto_key to server
    $.get('../save_cartodb_account/', {
      'id' : carto_uid,
      'key' : carto_key,
    }).done(function(data) {
      console.log(data);
    });
  },
  
  GetGeomType : function(table_name, onSuccess) {
    var sql = "SELECT GeometryType(the_geom) FROM " + table_name + " LIMIT 1";
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var data = JSON.parse(xhr.response),
          row = data.rows[0];
      var geotype = "";
      if (row && row['geometrytype']) {
        geotype = row.geometrytype;
        if (geotype) {
          if (geotype.indexOf("POINT") >= 0 ) {
            geotype = "Point";
          } else if (geotype.indexOf("LINE") >= 0 ) {
            geotype = "Line";
          } else if (geotype.indexOf("POLY") >= 0 ) {
            geotype = "Polygon";
          }
        }
      }
      if (onSuccess) onSuccess(table_name, geotype);
    };
    xhr.send(null);
  },
  
  GetGeomTypes : function(table_names, callback) {
    var tables = [];
    for (var tbl in table_names)
      tables.push(tbl);
      
    var n = tables.length,
        ii = 0,
        table_geo = {};
    for (var i=0; i<n; i++) {
      this.GetGeomType(tables[i], function(table_name, geotype){
        table_geo[table_name] = geotype;
        ii += 1;
        if (ii === n) {
          if (callback) callback(table_geo);
        }
      });
    }
  },
  
  DownloadTable2TopoJson : function(table_name, onSuccess) {
    var sql = "SELECT the_geom FROM " + table_name;
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=topojson&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var a = xhr.response;
      if (a.indexOf('undefined') >= 0) {
        a = a.replace(/undefined/g,"");
      }
      
      var topojson = JSON.parse(a);
      if (topojson["type"] === undefined ) {
        MsgBox.getInstance().Show(M.m200001, M.m200002 + JSON.stringify(content));
        return;
      }
      // get geometry type
      var type;
      if (a.indexOf('Polygon') > 0) type = 3; // polygon
      else if (a.indexOf('Point') > 0) type = 1; // point
      else type = 2; // line
      
      // the topojson is WGS84 (by cartodb)
      if (onSuccess) 
        onSuccess({
          name: table_name + '.json',
          geotype : type,
          topojson: topojson,
        });
    };
    xhr.send(null);
  },
  
  DownloadTable: function(table_name, onSuccess) {
    var sql = "SELECT the_geom FROM " + table_name + " ORDER BY cartodb_id";
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=shp&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = 'blob';
    xhr.onload = function(evt) {
      if (this.status == 200) {
     
        var f = xhr.response;
        
        zip.createReader(new zip.BlobReader(f), function(zipReader) {
          zipReader.getEntries(function(entries) {


            var i=0,
                n = entries.length,
                bShp = false,
                bShx = false,
                bDbf = false,
                bPrj = false,
                shpFile, dbfFile, prjFile,
                fileName = '',
                prj;

            entries.forEach(function(entry,ii) {
              var suffix = Utils.getSuffix(entry.filename);
              var writer;
              if (suffix === 'json' || suffix === 'geojson' || suffix === 'prj') {
                writer = new zip.TextWriter();
              } else {
                writer = new zip.BlobWriter();
              }
              console.log(entry.filename, suffix);
              entry.getData(new zip.BlobWriter(), function onload(o) {
                i += 1;
                console.log('inside',entry.filename);
                if (entry.filename[0] === '_')  
                  return;

                if (suffix == 'geojson' || suffix == 'json') {
                  o = JSON.parse(o);
                  if (onSuccess) onSuccess( {
                    'file_type' : 'json',
                    'file_name' : table_name,
                    'file_content' : o,
                  });
                  return;
                } else if (suffix == "shp") {
                  bShp = true;
                  shpFile = o;
                  fileName = table_name + ".shp";
                } else if (suffix == "shx") {
                  bShx = true;
                  shxFile = o;
                } else if (suffix == "dbf") {
                  bDbf = true;
                  dbfFile = o;
                } else if (suffix == "prj") {
                  bPrj = true;
                  prjFile = o;
                  proj = proj4(o, proj4.defs('WGS84'));
                }
                console.log(i,n, table_name, bShp, bShx, bDbf, bPrj);
                if (i == n) {
                  if (bShp && bShx && bDbf && bPrj) {
                    if (onSuccess) onSuccess({
                      'file_type' : 'shp',
                      'file_name' : table_name,
                      'file_content' : {'shp': shpFile, 'dbf' : dbfFile, 'prj':prjFile},
                    });
                  }
                }
              });
            });
          });
        });  
        
      }
    };
    xhr.send(null);
  },
  
  GetFields: function(table_name, onSuccess) {
    var sql = "SELECT column_name as a, data_type as b FROM information_schema.columns WHERE table_name='" + table_name + "'";
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=json&api_key=" + carto_key + "&q=" + sql + '&' + Utils.guid();
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var data = JSON.parse(xhr.response),
          rows = data.rows,
          n = rows.length,
          col,
          fields = {};
      for (var i=0; i<n; i++) {
        col = rows[i].a;
        typ = rows[i].b;
        if (col !== "the_geom" && col !== "cartodb_id" && col !== "created_at" &&
            col !== "updated_at" && col !== "the_geom_webmercator") {
          if (typ.indexOf('double') >= 0) typ = "double";
          else if (typ.indexOf('text') >= 0) typ = "string";
          else if (typ.indexOf('time') >= 0) typ = "time";
          else if (typ.indexOf('USER') >= 0) typ = "string";
          
          fields[col] = typ;
        }
      }
      if (onSuccess) onSuccess(fields);
    };
    xhr.send(null);
  },
  
  GetVariables : function(table_name, vars, isCSV, onSuccess) {
    if (!carto_uid || !carto_key) return;
    
    var data = {},
        nvars = vars.length,
        cached_nvars = 0;
    
    for (var i=0, n=nvars; i<n; i++) {
      if (data_cache[vars[i]]) {
        data[vars[i]] = data_cache[vars[i]].slice(0);
        cached_nvars += 1;
      }
    }
    
    if (cached_nvars === nvars && isCSV === false) {
      if (onSuccess) onSuccess(data);
    }
    var sql = "SELECT ";
    for (var i=0, n=nvars-1; i<n; i++) {
      if (data_cache[vars[i]] === undefined)
        sql += vars[i] + ", ";
    }
    sql += vars[vars.length-1];
    sql += " FROM " + table_name + " ORDER BY cartodb_id";
    
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=csv&api_key=" + carto_key + "&q=" + sql + '&' + Utils.guid();
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var content = xhr.response;
      if (isCSV === true) {
        if (onSuccess) onSuccess(content);
      } else {
        var rows = content.split("\n");
        
        for (var i=0; i<nvars; i++)  {
          data[vars[i]] = [];
        }
        for (var i=1, n=rows.length-1; i<n; i++)  {
          var items = rows[i].split(",");
          for (var j=0; j<nvars; j++)  {
            if (items[j] !== "")
              data[vars[j]].push(parseFloat(items[j]));
            else
              data[vars[j]].push(0);
          }
        }
        for (var i=0; i<nvars; i++)  {
          data_cache[vars[i]] = data[vars[i]].slice(0);
        }
        if (onSuccess) onSuccess(data);
      }
    };
    xhr.send(null);
  },
  
  FormatWeights : function(data) {
    var rows = data.rows,
        n = rows.length,
        w = {};
    for (var i=0; i<n; i++) {
      w[rows[i].id] = rows[i].nn;
    }
    return w;
  },
  
  CreateRoadQueenWeights : function(table_name, w_conf, onSuccess) {
    //select b.cartodb_id, ARRAY(
    //  SELECT a.cartodb_id as id
    //  FROM natregimes as a 
    //  WHERE a.cartodb_id <> b.cartodb_id
    //  AND st_intersects(a.the_geom, b.the_geom)
    //) as nn
    //from natregimes b
    var that = this;
    
    var sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM natregimes as a WHERE a.cartodb_id <> b.cartodb_id AND st_touches(a.the_geom, b.the_geom)) as nn from natregimes b";
   
    sql = sql.replace(/natregimes/g, table_name);
    
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=json&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var w = that.FormatWeights(JSON.parse(xhr.response));
      if (onSuccess) onSuccess(w);
    };
    xhr.send(null);
  },

  CreateContiguityWeights : function(table_name, w_conf, onSuccess) {
    //select b.cartodb_id, ARRAY(
    //  SELECT a.cartodb_id as id
    //  FROM natregimes as a 
    //  WHERE a.cartodb_id <> b.cartodb_id
    //  AND st_intersects(a.the_geom, b.the_geom)
    //) as nn
    //from natregimes b
    var that = this;
    
    var sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM natregimes as a WHERE a.cartodb_id <> b.cartodb_id AND st_intersects(a.the_geom, b.the_geom)) as nn from natregimes b";
   
    sql = sql.replace(/natregimes/g, table_name);
    
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=json&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var w = that.FormatWeights(JSON.parse(xhr.response));
      if (onSuccess) onSuccess(w);
    };
    xhr.send(null);
  },

  CreateDistanceWeights : function(table_name, w_conf, onSuccess) {
    //select b.cartodb_id, ARRAY(
    //  SELECT a.cartodb_id as id
    //  FROM natregimes as a 
    //  WHERE a.cartodb_id <> b.cartodb_id
    //  AND a.the_geom<->b.the_geom < dist_threshold
    //) as nn
    //from natregimes b
    var that = this;
    var sql; 
    if (w_conf['pow_idist'] === undefined)  {
      sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM natregimes as a WHERE a.cartodb_id <> b.cartodb_id AND a.the_geom<->b.the_geom < dist_threshold)) as nn from natregimes b";
    } else {
      sql = "select a.cartodb_id-1 as aid, b.cartodb_id-1 as bid, power(1.0/a.the_geom<->b.the_geom, pow_idx) as dist from natregimes as a join natregimes as b on a.the_geom<->b.the_geom<dist_threshold and a.cartodb_id<>b.cartodb_id";
      sql = sql.replace("pow_idx", w_conf['pow_idist']);
    }
   
    sql = sql.replace(/natregimes/g, table_name);
    sql = sql.replace("dist_threshold", w_conf.dist_value);
    
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=json&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var w = that.FormatWeights(JSON.parse(xhr.response));
      if (w_conf['pow_idist']) {
        // power of inverse distance
        // aid, bid, power(1/dist, idx)
      }
      if (onSuccess) onSuccess(w);
    };
    xhr.send(null);
  },

  CreateKnnWeights : function(table_name, w_conf, onSuccess) {
    //select b.cartodb_id, ARRAY(
    //  SELECT a.cartodb_id as id
    //  FROM natregimes as a 
    //  WHERE a.cartodb_id <> b.cartodb_id
    //  ORDER BY a.the_geom<->b.the_geom < dist_threshold
    //  LIMIT kk
    //) as nn
    //from natregimes b
    var that = this;
    
    var sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM natregimes as a WHERE a.cartodb_id <> b.cartodb_id ORDER BY a.the_geom<->b.the_geom LIMIT kk) as nn from natregimes b";
   
    sql = sql.replace(/natregimes/g, table_name);
    sql = sql.replace("kk", parseInt(w_conf.dist_value));
    
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=json&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var w = that.FormatWeights(JSON.parse(xhr.response));
      if (onSuccess) onSuccess(w);
    };
    xhr.send(null);
  },
  
  CreateKernelWeights : function(table_name, w_conf, onSuccess) {
    //select b.cartodb_id, ARRAY(
    //  SELECT a.cartodb_id as id
    //  FROM natregimes as a 
    //  WHERE a.cartodb_id <> b.cartodb_id
    //  AND st_intersects(a.the_geom, b.the_geom)
    //) as nn
    //from natregimes b
    var that = this;
    
    var sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM natregimes as a WHERE a.cartodb_id <> b.cartodb_id AND st_intersects(a.the_geom, b.the_geom)) as nn from natregimes b";
   
    sql = sql.replace(/natregimes/g, table_name);
    
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=json&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var w = that.FormatWeights(JSON.parse(xhr.response));
      if (onSuccess) onSuccess(w);
    };
    xhr.send(null);
  },

  AddField : function(table_name, field_name, field_type, callback) {
    var sql = "ALTER TABLE " + table_name +" ADD COLUMN " + field_name + " " + field_type + " DEFAULT 0";
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=json&api_key=" + carto_key + "&q=" + sql;
    
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var data = JSON.parse(xhr.response);
      if (callback) callback();      
    };
    xhr.send(null);
  },
  
  AddFieldWithValues : function(table_name, field_name, field_type, values, onSuccess) {
    var temp_table_name = "temp_field_" + Utils.guid();
    
    function OnZipCreated(zippedBlob)  {
      var formData = new FormData();
      formData.append('csrfmiddlewaretoken', csrftoken);
      formData.append('userfile', zippedBlob, "upload.zip");
      formData.append('carto_uid', carto_uid);
      formData.append('carto_key', carto_key);
      formData.append('table_name', table_name);
      formData.append('field_name', field_name);
      formData.append('field_type', field_type);
      formData.append('file_name', temp_table_name);
      
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "../carto_add_field_from_file/");
      xhr.responseType = 'text';
      xhr.onload = function(evt) {
        console.log(xhr.response);
        var data = JSON.parse(xhr.response);
        if (data['table_name']) {
          if (onSuccess)
            onSuccess(field_name);
        }
      };
      xhr.send(formData);
    }
    
    // create zipped csv file
    var FILE_NAME = temp_table_name + ".csv";
    var TEXT_CONTENT = "id, lisa\n";
    for (var i=0, n=values.length; i<n; i++) {
      TEXT_CONTENT += (i+1) + "," + values[i] + "\n";
    }
    var blob = new Blob([TEXT_CONTENT], {type: "text/plain"});
    zip.createWriter(new zip.BlobWriter(), function(zipWriter){
      zipWriter.add(FILE_NAME, new zip.BlobReader(blob), function(){
        zipWriter.close(OnZipCreated);
      })
    });
  },
 
  GetQuantileBins : function(table_name, var_name, k, onSuccess)  {
    var sql = "SELECT CDB_QuantileBins(array_agg(" + var_name +"), "+k+") FROM " + table_name;
    var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?format=csv&api_key=" + carto_key + "&q=" + sql;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = 'text';
    xhr.onload = function(evt) {
      var data = JSON.parse(xhr.response);
      if (onSuccess) onSuccess(data);
    };
    xhr.send(null);
  },
  
  UploadTable : function(uid, key, uuid, successHandler) {
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
  
  SpatialCount : function(poly_table, point_table, field_name, callback) {
    this.AddField(poly_table, field_name, "integer", function() {
      var sql = "UPDATE "+poly_table+" SET "+field_name+"= (SELECT count(*) FROM "+point_table+" WHERE ST_Intersects("+point_table+".the_geom, "+poly_table+".the_geom))";
      var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?api_key=" + carto_key + "&q=" + sql;
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = 'text';
      xhr.onload = function(evt) {
        var data = JSON.parse(xhr.response);
        if (callback) callback(data);
      };
      xhr.send(null);
    });
  },
 
  /*
With lcnt AS (
  SELECT lid, count(*) as cnt FROM (
    SELECT b.cartodb_id As pp, (
      SELECT a.cartodb_id as id
      FROM man_road AS a
      ORDER BY a.the_geom<->b.the_geom 
      LIMIT 1
      ) AS lid
    FROM man_points AS b
  ) AS p2l GROUP BY lid
)
UPDATE man_road SET xun = (select cnt from lcnt where lcnt.lid=man_road.cartodb_id)
  */
  SnapPointsToLines : function(line_table, point_table, field_name, callback) {
    this.AddField(line_table, field_name, "integer", function() {
      var sql = "With lcnt AS (SELECT lid, count(*) as cnt FROM (SELECT b.cartodb_id As pp, (SELECT a.cartodb_id as id FROM "+line_table+" AS a ORDER BY a.the_geom<->b.the_geom LIMIT 1) AS lid FROM "+point_table+" AS b) AS p2l GROUP BY lid) UPDATE "+line_table+" SET "+field_name+"=(select cnt from lcnt where lcnt.lid="+line_table+".cartodb_id)";
      var url = "https://" + carto_uid + ".cartodb.com/api/v2/sql?api_key=" + carto_key + "&q=" + sql;
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = 'text';
      xhr.onload = function(evt) {
        var data = JSON.parse(xhr.response);
        if (callback) callback(data);
      };
      xhr.send(null);
    });
    
  },
};

return CartoProxy;

});
