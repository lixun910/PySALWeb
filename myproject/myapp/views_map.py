# -*- coding: utf-8 -*-
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings
from django.core.files import File
from django.contrib.auth.decorators import login_required

import numpy as np
import json, time, os, logging, StringIO
import zipfile
import multiprocessing as mp
from hashlib import md5

from myproject.myapp.models import Document, Geodata, Weights, SpregModel

from views_utils import get_file_url, RSP_FAIL, RSP_OK, get_valid_path
import GeoDB

logger = logging.getLogger(__name__)

@login_required
def get_dropbox_data(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'POST': 
        print request.POST;
        return HttpResponse(RSP_OK, content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")
   
@login_required
def get_n_maps(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    geodata = Geodata.objects.filter(userid=userid)
    if geodata:
        a = eval(RSP_OK)
        a["n"] = len(geodata)
        a = json.dumps(a)
        return HttpResponse(a, content_type="application/json")
    
    return HttpResponse(RSP_FAIL, content_type="application/json")
    
@login_required
def new_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        shp_url_obj = get_file_url(userid, layer_uuid)
        if shp_url_obj:
            shp_location, shp_name = shp_url_obj
            if shp_location.endswit("json"):
                json_location = shp_location[:-3] + "simp.json"
            else:
                json_location = shp_location[:-3] + "json"
            print json_location
            if not os.path.isfile(json_location):
                return render_to_response(
                    'myapp/map.html',
                    {'json_url': json_location,'url_prefix': settings.URL_PREFIX},
                    context_instance=RequestContext(request)
                )
    return HttpResponse(RSP_FAIL, content_type="application/json")

@login_required
def download_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        # download map files on disk
        shp_url_obj = get_file_url(userid, layer_uuid)
        if shp_url_obj:
            shp_location, shp_name = shp_url_obj
            shp_location = settings.PROJECT_ROOT + shp_location
            print "download: shp_location,shp_name", shp_location, shp_name
            filename_wo_ext = shp_name[0: shp_name.rindex(".")+1]
            shp_dir = shp_location[0: shp_location.rindex("/")]
            filename_ext = shp_name[shp_name.rindex(".")+1:]
            if filename_ext == "shp":
                filelist = [ f for f in os.listdir(shp_dir) \
                             if f.startswith(filename_wo_ext) and \
                                 not f.endswith("json") and \
                                 not f.endswith("png")]
            else:
                filelist = [shp_name] # json
            zip_subdir = "map"
            zip_filename = "%s.zip" % zip_subdir
            # Open StringIO to grab in-memory ZIP contents
            s = StringIO.StringIO()
            # The zip compressor
            zf = zipfile.ZipFile(s, "w")
            for f in filelist:
                fpath = shp_dir + os.sep + f
                zip_path = os.path.join(zip_subdir, f)
                zf.write(fpath, zip_path)
            zf.close()
            resp = HttpResponse(s.getvalue(), mimetype = "application/x-zip-compressed")
            resp['Content-Disposition'] = 'attachment; filename=%s' % zip_filename
            return resp
    return HttpResponse(RSP_FAIL, content_type="application/json")
        
@login_required
def remove_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        # remove files on disk
        print "remove,userid,layer_uuid", userid, layer_uuid
        shp_url_obj = get_file_url(userid, layer_uuid)
        if shp_url_obj:
            shp_location, shp_name = shp_url_obj
            shp_location = settings.PROJECT_ROOT + shp_location
            print "remove,shp_location,shp_name", shp_location, shp_name
            filename_wo_ext = shp_name[0: shp_name.rindex(".")+1]
            shp_dir = shp_location[0: shp_location.rindex("/")]
            filelist = [ f for f in os.listdir(shp_dir) \
                         if f.startswith(filename_wo_ext) ]
            for f in filelist:
                f = shp_dir + os.sep + f
                os.remove(f)
                
            geodata = Geodata.objects.get(uuid=layer_uuid)
            # remove record in Document
            file_uuid = md5(geodata.userid + geodata.origfilename).hexdigest()
            if shp_name.endswith(".shp"):
                docs = Document.objects.filter(userid=userid)
                shp_doc = docs.filter(filename=shp_name)
                shp_doc.delete()
                dbf_doc = docs.filter(filename=shp_name[:-3]+"dbf")
                dbf_doc.delete()
                shx_doc = docs.filter(filename=shp_name[:-3]+"shx")
                shx_doc.delete()
            else:
                document = Document.objects.get(uuid=file_uuid)
                document.delete()
            
            # remove record in Geodata
            geodata.delete()
            # remove record in spregmodel
            models = SpregModel.objects.filter(userid = userid)\
                   .filter(layeruuid=layer_uuid)
            models.delete()
            # remove record in weights
            weights = Weights.objects.filter(userid=userid)\
                    .filter(shpfilename=shp_name)
            weights.delete()
            # remove table d+layer_uuid
            GeoDB.DeleteLayer(layer_uuid)
        return HttpResponse(RSP_OK, content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")
        
    
"""
Get field names from a map layer. 
The layer_uuid is used to query from Geodata database.
"""
@login_required
def get_fields(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        geodata = Geodata.objects.get(uuid = layer_uuid)
        if geodata:
            fields = str(geodata.fields)
            fields = fields.replace("'","\"")
            print "get_fields", fields
            return HttpResponse(fields, content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")

@login_required
def get_minmaxdist(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        geodata = Geodata.objects.get(uuid = layer_uuid)
        if geodata:
            min_val = geodata.minpairdist
            if min_val: 
                bbox = eval(geodata.bbox)
                max_val = ((bbox[1] - bbox[0])**2 + (bbox[3] - bbox[2])**2)**0.5
                return HttpResponse('{"min":%f, "max":%f}'%(min_val,max_val), content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")
    
"""
Upload shape files to server. Write meta data to meta database.
In background, export files to spatial database. 
"""
@login_required
def upload(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    layer_uuid = ""
    proc = False
    shp_name = ""
    shp_path = ""
    isJson = False
    isShp = False
    isDBF = False
    isShx = False
    
    if request.method == 'POST': 
        # Get data from form
        filelist = request.FILES.getlist('docfile')
        if len(filelist) == 0:
            return HttpResponse(RSP_FAIL, content_type="application/json")
        filenames = []
        fileurls = []
        
        # save all files
        for docfile in filelist:
            filename = str(docfile)
            filenames.append(filename)
            shpuuid =  md5(userid+filename).hexdigest()
            if filename[filename.rfind("."):] in [".shp",".json",".geojson"]:
                layer_uuid = shpuuid
            newdoc = Document(uuid = shpuuid, userid = userid,\
                              filename=filename, docfile = docfile)
            newdoc.save()
            fileurls.append(newdoc.docfile.url)
            
        # move files to sqlite db
        for i, name in enumerate(filenames):
            if name.endswith("json"):
                driver = "GeoJSON"
                isJson = True
            elif name.endswith("shp"):
                driver = "ESRI shapefile"
                isShp = True
            elif name.endswith("dbf"):
                isDBF = True
            elif name.endswith("shx"):
                isShx = True
                
            if name.endswith("json") or name.endswith("shp"):
                shp_name = name
                shp_path = settings.PROJECT_ROOT + fileurls[i]
                
            if isJson or (isShp and isDBF and isShx): 
                proc = True
                break
                
    elif request.method == 'GET':
        # Get data from dropbox or other links
        json_url = request.GET.get('json', None)
        shp_url = request.GET.get('shp', None)
        shx_url = request.GET.get('shx', None)
        dbf_url = request.GET.get('dbf', None)
        import urllib
        if json_url != None:
            shp_name = json_url.split("/")[-1]
            shp_path = settings.MEDIA_ROOT + "/temp/" + shp_name
            shp_path = get_valid_path(shp_path)
            shp_name = shp_path[shp_path.rindex("/") + 1:]
            urllib.urlretrieve(json_url, shp_path)
            driver = "GeoJSON"
            proc = True
        elif shp_url and shx_url and dbf_url:
            shp_name = shp_url.split("/")[-1]
            shp_path = settings.MEDIA_ROOT + "/temp/" + shp_name
            shp_path = get_valid_path(shp_path)
            shp_name = shp_path[shp_path.rindex("/") + 1:]
            dbf_path = shp_path[:-3] + "dbf"
            shx_path = shp_path[:-3] + "shx"
            print "upload from dropbox", shp_name, shp_path
            urllib.urlretrieve(shp_url, shp_path)
            urllib.urlretrieve(dbf_url, dbf_path)
            urllib.urlretrieve(shx_url, shx_path)
            driver = "ESRI shapefile"
            proc = True
        # save to file information database
        layer_uuid =  md5(userid + shp_name).hexdigest()
        #docfile = File(open(shp_path))
        newdoc = Document(uuid= layer_uuid, userid= userid,filename=shp_name, docfile = "temp/"+shp_name)
        newdoc.save()
    
    if proc:
        if layer_uuid == "": 
            layer_uuid = md5(userid + shp_name).hexdigest()
        # save meta data to Geodata table
        table_name = None
        print "get meta data", shp_path
        meta_data = GeoDB.GetMetaData(shp_path, table_name, driver)
        print "save meta data", meta_data
        new_geodata = Geodata(uuid=layer_uuid, userid=userid, 
                              origfilename=shp_name, n=meta_data['n'], 
                              geotype=str(meta_data['geom_type']), 
                              bbox=str(meta_data['bbox']), 
                              fields=json.dumps(meta_data['fields']))
        new_geodata.save()
        # export to spatial database in background
        # note: this background process also compute min_threshold
        # and max_thresdhold
        from django.db import connection 
        connection.close()
        mp.Process(target=GeoDB.ExportToDB, 
                   args=(shp_path,layer_uuid)).start()
        print "uploaded done."
        return HttpResponse('{"layer_uuid":"%s"}'%layer_uuid, 
                            content_type="application/json")

    return HttpResponse(RSP_FAIL, content_type="application/json")

"""
Check if field exists in Django DB
"""
@login_required
def check_field(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get('layer_uuid',None)
        field_name = request.GET.get('field_name',None)
        if layer_uuid and field_name:
            geodata = Geodata.objects.get(uuid = layer_uuid)
            if geodata:
                fields = json.loads(geodata.fields)
                if field_name in fields:
                    return HttpResponse("1")
    return HttpResponse("0")
    
"""
Upload the image that draw on user's browser in HTML5 canvas.
The image name will just append ".png" to shape file name.
The url of image is stored in related geodatabase under the field
"thumbnail".
"""
@login_required
def upload_canvas(request):
    import base64, cStringIO, re
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'POST': 
        layer_uuid = request.POST.get('layer_uuid',None)
        if layer_uuid:
            shp_url = get_file_url(userid, layer_uuid)
            if shp_url:
                shp_location, shp_name = shp_url
                image_location = settings.PROJECT_ROOT + shp_location + ".png"
                print image_location
                if not os.path.isfile(image_location):
                    datauri = request.POST['imageData']
                    #print datauri
                    imgstr = re.search(r'base64,(.*)', datauri).group(1)
                    o = open(image_location, 'wb')
                    o.write(imgstr.decode('base64'))
                    o.close()
                    # update Geodata table
                    geodata = Geodata.objects.get(uuid=layer_uuid)
                    geodata.thumbnail = shp_location + ".png"
                    geodata.save()
                    return HttpResponse("OK")

    return HttpResponse("ERROR")

    
