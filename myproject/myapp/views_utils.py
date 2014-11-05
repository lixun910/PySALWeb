# -*- coding: utf-8 -*-
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.conf import settings


import logging
import json, time, os
from hashlib import md5
from pysal import W, w_union, higher_order

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
        file_uuid = md5(geodata.userid + geodata.origfilename).hexdigest()
        document = Document.objects.get(uuid=file_uuid)
        return document.docfile.url, document.filename
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
    

if __name__ == "__main__":
    #helper_get_W_list(["7819b820f3d4be9d99d3ea2602c11ad5"])
    print get_valid_path("/Users/xun/github/WebSDA-Django/myproject/media/temp/world_1.shp")
    print get_valid_path("/Users/xun/github/WebSDA-Django/myproject/media/temp/world.json")