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
import json, time, os, logging, StringIO, shutil, time
import zipfile
import urllib
import multiprocessing as mp
from hashlib import md5

from myproject.myapp.models import Document, Geodata, Weights, SpregModel
from views_utils import get_file_url, RSP_FAIL, RSP_OK, get_valid_path, get_abs_path, gen_rnd_str, get_docfile_path, get_rel_path

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
                
                docfile = get_rel_path(userid, shp_name) 
                shp_doc = docs.filter(docfile=docfile)
                if shp_doc: shp_doc.delete()
                
                docfile = get_rel_path(userid, shp_name[:-3]+"dbf") 
                dbf_doc = docs.filter(docfile=docfile)
                if dbf_doc: dbf_doc.delete()
                
                docfile = get_rel_path(userid, shp_name[:-3]+"shx") 
                shx_doc = docs.filter(docfile=docfile)
                if shx_doc: shx_doc.delete()
                
                docfile = get_rel_path(userid, shp_name[:-3]+"prj") 
                prj_doc = docs.filter(docfile=docfile)
                if prj_doc: prj_doc.delete()
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
    
    user_uuid = md5(userid).hexdigest()
    shp_name = ""
    shp_path = ""
    isJson = False
    isShp = 0
    proc = False
    
    def _process_zip(userid, extractloc, ziploc):
        isJson = False
        isShp = 0
        shp_path = ""
        driver = ""
        zf = zipfile.ZipFile(ziploc) 
        zf.extractall(extractloc)
        # copy the files to md(userid) directory with proper file names
        o_shp_path = ""
        for fname in zf.namelist():
            if fname.endswith('shp') or fname.endswith('json'):
                if fname.endswith('json'):
                    driver = "GeoJSON"
                    isJson = True
                o_shp_path = os.path.join(extractloc, fname)
                shp_path = os.path.join(baseloc, fname)
                shp_name = fname
                shp_path = get_valid_path(shp_path)
                shutil.copy(o_shp_path, shp_path)
        if shp_name.endswith('shp'):
            isShp = 1
            driver = "ESRI shapefile"
            for i in ['dbf','shx','prj']:
                isShp += 1
                o_f_path = o_shp_path[:-3] + i
                if os.path.exists(o_f_path):
                    f_path = shp_path[:-3]  + i
                    shutil.copy(o_f_path, f_path)
        # add a row in Document table
        if len(shp_path)  > 0 and isShp >= 3:
            # save to file information database
            docfile = get_docfile_path(shp_path)
            newdoc = Document(
                userid=userid,
                docfile=docfile
            )
            newdoc.save()
        # remove temporary files
        shutil.rmtree(extractloc)
        return isJson, isShp, shp_path, driver
        
    if request.method == 'POST': 
        # Get data from form
        filelist = request.FILES.getlist('userfile')
        if len(filelist) == 0:
            return HttpResponse(RSP_FAIL, content_type="application/json")
        
        elif len(filelist) == 1 and str(filelist[0]).endswith("zip"):
            # extract zip file at a temp folder under md5(userid)
            tmpname = gen_rnd_str()
            baseloc = os.path.join(settings.MEDIA_ROOT, 'temp', user_uuid)
            extractloc = os.path.join(baseloc, tmpname)
            ziploc = os.path.join(extractloc, str(filelist[0]))
            if os.path.exists(extractloc):
                shutil.rmtree(extractloc)
            os.mkdir(extractloc) 
            with open(ziploc, 'wb+') as dest:
                for chunk in filelist[0].chunks():
                    dest.write(chunk)
            isJson,isShp,shp_path,driver=_process_zip(userid,extractloc,ziploc) 
        else:
            # save all files
            fileurls = []
            filenames = []
            shpFile = None
            for docfile in filelist:
                filename = str(docfile)
                filenames.append(filename)
                if filename.endswith("json"):
                    driver = "GeoJSON"
                    isJson = True
                    shpFile = docfile
                elif filename.endswith("shp"):
                    driver = "ESRI shapefile"
                    isShp += 1
                    shpFile = docfile
                elif filename.endswith("dbf"):
                    isShp += 1
                elif filename.endswith("shx"):
                    isShp += 1
                
            if isJson and isShp >=3 and shpFile:
                newdoc = Document(
                    userid = userid,
                    docfile = shpFile
                )
                newdoc.save()
                real_file_path = newdoc.docfile.url
                shp_path = settings.PROJECT_ROOT
                pitems = real_file_path.split('/')
                for item in pitems:
                    if item != "":
                        shp_path = os.path.join(shp_path, item)
            
        if (isJson or isShp >= 3) and len(shp_path)> 0: 
            proc = True
                
    elif request.method == 'GET':
        # Get data from dropbox or other links
        zip_url = request.GET.get('zip', None)
        json_url = request.GET.get('json', None)
        shp_url = request.GET.get('shp', None)
        shx_url = request.GET.get('shx', None)
        dbf_url = request.GET.get('dbf', None)
        prj_url = request.GET.get('prj', None)
        
        if zip_url != None:
            tmp_name = gen_rnd_str()
            base_loc = os.path.join(
                settings.MEDIA_ROOT, 
                'temp', 
                user_uuid,
            )
            extract_loc = os.path.join(base_loc, tmp_name)
            zip_name = zip_url.split('/')[-1]
            zip_loc = os.path.join(extract_loc, zip_name)
            urllib.urlretrieve(zip_url, zip_loc)
            isJson,isShp,shp_path,driver=_process_zip(userid,extract_loc,zip_loc) 
            
        else:
            if json_url != None:
                shp_name = json_url.split("/")[-1]
                shp_path = get_abs_path(shp_name)
                shp_path = get_valid_path(shp_path)
                urllib.urlretrieve(json_url, shp_path)
                shp_name = os.path.split(shp_path)[1]
                driver = "GeoJSON"
                isJson = True
                proc = True
                
            elif shp_url and shx_url and dbf_url:
                shp_name = shp_url.split("/")[-1]
                shp_path = get_abs_path(shp_name)
                shp_path = get_valid_path(shp_path)
                shp_name = os.path.split(shp_path)[1]
                dbf_path = shp_path[:-3] + "dbf"
                shx_path = shp_path[:-3] + "shx"
                urllib.urlretrieve(shp_url, shp_path)
                urllib.urlretrieve(dbf_url, dbf_path)
                urllib.urlretrieve(shx_url, shx_path)
                if prj_url:
                    prj_path = shp_path[:-3] + "prj"
                    urllib.urlretrieve(prj_url, prj_path)
                driver = "ESRI shapefile"
                isShp = 3
                proc = True
                
            # save to file information database
            newdoc = Document(
                userid= userid,
                docfile = get_rel_path(userid, shp_name)
            )
            newdoc.save()
        if (isJson or isShp >= 3) and len(shp_path)> 0: 
            proc = True
            
    if proc:
        # save meta data to Geodata table
        table_name = None
        print "get meta data", shp_path
        base_name, shp_name = os.path.split(shp_path)
        shp_name = os.path.join("temp", user_uuid, shp_name)
        meta_data = GeoDB.GetMetaData(shp_path, table_name, driver)
        print "save meta data", meta_data
        layer_uuid = md5(shp_path).hexdigest()
        new_geodata = Geodata(
            uuid=layer_uuid,
            userid=userid, 
            origfilename=shp_name, 
            n=meta_data['n'], 
            geotype=str(meta_data['geom_type']), 
            bbox=str(meta_data['bbox']), 
            fields=json.dumps(meta_data['fields'])
        )
        new_geodata.save()
        # export to spatial database in background
        # note: this background process also compute min_threshold
        # and max_thresdhold
        from django.db import connection 
        connection.close()
        mp.Process(target=GeoDB.ExportToDB, args=(shp_path,layer_uuid)).start()
        print "uploaded done."
        result = meta_data
        result['layer_uuid'] = layer_uuid
        
        return HttpResponse(json.dumps(result), content_type="application/json")

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

    
