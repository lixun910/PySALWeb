import os, json, sys, shutil
import subprocess
from osgeo import ogr
from django.conf import settings
from hashlib import md5
from django.db import connections, DEFAULT_DB_ALIAS

from pysal.weights.user import get_points_array_from_shapefile
from scipy.spatial import cKDTree
from myproject.myapp.models import Geodata

TBL_PREFIX = "myapp_"
db_set = settings.DATABASES['default']
db_host = db_set['HOST']
db_port = db_set['PORT']
db_uname = db_set['USER']
db_upwd = db_set['PASSWORD']
db_name = db_set['NAME']

def GetDS():
    global db_host, db_port, db_uname, db_upwd, db_name
    conn_str = "PG: host=%s dbname=%s user=%s password=%s" \
             % (db_host, db_name, db_uname, db_upwd)
    DS = ogr.Open(conn_str) 
    return DS

def CloseDS(ds):
    ds.Destroy()
    ds= None
    
def ExportToDB(shp_path, layer_uuid, geom_type):
    global db_host, db_port, db_uname, db_upwd, db_name
    print "export starting..", shp_path
    table_name = TBL_PREFIX + layer_uuid
    if settings.DB == 'postgres':
        if sys.platform == 'win32':
            script = 'ogr2ogr -skipfailures -append -f "PostgreSQL" -overwrite PG:"host=%s dbname=%s user=%s password=%s" %s -nln %s -nlt GEOMETRY -lco PRECISION=NO'  % (db_host, db_name, db_uname, db_upwd, shp_path, table_name)
        else:
            script = 'export PGCLIENTENCODING="LATIN1";ogr2ogr -skipfailures -append -f "PostgreSQL" -overwrite PG:"host=%s dbname=%s user=%s password=%s" %s -nln %s -nlt GEOMETRY -lco PRECISION=NO > /dev/null'  % (db_host, db_name, db_uname, db_upwd, shp_path, table_name)
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
        # make sure using shp file in pysal
        shp_path = shp_path[0:shp_path.rfind(".")] + ".shp"
        points = get_points_array_from_shapefile(shp_path)
        kd = cKDTree(points)
        nn = kd.query(points, k=2)
        thres = nn[0].max(axis=0)[1]
        try:
            geodata = Geodata.objects.get(uuid = layer_uuid)
            geodata.minpairdist = thres
            geodata.save()
        except:
            pass
    print "export ends with ", rtn
    
def ExportToESRIShape(json_path):
    # will be called in subprocess
    shp_path = json_path[0:json_path.rfind(".")] + ".shp"
    print "ExportToESRIShape", shp_path
    script = 'ogr2ogr -f "ESRI Shapefile" %s %s' %(shp_path,json_path)
    rtn = subprocess.call( script, shell=True)

def ExportToJSON(shp_path):
    # will be called in subprocess
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
    layer_uuid = table_name[len(TBL_PREFIX):]
    
    try:
        geodata = Geodata.objects.get(uuid = layer_uuid)
        shp_path = os.path.join(settings.MEDIA_ROOT, geodata.filepath)
        shp_path = shp_path[0: shp_path.rindex(".")] + ".shp" # in case of .json
        shp_dir, shp_name = os.path.split(shp_path)
        tmp_path = os.path.join(shp_dir, table_name + ".shp")
        
        script = 'ogr2ogr -f "ESRI Shapefile" %s PG:"host=%s dbname=%s user=%s password=%s" %s' % (tmp_path, db_host, db_name, db_uname, db_upwd, table_name)
        
        rtn = subprocess.call( script, shell=True)    
        shutil.copy(tmp_path[:-3]+"dbf", shp_path[:-3]+"dbf")
        # remove tmp files 
        filelist = [ f for f in os.listdir(shp_dir) if f.startswith(table_name) ]
        for f in filelist:
            f = shp_dir + os.sep + f
            os.remove(f)
    except:
        print "can't find %s in Geodata in SaveDBTableToShp"%layer_uuid
        return False
    
        
def GetColumnNamesFromTable(layer_uuid):
    table_name = TBL_PREFIX + layer_uuid
    sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='%s'" % table_name
    col_names = {}

    connection = connections['default']
    cursor = connection.cursor() 
    cursor.execute(sql)
    rows = cursor.fetchall()
    for row in rows:
        col_name, col_type = row
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
        
    cursor.close()
    return col_names
    
