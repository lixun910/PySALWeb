import os, json, sys, shutil
import subprocess
from osgeo import ogr
from django.conf import settings
from hashlib import md5

TBL_PREFIX = "d"
db_set = settings.DATABASES['default']
db_host = db_set['HOST']
db_port = db_set['PORT']
db_uname = db_set['USER']
db_upwd = db_set['PASSWORD']
db_name = db_set['NAME']

def GetDS():
    global db_host, db_port, db_uname, db_upwd, db_name
    print 'Connecting to GeoDB'
    conn_str = "PG: host=%s dbname=%s user=%s password=%s" \
             % (db_host, db_name, db_uname, db_upwd)
    print "conn_str", conn_str
    DS = ogr.Open(conn_str) 
    print 'open DS:', DS
    return DS

def CloseDS(ds):
    ds.Destroy()
    ds= None
    print 'close DS:', ds
    
def ExportToDB(shp_path, layer_uuid, geom_type):
    global db_host, db_port, db_uname, db_upwd, db_name
    print "export starting..", shp_path
    table_name = TBL_PREFIX + layer_uuid
    if settings.DB == 'postgres':
        if sys.platform == 'win32':
            script = 'ogr2ogr -skipfailures -append -f "PostgreSQL" -overwrite PG:"host=%s dbname=%s user=%s password=%s" %s -nln %s -nlt GEOMETRY -lco PRECISION=NO'  % (db_host, db_name, db_uname, db_upwd, shp_path, table_name)
        else:
            script = 'ogr2ogr -skipfailures -append -f "PostgreSQL" -overwrite PG:"host=%s dbname=%s user=%s password=%s" %s -nln %s -nlt GEOMETRY -lco PRECISION=NO > /dev/null'  % (db_host, db_name, db_uname, db_upwd, shp_path, table_name)
        print script
        rtn = subprocess.call(script, shell=True)
    else:
        script = 'ogr2ogr -skipfailures -append -overwrite %s  %s -nln %s > /dev/null'  % (GEODB_PATH, shp_path, table_name)
        rtn = subprocess.call( script, shell=True)
        
    if rtn != 0:
        # note: write to log
        pass
    
    # convert json file to shapefile for PySAL usage if needed
    if shp_path.endswith(".json") or shp_path.endswith(".geojson"):
        ExportToESRIShape(shp_path) 
   
    # create a geometry only json file for visualization     
    ExportToJSON(shp_path) 
        
    # compute meta data for weights creation, point/polygon
    if geom_type == 1 or geom_type == 3: 
        from pysal.weights.user import get_points_array_from_shapefile
        # make sure using shp file in pysal
        shp_path = shp_path[0:shp_path.rfind(".")] + ".shp"
        points = get_points_array_from_shapefile(shp_path)
        from scipy.spatial import cKDTree
        kd = cKDTree(points)
        nn = kd.query(points, k=2)
        thres = nn[0].max(axis=0)[1]
        
        from myproject.myapp.models import Geodata
        geodata = Geodata.objects.get(uuid = layer_uuid)
        if geodata:
            geodata.minpairdist = thres
            geodata.save()
    
    print "export ends with ", rtn
    
def ExportToESRIShape(json_path):
    # will be called in subprocess
    import subprocess
    shp_path = json_path[0:json_path.rfind(".")] + ".shp"
    print "ExportToESRIShape", shp_path
    script = 'ogr2ogr -f "ESRI Shapefile" %s %s' %(shp_path,json_path)
    rtn = subprocess.call( script, shell=True)
    if rtn != 0:
        # write to log
        pass

def ExportToJSON(shp_path):
    # will be called in subprocess
    import subprocess
    prj = None
    if shp_path.endswith("json"):
        json_path = shp_path[0:shp_path.rfind(".")] + ".simp.json"
    else:
        if os.path.exists(shp_path[:-3]+"prj"):
            prj = "-t_srs EPSG:4326" # convert all projections to WGS84
        json_path = shp_path[0:shp_path.rfind(".")] + ".json"
      
    if os.path.exists(json_path):
        os.remove(json_path)
        
    if prj: 
        script = 'ogr2ogr -select "" -f "GeoJSON" %s %s %s' %(prj, json_path,shp_path)
    else:
        script = 'ogr2ogr -select "" -f "GeoJSON" %s %s' %(json_path,shp_path)
    rtn = subprocess.call( script, shell=True)
    
    
