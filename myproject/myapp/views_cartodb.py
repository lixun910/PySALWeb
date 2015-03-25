# -*- coding: utf-8 -*-
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings

from myproject.myapp.models import Geodata, CartoViz
from myproject.myapp.forms import DocumentForm

import logging, os, zipfile, shutil
from hashlib import md5
from views_utils import *
from views_utils import Save_new_shapefile
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
            if not os.path.exists(loc):
                os.mkdir(loc)
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
            result = Save_new_shapefile(userid, driver, shp_path)

            return HttpResponse(
                json.dumps(result),
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    

@login_required
def carto_upload_file(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'POST': 
        uid = request.GET.get("carto_uid", None)
        key = request.GET.get("carto_key", None)
        filelist = request.FILES.getlist('userfile')
        if key and uid:
            table_name = carto_upload_csv(filelist[0], uid, key)
            rsp = {'table_name':table_name}
            return HttpResponse(
                json.dumps(rsp),
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    

@login_required
def carto_add_field_from_file(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    if request.method == 'POST': 
        filelist = request.FILES.getlist('userfile')
        uid = request.POST.get("carto_uid", None)
        key = request.POST.get("carto_key", None)
        table_name = request.POST.get('table_name', None)
        field_name = request.POST.get('field_name', None)
        field_type = request.POST.get('field_type', None)
        file_name = request.POST.get('file_name', None)
 
        # upload zipped file to cartodb and get returned_table_name
        returned_table_name = carto_upload_csv(filelist[0], uid, key)
        
        # add field with field_name to destinated table_name
        carto_add_field_only(table_name, field_name, field_type, uid, key)
        
        # copy the field in returned_table_name to destinated table_name
        sql = 'UPDATE %s t1 SET %s=t2.%s FROM %s t2 WHERE t1.cartodb_id=t2.cartodb_id' % (table_name, field_name, field_name, returned_table_name)
        url = 'https://%s.cartodb.com/api/v2/sql' % uid
        params = { 'api_key': key, 'q': sql}
        r = requests.get(url, params=params, verify=False)
        
        # drop this temporay table created by zip file        
        cartodb_drop_table(returned_table_name, uid, key)
        
        rsp = {"sucess" : 1, 'table_name' : returned_table_name}
        return HttpResponse(json.dumps(rsp), content_type="application/json")    
    return HttpResponse(RSP_FAIL, content_type="application/json")    

def carto_add_field_only(table_name, field_name, field_type, uid, key):
    sql = 'ALTER TABLE %s ADD COLUMN %s %s' % (table_name, field_name, field_type)
    url = 'https://%s.cartodb.com/api/v2/sql' % uid
    params = { 'api_key': key, 'q': sql}
    r = requests.get(url, params=params, verify=False)
    try:
        #content = r.json()    
        print "Add field done"
    except:
        print "Add field faield"
        
def carto_upload_csv(fileObj, uid, key):
    url = "https://%s.cartodb.com/api/v1/imports/?api_key=%s" % (uid,key)
    r = requests.post(url, files={'file': fileObj}, verify=False)
    data = r.json()
    
    complete = False
    last_state = ''
    while not complete: 
        url = "https://%s.cartodb.com/api/v1/imports/%s?api_key=%s" % (uid, data['item_queue_id'], key)
        req = requests.get(url, verify=False)
        d = req.json()
        if last_state!=d['state']:
            last_state=d['state']
            if d['state']=='uploading':
                print 'Uploading file...'
            elif d['state']=='importing':
                print 'Importing data...'
            elif d['state']=='complete':
                complete = True
                print 'Table "%s" created' % d['table_name']
                return d['table_name']
        if d['state']=='failure':
            return None

def cartodb_drop_table(table_name, uid, key):
    # delete existing lisa_table 
    sql = 'DROP TABLE %s' % (table_name)
    url = 'https://%s.cartodb.com/api/v1/sql' % uid
    params = {
        'api_key': key,
        'q': sql,
    }
    r = requests.get(url, params=params, verify=False)
    try:
        content = r.json()    
        print "Drop table " + table_name + "done:" + json.dumps(content)
    except:
        print "Nothing dropped"
       
def _format_wegihts(content):
    neighbors = {}
    rows = data['rows']
    n = len(rows)
    for row in rows:
        id = int(row["id"])
        nn = [int(i) for i in row["nn"]]
        neighbors[id] = nn
    w = W(neighbors)
    
def cartodb_contiguity_w(table_name, uid, key, w_conf):
    sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM %s as a WHERE a.cartodb_id <> b.cartodb_id AND st_intersects(a.the_geom, b.the_geom)) as nn from %s as b" % (table_name, table_name)
    url = 'https://%s.cartodb.com/api/v1/sql' % uid
    params = { 'api_key': key, 'q': sql,}
    r = requests.get(url, params=params, verify=False)
    w = {}
    try:
        content = r.json()
        return _format_wegihts(content)
    except:
        print "cartodb_contiguity_w() error"
        return None
    
def cartodb_distance_w(table_name, uid, key, w_conf):
    if w_conf['pow_idist'] == None:
        sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM %s as a WHERE a.cartodb_id <> b.cartodb_id AND a.the_geom<->b.the_geom < %s)) as nn from %s as b" % (table_name, dist_threshold, table_name)
    else:
        sql = "select a.cartodb_id-1 as aid, b.cartodb_id-1 as bid, power(1.0/a.the_geom<->b.the_geom, %s) as dist from %s as a join %s as b on a.the_geom<->b.the_geom<%s and a.cartodb_id<>b.cartodb_id" % (pow_idx, table_name, table_name, dist_threshold)
        
    url = 'https://%s.cartodb.com/api/v1/sql' % uid
    params = { 'api_key': key, 'q': sql,}
    r = requests.get(url, params=params, verify=False)
    w = {}
    try:
        content = r.json()
        return _format_wegihts(content)
    except:
        print "cartodb_contiguity_w() error"
        return None
    
def cartodb_kernel_w(table_name, uid, key, w_conf):
    sql = "select b.cartodb_id-1 as id, ARRAY(SELECT a.cartodb_id-1 FROM %s as a WHERE a.cartodb_id <> b.cartodb_id AND st_intersects(a.the_geom, b.the_geom)) as nn from %s as b" % (table_name, table_name)
    url = 'https://%s.cartodb.com/api/v1/sql' % uid
    params = { 'api_key': key, 'q': sql,}
    r = requests.get(url, params=params, verify=False)
    w = {}
    try:
        content = r.json()
        return _format_wegihts(content)
    except:
        print "cartodb_contiguity_w() error"
        return None
    
def cartodb_get_columns(table_name, uid, key, col_names):
    sql = "SELECT %s FROM %s" % (",".join(col_names), table_name)
    url = 'https://%s.cartodb.com/api/v1/sql' % uid
    params = { 'api_key': key, 'q': sql, 'format': 'csv'}
    r = requests.get(url, params=params, verify=False)
    data = {}
    content = r.text
    rows = content.split("\n")
    for name in col_names:
        data[name] = []
    n = len(col_names)
    for row in rows[1:-1]:
        items = row.strip().split(",")
        for i in range(n):
            item = items[i]
            if item != "":
                data[col_names[i]].append(float(item))
            else:
                data[col_names[i]].append(0)
    return data

    
@login_required
def carto_create_viz(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        cartodb_uid = request.GET.get("carto_uid", None)
        cartodb_key = request.GET.get("carto_key", None)
        table_name = request.GET.get("map_name", None)
        viz_name = request.GET.get("viz_name", None)
        bounds = request.GET.getlist("bounds[]", None)
        center = request.GET.getlist("center[]", None)
        zoom = request.GET.get("zoom", None) 
        fields = request.GET.getlist('fields[]', [])
        
        map_type = request.GET.get('map_type', '')
        
        legend_name = request.GET.get('legend_name', "")
        legend_field = request.GET.get('legend_field', "")
        bins = request.GET.getlist('bins[]', None) 
        colors = request.GET.getlist('colors[]', None)
        legend_txts = request.GET.getlist('legend_txts[]', None)
        stroke_clr = request.GET.get('stroke_clr', "#000000")
        stroke_width = request.GET.get('stroke_width', "1")
        fill_clr = request.GET.get('fill_clr', "#00FFFF")
        alpha = request.GET.get('alpha', "0.8")
        
        if bounds:
            bounds = [[float(bounds[0]), float(bounds[1])], 
                      [float(bounds[2]), float(bounds[3])]]
        if center:
            center = [float(center[0]), float(center[1])]
            
        if zoom:
            zoom = int(zoom)
            
        if fields:
            new_fields = []
            for i, fld in enumerate(fields):
                info = {}
                info['name'] = fld
                info['title'] = True
                info['position'] = i
                new_fields.append(info)
            fields = new_fields
            
        def _get_css(clr):
            css = ""
            if map_type == "POINT":
                if clr:
                    css += "marker-fill: %s;" % clr
                else: 
                    css += "marker-fill: %s;" % fill_clr
                css += "marker-fill-opacity: %s;" % alpha
                css += "marker-line-color: %s;" % stroke_clr
                css += "marker-line-width: %s;" % stroke_width
                css += "marker-line-opacity: 1;"
                css += "marker-placement: point;"
                css += "marker-type: ellipse;"
                css += "marker-width: 10;"
                css += "marker-allow-overlap: True;"
                
            elif map_type == "POLYGON":
                if clr:
                    css += "polygon-fill:%s;" % clr
                else:
                    css += "polygon-fill:%s;" % fill_clr
                css += "polygon-opacity:%s;" % alpha
                css += "line-color: %s;" % stroke_clr
                css += "line-width: %s;" % stroke_width
                
            elif map_type == "LINE":
                if clr:
                    css += "line-color: %s;" % clr
                else:
                    css += "line-color: %s;" % stroke_clr
                css += "line-width: %s;" % stroke_width
                css += "line-opacity:%s" % alpha
            return css
        
        sql = "SELECT * FROM %s" % table_name
        legend_items =  []
        carto_css = []
        
        if colors:
            n = len(colors)
            for i, clr in enumerate(colors):
                _bin = bins[i] if i < n-1 else bins[i-1]
                name = legend_txts[i]
                
                legend_items.append({
                    "name": "%s" % name,
                    "visible": True,
                    "value": "%s" % clr,
                    "sync": True
                    })
               
                if map_type == 'lisa':
                    carto_css.append( '#%s [ %s = %s ] { %s }' % (table_name, legend_field, _bin, _get_css(clr)))
                else:
                    op = "<=" if i< n-1 else ">"
                    carto_css.append( '#%s [ %s %s %s ] { %s }' % (table_name, legend_field, op, _bin, _get_css(clr)))
            legend_items = legend_items[::-1]
            carto_css = " ".join([css for css in carto_css[::-1]])
        else:
            # simple map
            carto_css = '#%s { %s }' % (table_name, _get_css(None))
                
        vizjson = {
            "id" : "",
            "version" : "0.1.0",
            "title" : "%s" %viz_name,
            "likes" : 0,
            "description" : None,
            "scrollwheel" : True,
            "legends": True,
            "url": None,
            "map_provider": "leaflet",
            "bounds": bounds, 
            "center": str(center),
            "zoom": zoom,
            "updated_at": "%s" % time.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            "layers": [
                {
                    "options": {
                        "visible": True,
                        "type": "Tiled",
                        "urlTemplate": "https://{s}.maps.nlp.nokia.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?lg=eng&token=A7tBPacePg9Mj_zghvKt9Q&app_id=KuYppsdXZznpffJsKT24",
                        "subdomains": "1234",
                        "name": "Nokia Day",
                        "className": "nokia_day",
                        "attribution": "2012 Nokia <a href=http://here.net/services/terms target=_blank>Terms of use</a>"
                        },
                    "infowindow": None,
                    "tooltip": None,
                    "id": "5ce9d7bb-bc92-4d4a-b693-8a5bf4162ab0",
                    "order": 0,
                    "parent_id": None,
                    "children": [],
                    "type": "tiled"
                },
                {
                    "type": "layergroup",
                    "options": {
                        "user_name": "%s" % cartodb_uid,
                        "tiler_protocol": "http",
                        "tiler_domain": "cartodb.com",
                        "tiler_port": "80",
                        "sql_api_protocol": "http",
                        "sql_api_domain": "cartodb.com",
                        "sql_api_endpoint": "/api/v2/sql",
                        "sql_api_port": 80,
                        "cdn_url": {
                            "http": "api.cartocdn.com",
                            "https": "cartocdn.global.ssl.fastly.net"
                            },
                        "dynamic_cdn": False,
                        "layer_definition": {
                            "stat_tag": "bda2a12e-cbff-11e4-8cdf-0e4fddd5de28",
                            "version": "1.0.1",
                            "layers": [
                                {
                                    "id": "1864c68c-63cb-4f7f-a7c3-e3ecfeddb15d",
                                    "parent_id": None,
                                    "children": [],
                                    "type": "CartoDB",
                                    "infowindow": {
                                        "fields": fields,
                                        "template_name": "table/views/infowindow_light",
                                        "template": "<div class=\"cartodb-popup v2\">\n  <a href=\"#close\" class=\"cartodb-popup-close-button close\">x</a>\n  <div class=\"cartodb-popup-content-wrapper\">\n    <div class=\"cartodb-popup-content\">\n      {{#content.fields}}\n        {{#title}}<h4>{{title}}</h4>{{/title}}\n        {{#value}}\n          <p {{#type}}class=\"{{ type }}\"{{/type}}>{{{ value }}}</p>\n        {{/value}}\n        {{^value}}\n          <p class=\"empty\">null</p>\n        {{/value}}\n      {{/content.fields}}\n    </div>\n  </div>\n  <div class=\"cartodb-popup-tip-container\"></div>\n</div>\n",
                                        "alternative_names": {},
                                        "width": 226,
                                        "maxHeight": 180
                                        },
                                    "tooltip": {
                                        "fields": fields,
                                        "template_name": "tooltip_light",
                                        "template": "",
                                        "alternative_names": {},
                                        "maxHeight": 180
                                        },
                                    "legend": {
                                        "type": "custom",
                                        "show_title": True,
                                        "title": "%s" % legend_name,
                                        "template": "",
                                        "items": legend_items,
                                        },
                                    "order": 1,
                                    "visible": True,
                                    "options": {
                                        "sql": "%s" % sql,
                                        "layer_name": "%s" % table_name,
                                        "cartocss": "%s" % carto_css,
                                        "cartocss_version": "2.1.1",
                                        "interactivity": "cartodb_id",
                                        "table_name": "",
                                        "dynamic_cdn": False
                                    }
                                }
                            ]
                        }
                    }
                }
                ],
            "overlays": [
                {
                    "type": "share",
                    "order": 2,
                    "options": {
                        "display": True,
                        "x": 20,
                        "y": 20
                        },
                    "template": ""
                    },
                {
                    "type": "search",
                    "order": 3,
                    "options": {
                        "display": True,
                        "x": 60,
                        "y": 20
                        },
                    "template": ""
                    },
                {
                    "type": "zoom",
                    "order": 6,
                    "options": {
                        "display": True,
                        "x": 20,
                        "y": 20
                        },
                    "template": "<a href=#zoom_in class=zoom_in>+</a> <a href=#zoom_out class=zoom_out>-</a>"
                    },
                {
                    "type": "loader",
                    "order": 8,
                    "options": {
                        "display": True,
                        "x": 20,
                        "y": 150
                        },
                    "template": "<div class=loader original-title=''></div>"
                    },
                {
                    "type": "logo",
                    "order": 9,
                    "options": {
                        "display": True,
                        "x": 10,
                        "y": 40
                        },
                    "template": ""
                }
                ],
            "prev": None,
            "next": None,
            "transition_options": {
                "time": 0
            }            
        }
        vizjson = json.dumps(vizjson)
        vizjson = "vizjson(%s)" % vizjson
        
        user_uuid = md5(userid).hexdigest()
        uuid = md5(user_uuid+ viz_name).hexdigest()
        base_loc = os.path.join(settings.MEDIA_ROOT, 'temp', user_uuid)
        file_path = os.path.join(base_loc, viz_name+".json")
        o = open(file_path, 'w')
        o.write(vizjson)
        o.close()
        
        new_item = CartoViz(
            uuid=uuid,
            userid=user_uuid,
            name=viz_name,
        )
        new_item.save()
        rsp = {'userid':user_uuid, "vizname" : viz_name}
        if cartodb_key and cartodb_uid and table_name:
            return HttpResponse(
                json.dumps(rsp),
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    
