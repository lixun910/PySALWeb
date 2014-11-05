# -*- coding: utf-8 -*-
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings
from django.contrib.auth.decorators import login_required

import numpy as np
import json, time, os, logging
from hashlib import md5

from pysal import W, w_union, higher_order
from pysal import rook_from_shapefile as rook
from pysal import queen_from_shapefile as queen
from pysal import open as pysalOpen
from pysal.core.IOHandlers.gal import GalIO as GAL
from pysal.core.IOHandlers.gwt import GwtIO as GWT

from myproject.myapp.models import Weights, Preference
import GeoDB
from views_utils import get_file_url, create_w_uuid, helper_get_W, RSP_FAIL, RSP_OK
from weights_dispatcher import CreateWeights

logger = logging.getLogger(__name__)

@login_required
def download_w(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET':
        w_uuid = request.GET.get("w_name", None)
        w_type = request.GET.get("w_type", None)
        if w_uuid and w_type:
            response = HttpResponse(content_type='text/txt')
            response['Content-Disposition'] = 'attachment; filename="download.%s"' % w_type
            w = helper_get_W(w_uuid)
            tmp_fname = settings.MEDIA_ROOT + "/temp/w.txt" 
            if w_type == "gal":
                g = GAL(tmp_fname, "w")
            else:
                g = GWT(tmp_fname, "w")
            g.file.close()
            g.file = response
            g.write(w)
            g.close()
            return response
    return HttpResponse(RSP_FAIL, content_type="application/json")
            
        
"""
Create weights file from a shape file using PySAL.
Note: weights are now stored in database as a JSON string, which
needs more discussion about, e.g. big size weights file.
"""
@login_required
def create_weights(request):
    print "start creating weights"
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'POST':
        layer_uuid = request.POST.get("layer_uuid",None)
        w_id = request.POST.get("w_id", None)
        w_name = request.POST.get("w_name", None)
        w_type = request.POST.get("w_type", None)
        cont_type = request.POST.get("cont_type", None)
        cont_order = request.POST.get("cont_order", None)
        cont_ilo = request.POST.get("cont_ilo", None)
        dist_metric = request.POST.get("dist_metric", None)
        dist_method = request.POST.get("dist_method", None)
        dist_value = request.POST.get("dist_value", None)
        kernel_type = request.POST.get("kernel_type", None)
        kernel_nn = request.POST.get("kernel_nn", None)
        #print request.POST
        file_url, shpfilename = get_file_url(userid, layer_uuid)
        file_url = settings.PROJECT_ROOT + file_url
        if file_url.endswith("json"):
            file_url = file_url[0:file_url.rindex(".")] + ".shp"
        shp_path = file_url
        print "create_weights", file_url
        # detect w_id is unique ID
        if w_id == "ogc_fid":
            w_id = "ogc_fid4"
            dbf_path = shp_path[:-3] + "dbf"
            f = pysalOpen(dbf_path,'r')
            if w_id not in f.header:
                print "add ogc_fid column"
                tmp_dbf_path = shp_path[:-3] + "tmp.dbf"
                newDB = pysalOpen(tmp_dbf_path, 'w')
                newDB.header = f.header
                newDB.header.append(w_id)
                newDB.field_spec = f.field_spec
                newDB.field_spec.append(('N',10,0))
                for i,row in enumerate(f):
                    row.append(i+1)
                    newDB.write(row) 
                newDB.close()
                import shutil
                shutil.copyfile(tmp_dbf_path, dbf_path)
            f.close()

        w = CreateWeights(shp_path, w_name, w_id, w_type,\
                          cont_type = cont_type,
                          cont_order = cont_order,
                          cont_ilo = cont_ilo,
                          dist_metric = dist_metric, 
                          dist_method = dist_method,
                          dist_value = dist_value,
                          kernel_type = kernel_type,
                          kernel_nn = kernel_nn)
        # save meta data and W object to database
        meta_data = {}
        meta_data['cont_type'] = cont_type
        meta_data['cont_order'] = cont_order
        meta_data['cont_ilo'] = cont_ilo
        meta_data['dist_metric'] = dist_metric
        meta_data['dist_method'] = dist_method
        meta_data['dist_value'] = dist_value
        meta_data['kernel_type'] = kernel_type
        meta_data['kernel_nn'] = kernel_nn
        wtypemeta = json.dumps(meta_data)
        wuuid = create_w_uuid(userid, layer_uuid, w_name)
        histogram = str(w.histogram)
        try:
            neighbors = json.dumps(w.neighbors)
        except:
            neighbors = {}
            for k,v in w.neighbors.iteritems():
                neighbors[str(k)] = v
        #try:
        #    weights = json.dumps(w.weights)
        #except:
        weights = {}
        for k,v in w.weights.iteritems():
            weights[str(k)] = list(v)
        
        new_w_item = Weights(uuid=wuuid, userid=userid, \
                             shpfilename=shpfilename, name=w_name, n=w.n,\
                             wid=w_id, wtype=w_type, wtypemeta=wtypemeta, \
                             histogram=histogram, neighbors=neighbors, \
                             weights=weights)
        new_w_item.save()
        return HttpResponse(RSP_OK, content_type="application/json")
    
    return HttpResponse(RSP_FAIL, content_type="application/json")

"""
Get all weights file names that created based on one map layer.
"""
@login_required
def get_weights_names(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        layer_uuid = request.GET.get('layer_uuid','')
        file_obj = get_file_url(userid, layer_uuid)
        if file_obj:
            file_url, shpfilename = file_obj
            w_array = Weights.objects.filter(userid = userid).filter(shpfilename = shpfilename)
            w_names = {}
            for w in w_array:
                w_names[w.name] = {}
                w_names[w.name]["uuid"] = w.uuid
                w_names[w.name]["type"] = w.wtype
            json_result = json.dumps(w_names)
            return HttpResponse(json_result, content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")

@login_required
def check_w(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    if request.method == 'GET': 
        layer_uuid = request.GET.get('layer_uuid','')
        w_name = request.GET.get('w_name', None)
        if w_name:
            wuuid = create_w_uuid(userid, layer_uuid, w_name)
            try:
                w_array = Weights.objects.get(uuid=wuuid)
                return HttpResponse("1")
            except:
                pass
    return HttpResponse("0")

@login_required
def check_ID(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    if request.method == 'GET': 
        layer_uuid = request.GET.get('layer_uuid','')
        field_name = request.GET.get('id_name', None)
        
        if GeoDB.IsFieldUnique(layer_uuid, field_name):
            return HttpResponse("1")
        
    return HttpResponse("0")
    
@login_required
def add_Unique_ID(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    if request.method == 'POST': 
        layer_uuid = request.POST.get('layer_uuid','')
        field_name = request.POST.get('name', None)
        
        if GeoDB.AddUniqueIDField(layer_uuid, field_name):
            return HttpResponse(RSP_OK, content_type="application/json")
        
    return HttpResponse(RSP_FAIL, content_type="application/json")
    