def IsLayerExist(layer_uuid):
    table_name = TBL_PREFIX + layer_uuid
    sql = "select * from pg_tables where schemaname='public' and tablename='%s'" % table_name
    connection = connections['default']
    cursor = connection.cursor() 
    cursor.execute(sql)
    rows = cursor.fetchall()
    layerExist = True if len(rows) > 0 else False
    cursor.close()
    
    return layerExist

def DeleteLayer(layer_uuid):
    table_name = TBL_PREFIX + layer_uuid
    sql = "DROP TABLE %s CASCADE" % table_name
    connection = connections['default']
    cursor = connection.cursor() 
    cursor.execute(sql)
    cursor.close()
    
def IsFieldUnique(layer_uuid, field_name):
    table_name = TBL_PREFIX + layer_uuid
    sql = "SELECT count(%s) as a, count(distinct %s) as b from %s" % \
        (field_name, field_name, table_name)
    connection = connections['default']
    cursor = connection.cursor() 
    cursor.execute(sql)
    rows = cursor.fetchall()
    if len(rows) > 0:
        all_n, uniq_n = rows[0]
        if all_n == uniq_n:
            return True
    cursor.close()
    return False
    
def CountPtsInPolys(poly_uuid, point_uuid, count_col_name):
    connection = connections['default']
    cursor = connection.cursor() 
    
    poly_tbl = TBL_PREFIX + poly_uuid
    pt_tbl = TBL_PREFIX + point_uuid
    try: 
        sql = 'ALTER TABLE %s ADD COLUMN %s integer' % (poly_tbl, count_col_name)
        cursor.execute(sql)
        
        sql = 'UPDATE %s SET %s = (SELECT count(*) FROM %s WHERE ST_Intersects(%s.wkb_geometry, %s.wkb_geometry))' % \
            (poly_tbl, count_col_name, pt_tbl, pt_tbl, poly_tbl) 
        cursor.execute(sql)
        cursor.close()     
        return True
    except Exception, e:
        print "CountPtsInPolys() error"
        print str(e)
        cursor.close()     
        return False

def AddUniqueIDField(layer_uuid, field_name):
    connection = connections['default']
    cursor = connection.cursor() 
    table_name = TBL_PREFIX + layer_uuid
    try:
        sql = "alter table %s add column %s integer" % (table_name, field_name)
        cursor.execute(sql)
        sql = "update %s set %s = ogc_fid" % (table_name, field_name)
        cursor.execute(sql)
        cursor.close()        
        
        SaveDBTableToShp(table_name)
        return True
    except Exception, e:
        print "AddUniqueIDField() error"
        print str(e)
        cursor.close()        
        return False

def AddField(layer_uuid, field_name, field_type, values, updateShp=True):
    connection = connections['default']
    cursor = connection.cursor() 
    table_name = TBL_PREFIX + layer_uuid
    field_db_type = ['integer', 'numeric', 'varchar(255)'][field_type]
   
    if field_name and values:
        sql = "alter table %s add column %s %s" % \
            (table_name, field_name, field_db_type)
        cursor.execute(sql)
        
        for i, val in enumerate(values):
            if field_type == 2: val = "'%s'" % val
            sql = "update %s set %s=%s where ogc_fid=%d" % \
                (table_name, field_name, val, i+1)
            cursor.execute(sql)
    cursor.close()
    
    if updateShp:
        SaveDBTableToShp(table_name)
    
"""
GetMetaData from raw file
"""
def GetMetaData(filepath, table_name, drivername=None):
    driver = ogr.GetDriverByName(drivername)
    ds = driver.Open(str(filepath),0)
    lyr = ds.GetLayer(0) if table_name == None else ds.GetLayer(table_name)
    if lyr is None:
        ds.Destroy()
        return None
    
    meta_data = dict()
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
    column_values = {}
    for col_name in column_names:
        column_values[col_name] = []
        
    table_name = TBL_PREFIX + layer_uuid
    sql_cols = "," .join(column_names)
    sql = "SELECT %s FROM %s" %  (sql_cols, table_name)
        
    connection = connections['default']
    cursor = connection.cursor() 
    cursor.execute(sql)
    rows = cursor.fetchall()
    
    for row in rows:
        for i, col_name in enumerate(column_names):
            column_values[col_name].append(row[i])
    cursor.close()
    return column_values