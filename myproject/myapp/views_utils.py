# -*- coding: utf-8 -*-
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.conf import settings


import string
import random
import logging
import json, time, os
from hashlib import md5
from pysal import W, w_union, higher_order
import GeoDB
import multiprocessing as mp
from myproject.myapp.models import Geodata

logger = logging.getLogger(__name__)

RSP_OK = '{"success":1}'
RSP_FAIL = '{"success":0}'

"""
Get reletive url of shape files that user uploaded to server.
"""
def get_file_url(userid, layer_uuid):
    from myproject.myapp.models import Document, Geodata
    try:
        geodata = Geodata.objects.get(uuid=layer_uuid)
        file_path = os.path.join(settings.MEDIA_ROOT, geodata.filepath)
        file_name = geodata.name
        return file_path, file_name
    except:
        return None

def create_w_uuid(userid, layer_uuid, w_name):
    file_url, shpfilename = get_file_url(userid, layer_uuid) 
    wuuid = md5(userid + shpfilename + w_name).hexdigest()
    return wuuid


def load_from_json(json_str):
    obj = None
    try:
        obj = json.loads(json_str)
    except:
        try:
            obj = eval(json_str)
        except:
            pass
    return obj
        
"""
Get W object from database using weights uuid
"""
def helper_get_W(wuuid):
    from myproject.myapp.models import Weights
    w_record = Weights.objects.get(uuid=wuuid)
    if w_record:
        neighbors_dict = {}
        weights_dict = {}
        neighbors = load_from_json(w_record.neighbors)
        for k,v in neighbors.iteritems():
            neighbors_dict[int(k)] = v

        weights = load_from_json(w_record.weights)
        for k,v in weights.iteritems():
            weights_dict[int(k)] = v

        w = W(neighbors_dict, weights_dict)
        w.name = w_record.name
        w._varName = w_record.wid
        w._shpName = w_record.shpfilename
        return w
    return None

"""
Get W object list using weights uuid.
"""
def helper_get_W_list(wuuids):
    w_list = []
    for uuid in wuuids:
        w = helper_get_W(uuid)
        if w:
            w_list.append(w)
    return w_list


def get_valid_path(orig_path):
    shp_path = orig_path
    ext = shp_path[shp_path.rfind(".") +1 :]
    while os.path.isfile(shp_path):
        shp_path = shp_path[0 : shp_path.rfind(".")]
        suffix = shp_path.split("_")[-1]
        if suffix != shp_path and suffix.isdigit():
            next_num = int(suffix) + 1
            shp_path = "%s_%s.%s" % (shp_path[0: shp_path.rindex("_")], next_num, ext) 
        else:
            shp_path = "%s_1.%s" % (shp_path, ext)
    return shp_path
    

def get_abs_path(userid, shp_name):
    return os.path.join(
        settings.MEDIA_ROOT, 
        "temp", 
        md5(userid).hexdigest(), 
        shp_name
    )

def get_rel_path(user_uuid, shp_name):
    return os.path.join('temp', user_uuid, shp_name) 

def get_docfile_path(path):
    base, fname = os.path.split(path) 
    base, userid = os.path.split(base)
    return os.path.join('temp', userid, fname)
            
def gen_rnd_str(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

def _save_new_shapefile(userid, driver, abs_shp_path):
    table_name = None
    print "get meta data", abs_shp_path
    base_name, shp_name = os.path.split(abs_shp_path)
    user_uuid = md5(userid).hexdigest()
    shp_path = os.path.join('temp', user_uuid, shp_name)
    layer_uuid = md5(shp_path).hexdigest()
    if abs_shp_path.endswith('shp'):
        json_path = shp_path[0:shp_path.rindex(".")] + ".json"
    else:
        json_path = shp_path[0:shp_path.rindex(".")] + ".simp.json"
    json_path= json_path.replace('\\','/')
    meta_data = GeoDB.GetMetaData(abs_shp_path, table_name, driver)
    geom_type = meta_data['geom_type']
    
    print "save meta data", meta_data
    new_geodata = Geodata(
        uuid=layer_uuid,
        userid=userid, 
        name=shp_name,
        filepath=shp_path, 
        jsonpath=json_path,
        n=meta_data['n'], 
        geotype=str(geom_type), 
        bbox=str(meta_data['bbox']), 
        fields=json.dumps(meta_data['fields'])
    )
    new_geodata.save()
    # export to spatial database in background
    # note: this background process also compute min_threshold
    # and max_thresdhold
    from django.db import connection 
    connection.close()
    mp.Process(
        target=GeoDB.ExportToDB, 
        args=(abs_shp_path,layer_uuid, geom_type)
    ).start()
    print "uploaded done."
    result = meta_data
    result['layer_uuid'] = layer_uuid
    # in case of download from cartodb, show downloaded data directly
    result['shp_url'] = settings.URL_PREFIX + settings.MEDIA_URL + shp_path
    result['name'] = shp_name    
    
    return result

def zipshapefiles(shpPath):
    prefix = os.path.split(shpPath)[0]
    dbfPath = shpPath[:-3] + "dbf"
    shxPath = shpPath[:-3] + "shx"
    prjPath = shpPath[:-3] + "prj"
    orig_loc = os.getcwd()
    os.chdir(prefix) 
    ziploc = os.path.join(prefix, "upload.zip")
    try:
        os.remove(ziploc)
    except:
        pass
    try:
        import zlib
        mode = zipfile.ZIP_DEFLATED
    except:
        mode = zipfile.ZIP_DEFLATED
    myzip = zipfile.ZipFile("upload.zip",'w', mode) 
    myzip.write(os.path.split(shpPath)[1])
    myzip.write(os.path.split(shxPath)[1])
    myzip.write(os.path.split(dbfPath)[1])
    myzip.write(os.path.split(prjPath)[1])
    myzip.close()
    os.chdir(orig_loc)
    return ziploc

if __name__ == "__main__":
    #helper_get_W_list(["7819b820f3d4be9d99d3ea2602c11ad5"])
    print get_valid_path("/Users/xun/github/WebSDA-Django/myproject/media/temp/world_1.shp")
    print get_valid_path("/Users/xun/github/WebSDA-Django/myproject/media/temp/world.json")