def SaveDBTableToShp(table_name):
    from myproject.myapp.models import Geodata
    layer_uuid = table_name[1:]
    geodata = Geodata.objects.get(uuid = layer_uuid)
    if not geodata:
        print "can't find %s in Geodata in SaveDBTableToShp"%layer_uuid
        return False
    shp_path = os.path.join(settings.MEDIA_ROOT, geodata.filepath)
    shp_path = shp_path[0: shp_path.rindex(".")] + ".shp" # in case of .json
    shp_dir, shp_name = os.path.split(shp_path)
    tmp_path = os.path.join(shp_dir, table_name + ".shp")
    import subprocess
    script = 'ogr2ogr -f "ESRI Shapefile" %s PG:"host=%s dbname=%s user=%s password=%s" %s' %(tmp_path, db_host, db_name, db_uname, db_upwd, table_name)
    print "SaveDBTableToShp", script
    rtn = subprocess.call( script, shell=True)    
    shutil.copy(tmp_path[:-3]+"dbf", shp_path[:-3]+"dbf")
    # remove tmp files 
    filelist = [ f for f in os.listdir(shp_dir) \
                 if f.startswith(table_name) ]
    for f in filelist:
        f = shp_dir + os.sep + f
        os.remove(f)
        
def GetColumnNamesFromTable(layer_uuid):
    DS = GetDS()
    table_name = TBL_PREFIX + layer_uuid
    sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='%s'" % table_name
    tmp_layer = DS.ExecuteSQL(str(sql))
    tmp_layer.ResetReading()
    feature = tmp_layer.GetNextFeature()
    col_names = {}
    while feature:
        col_name = feature.GetFieldAsString(0) 
        col_type = feature.GetFieldAsString(1) 
        if col_name not in ['ogc_fid','wkb_geometry']:
            if col_type == 'integer':
                col_type = 'Integer'
            elif col_type == 'double precision':
                col_type = 'Real'
            elif col_type == 'character varying':
                col_type = 'String'
            else:
                col_type = 'String'
            col_names[col_name] = col_type
        feature = tmp_layer.GetNextFeature()
    CloseDS(DS)
    return col_names
    
def IsLayerExist(layer_uuid):
    DS = GetDS()
    table_name = TBL_PREFIX + layer_uuid
    layer = DS.GetLayer(table_name)
    CloseDS(DS)
    if layer: 
        return True
    else:
        return False

def DeleteLayer(layer_uuid):
    DS = GetDS()
    table_name = TBL_PREFIX + layer_uuid
    sql = "DROP TABLE %s CASCADE" % table_name
    DS.ExecuteSQL(str(sql))
    CloseDS(DS)
    
def IsFieldUnique(layer_uuid, field_name):
    DS = GetDS()
    table_name = TBL_PREFIX + layer_uuid
    sql = "SELECT count(%s) as a, count(distinct %s) as b from %s" % (field_name, field_name, table_name)
    tmp_layer = DS.ExecuteSQL(str(sql))
    print str(sql), DS, tmp_layer
    tmp_layer.ResetReading()
    feature = tmp_layer.GetNextFeature()
    all_n = feature.GetFieldAsInteger(0) 
    uniq_n = feature.GetFieldAsInteger(1)
    print all_n, uniq_n
    CloseDS(DS)
    if all_n == uniq_n:
        return True
    else: 
        return False
    
def CountPtsInPolys(poly_uuid, point_uuid, count_col_name):
    DS = GetDS()
    poly_tbl = TBL_PREFIX + poly_uuid
    pt_tbl = TBL_PREFIX + point_uuid
    try:
        sql = 'ALTER TABLE %s ADD COLUMN %s integer' % \
        (poly_tbl, count_col_name)
        DS.ExecuteSQL(str(sql))
        sql = 'UPDATE %s SET %s = (SELECT count(*) FROM %s WHERE ST_Intersects(%s.wkb_geometry, %s.wkb_geometry))' % \
        (poly_tbl, count_col_name, pt_tbl, pt_tbl, poly_tbl) 
        DS.ExecuteSQL(str(sql))
        CloseDS(DS)
        SaveDBTableToShp(poly_tbl)
        return True
    except Exception, e:
        print "CountPtsInPolys() error"
        print str(e)
        CloseDS(DS)
        return False

def AddUniqueIDField(layer_uuid, field_name):
    DS = GetDS()
    table_name = TBL_PREFIX + layer_uuid
    # add field first
    try:
        sql = "alter table %s add column %s integer" % (table_name, field_name)
        print sql
        tmp_layer = DS.ExecuteSQL(str(sql))
        sql = "update %s set %s = ogc_fid" % (table_name, field_name)
        print sql
        tmp_layer = DS.ExecuteSQL(str(sql))
        
        
        from myproject.myapp.models import Geodata
        geodata = Geodata.objects.get(uuid = layer_uuid)
        if not geodata:
            CloseDS(DS)
            return False
        #fields = json.loads(geodata.fields)
        fields = eval(geodata.fields)
    
        # save new field to django db 
        fields[str(field_name)] = "Integer"
        geodata.fields = fields
        geodata.save()
       
        # save changes to shp file (pysal needs shp file) 
        SaveDBTableToShp(table_name)
        
        CloseDS(DS)
        
        return True
    except Exception, e:
        print "AddUniqueIDField() error"
        print str(e)
        CloseDS(DS)
        return False

