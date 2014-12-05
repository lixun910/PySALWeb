# -*- coding: utf-8 -*-
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings

from myproject.myapp.models import Document, Weights, Geodata, Preference
from myproject.myapp.forms import DocumentForm

import logging, os, zipfile, shutil
from hashlib import md5
from views_utils import *
from views_utils import _save_new_shapefile
import requests

logger = logging.getLogger(__name__)

@login_required
def carto_get_tables(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        cartodb_uid = request.GET.get("cartodb_uid", None)
        cartodb_key = request.GET.get("cartodb_key", None)

        if cartodb_key and cartodb_uid:
            url = 'https://%s.cartodb.com/api/v1/sql' % cartodb_uid
            sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
            params = { 'api_key': cartodb_key, 'q': sql,}
            r = requests.get(url, params=params, verify=False)
            content = r.json()    
            table_names = []
            if "error" in content:
                print "get all tables () error:", content
            else:
                rows = content["rows"]
                for row in rows:
                    table_name = row["table_name"] 
                    if table_name not in ["raster_columns","raster_overviews", 
                                          "spatial_ref_sys","geometry_columns",
                                          "geography_columns"]:
                        table_names.append(table_name)
            result = {}
            for tbl in table_names:
                sql = "SELECT ST_GeometryType(the_geom) FROM %s LIMIT 1" % tbl
                params = { 'api_key': cartodb_key, 'q': sql,}
                r = requests.get(url, params=params, verify=False)
                content = r.json()
                if "error" not in content:
                    rows = content["rows"]
                    row = rows[0]
                    print row
                    if 'st_geometrytype' in row:
                        geotype = row["st_geometrytype"]
                        if geotype != None:
                            if geotype.find("Point") > -1 :
                                result[tbl] = 'Point'
                            elif geotype.find("Line") > -1:
                                result[tbl] = 'Line'
                            elif geotype.find("Poly") > -1:
                                result[tbl] = "Polygon"            
            return HttpResponse(
                json.dumps(result),
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    

@login_required
def carto_download_table(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        cartodb_uid = request.GET.get("cartodb_uid", None)
        cartodb_key = request.GET.get("cartodb_key", None)
        table_name = request.GET.get("table_name", None)
        if cartodb_key and cartodb_uid and table_name:
            sql = 'select * from %s' % table_name
            url = 'https://%s.cartodb.com/api/v1/sql' % cartodb_uid
            params = {
                'filename': 'cartodb-query',
                'format': 'shp' ,
                'api_key': cartodb_key,
                'q': sql,
            }
            r = requests.get(url, params=params, verify=False)
            if r.ok == False:
                # try again, sometime the CartoDB call doesn't work
                r = requests.get(url, params=params, verify=False)
            if r.ok == False:
                print "Get data from CartoDB faield!"
                return
            
            content = r.content 
            loc = os.path.join(settings.MEDIA_ROOT, 'temp', 
                               md5(userid).hexdigest())
            ziploc = os.path.join(loc, "tmp.zip")
            
            o = open(ziploc, "wb")
            o.write(content)
            o.close()
            
            zf = zipfile.ZipFile(ziploc)
            zf.extractall(loc)
            
            for filename in os.listdir(loc):
                if filename.startswith("cartodb-query"):
                    oldname = os.path.join(loc, filename)
                    newname = os.path.join(loc, 'cartodb_'+table_name + filename[-4:])
                    shutil.copy(oldname, newname)
                    try:
                        os.remove(oldname)
                    except:
                        pass
            shp_path = os.path.join(loc, 'cartodb_'+table_name + ".shp")
            driver = 'ESRI shapefile'
            result = _save_new_shapefile(userid, driver, shp_path)

            return HttpResponse(
                json.dumps(result),
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    

@login_required
def carto_upload_table(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        cartodb_uid = request.GET.get("cartodb_uid", None)
        cartodb_key = request.GET.get("cartodb_key", None)
        table_name = request.GET.get("cartodb_table_name", None)
        if cartodb_key and cartodb_uid and table_name:
            return HttpResponse(
                RSP_OK,
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    