def AddField(layer_uuid, field_name, field_type, values, updateShp=True):
    DS = GetDS()
    table_name = TBL_PREFIX + layer_uuid
    field_db_type = ['integer', 'numeric', 'varchar(255)'][field_type]
   
    if field_name and values:
        sql = "alter table %s add column %s %s" % (table_name, field_name, field_db_type)
        tmp_layer = DS.ExecuteSQL(str(sql))
        for i, val in enumerate(values):
            if field_type == 2: val = "'%s'" % val
            sql = "update %s set %s=%s where ogc_fid=%d" % (table_name, field_name, val, i+1)
            DS.ExecuteSQL(str(sql))
    CloseDS(DS) 
    from myproject.myapp.models import Geodata
    geodata = Geodata.objects.get(uuid = layer_uuid)
    if not geodata:
        return False
    #fields = json.loads(geodata.fields)
    fields = eval(geodata.fields)

    # save new field to django db 
    fields[field_name] = ["Integer","Real","String"][field_type]
    geodata.fields = fields
    geodata.save()
    
    # save changes to shp file (pysal needs shp file) 
    if updateShp:
        SaveDBTableToShp(table_name)
    
def GetDataSource(drivername, filepath):
    driver = ogr.GetDriverByName(drivername)
    print filepath, driver
    ds = driver.Open(str(filepath),0)
    return ds
    
def GetMetaData(filepath, table_name, drivername=None):
    ds = GetDataSource(drivername, filepath) 
    lyr = ds.GetLayer(0) if table_name == None else ds.GetLayer(table_name)
    if lyr is None:
        return None
    meta_data = dict()
    # shape info
    meta_data['bbox'] = lyr.GetExtent()
    meta_data['geom_type'] = lyr.GetLayerDefn().GetGeomType()
    
    # table info
    lyrDefn = lyr.GetLayerDefn()
    meta_data['n'] = lyrDefn.GetFieldCount()
    
    fields = dict()
    for i in range( lyrDefn.GetFieldCount() ):
        fieldName =  lyrDefn.GetFieldDefn(i).GetName()
        fieldTypeCode = lyrDefn.GetFieldDefn(i).GetType()
        fieldType = lyrDefn.GetFieldDefn(i).GetFieldTypeName(fieldTypeCode)
        #fieldWidth = lyrDefn.GetFieldDefn(i).GetWidth()
        #GetPrecision = lyrDefn.GetFieldDefn(i).GetPrecision()
        #print fieldName, fieldTypeCode, fieldType
        fields[fieldName] = fieldType
    meta_data['fields'] = fields
    ds.Destroy()
    return meta_data

def GetGeometries(layer_uuid):
    table_name = TBL_PREFIX + layer_uuid
    pass

# 0 Integer 2 Real 4 String
def GetTableData(layer_uuid, column_names, drivername=None, filepath=None):
    DS = GetDS()
    table_name = TBL_PREFIX + layer_uuid
    lyr = DS.GetLayer(table_name)
    if lyr is None:
        CloseDS(DS)
        print "GetTableData", table_name, DS
        print "DS.GetLayer is none"
        return None
    lyrDefn = lyr.GetLayerDefn()
    # get position of each query columns NOTE: take care of lowercase
    colum_pos = {}
    for col_name in column_names:
        colum_pos[col_name] = []

    for i in range( lyrDefn.GetFieldCount() ):
        col_name  =  lyrDefn.GetFieldDefn(i).GetName()
        col_type =  lyrDefn.GetFieldDefn(i).GetType()
        for key in colum_pos:
            if key.lower() == col_name.lower():
                colum_pos[key].append(i)
                colum_pos[key].append(col_type)
                break

    column_values = {}
    for col_name in column_names:
        column_values[col_name] = []

    n = lyr.GetFeatureCount()
    lyr.ResetReading()
    feat = lyr.GetNextFeature()
    while feat:
        for col_name, info in colum_pos.iteritems():
            col_pos, col_type = info
            if col_type == 0:
                column_values[col_name].append( feat.GetFieldAsInteger(col_pos) )
            elif col_type == 2:
                column_values[col_name].append( feat.GetFieldAsDouble(col_pos) )
            else:
                column_values[col_name].append( feat.GetField(col_pos) )
                
        feat = lyr.GetNextFeature()
        
    CloseDS(DS)
    return column_values

#print GetMetaData("nat")
    
#GetTableData("nat", ["state_fips","hr70","name"])

#AddField("6f162b17c71e4ebefffc3415519d9811", "id", 0, range(49))
