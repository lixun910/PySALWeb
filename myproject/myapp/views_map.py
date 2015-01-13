# -*- coding: utf-8 -*-
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import InMemoryUploadedFile

from django.contrib.auth.decorators import login_required

import sys
import numpy as np
import json, time, os, logging, StringIO, shutil, time
import zipfile
import urllib
from hashlib import md5

from myproject.myapp.models import Document, Geodata, Weights, SpregModel, MapConfigure
from views_utils import * 
from views_utils import Save_new_shapefile

from pysal import Quantiles, Equal_Interval, Natural_Breaks, Fisher_Jenks, Moran_Local, W
from pysal import open as pysalOpen
import GeoDB
from network_cluster import NetworkCluster

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
def saveas_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        try:
            geodata = Geodata.objects.filter(uuid=layer_uuid).filter(userid=userid)
            if len(geodata) == 0:
                basedata = Geodata.objects.get(uuid=layer_uuid)
                ofpath = basedata.filepath
                base_loc, shp_name = os.path.split(ofpath)
                base_loc = os.path.join(settings.MEDIA_ROOT, base_loc)
                shp_name_noext = os.path.splitext(shp_name)[0]
                
                user_uuid = md5(userid).hexdigest()
                shp_path = os.path.join('temp', user_uuid, shp_name)
                abs_shp_path = os.path.join(settings.MEDIA_ROOT, shp_path)
                new_base_loc = os.path.join(settings.MEDIA_ROOT, 'temp', user_uuid)
                new_layer_uuid = md5(shp_path).hexdigest()
                
                if shp_name.endswith("json"):
                    driver = "GeoJSON"
                    shutil.copy(ofpath, shp_path) 
                else:
                    driver = "ESRI shapefile"
                    for f in os.listdir(base_loc):
                        if f.startswith(shp_name_noext):
                            old_f = os.path.join(base_loc, f)
                            new_f = os.path.join(new_base_loc, f)
                            shutil.copy(old_f,new_f)
                            
                Save_new_shapefile(userid, driver, abs_shp_path)
                return HttpResponse(RSP_OK, content_type="application/json")
        except:
            pass
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
def map_exist(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        bMap = GeoDB.IsLayerExist(layer_uuid)
        if bMap:
            return HttpResponse(RSP_OK, content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")
        
@login_required
def download_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        # download map files on disk
        try:
            geodata = Geodata.objects.get(uuid = layer_uuid)
            file_path = geodata.filepath
            shp_dir = os.path.join(settings.MEDIA_ROOT, "temp", md5(userid).hexdigest())
            shp_path = os.path.join(settings.MEDIA_ROOT, file_path)
            filename = geodata.name
            filename_wo_ext = filename[0: filename.rindex(".")+1]
            filename_ext = filename[filename.rindex(".")+1:]
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
        except:
            pass
    return HttpResponse(RSP_FAIL, content_type="application/json")
        
@login_required
def remove_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        # remove files on disk
        try:
            print "remove,userid,layer_uuid", userid, layer_uuid
            geodata = Geodata.objects.get(uuid = layer_uuid)
            file_path = geodata.filepath
            shp_dir = os.path.join(settings.MEDIA_ROOT, "temp", md5(userid).hexdigest())
            shp_path = os.path.join(settings.MEDIA_ROOT, file_path)
            filename = geodata.name
            filename_wo_ext = filename[0: filename.rindex(".")+1]
            filename_ext = filename[filename.rindex(".")+1:]
            filelist = [ f for f in os.listdir(shp_dir) \
                         if f.startswith(filename_wo_ext) ]
            for f in filelist:
                f = os.path.join(shp_dir, f)
                os.remove(f)
                   
                # remove record in Document
                docs = Document.objects.filter(docfile=file_path)
                for doc in docs:
                    doc.delete()
                
            geodata.delete()
            # remove record in spregmodel
            models = SpregModel.objects.filter(userid = userid).filter(layeruuid=layer_uuid)
            models.delete()
            # remove record in weights
            weights = Weights.objects.filter(userid=userid).filter(shpfilename=filename)
            weights.delete()
            # remove table d+layer_uuid
            GeoDB.DeleteLayer(layer_uuid)
            return HttpResponse(RSP_OK, content_type="application/json")
        except:
            pass
    
    return HttpResponse(RSP_FAIL, content_type="application/json")
    
@login_required
def get_map_names(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        maps = Geodata.objects.filter(userid=userid)
        map_names = {}
        for m in maps:
            map_names[m.uuid] = [m.name, int(m.geotype) if m.geotype else 0]
            
        if len(map_names) > 0:
            return HttpResponse(
                json.dumps(map_names), 
                content_type="application/json"
            )
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
        field_names = GeoDB.GetColumnNamesFromTable(layer_uuid)
        if len(field_names) > 0:
            return HttpResponse(
                json.dumps(field_names), 
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")


@login_required
def get_configure(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        map_confs = MapConfigure.objects.filter(uuid=layer_uuid)
        ret_confs = {}
        for conf in map_confs:
            ret_confs[conf.name] = conf.configuration
        
        return HttpResponse(json.dumps(ret_confs), content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")
        
@login_required
def save_configure(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        conf_name = request.GET.get("conf_name","")
        
        if layer_uuid and conf_name:
            fill_clr = request.GET.get("fill_clr","")
            stroke_clr = request.GET.get("stroke_clr","")
            stroke_width = request.GET.get("stroke_width","")
            opacity = request.GET.get("opacity","")
            params = {}
            if fill_clr: params['fill_color'] = fill_clr
            if stroke_clr: params['stroke_color'] = stroke_clr
            if stroke_width : params['stroke_width'] = stroke_clr
            if opacity: params['transparency'] = opacity
            
            map_conf = MapConfigure(
                uuid = layer_uuid,
                name = conf_name,
                configuration = json.dumps(params)
            )
            map_conf.save() 

        return HttpResponse(RSP_OK, content_type="application/json")
    return HttpResponse(RSP_FAIL, content_type="application/json")

@login_required
def get_metadata(:
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        try:
            geodata = Geodata.objects.get(uuid = layer_uuid)
            name = str(geodata.name)
            results = {}
            results['layer_uuid'] = layer_uuid
            results['name'] = name
            results['geo_type'] = geodata.geotype
            results['n'] = geodata.n
            results['fields'] = GeoDB.GetColumnNamesFromTable(layer_uuid)
            results['json_path'] = settings.URL_PREFIX + settings.MEDIA_URL + geodata.jsonpath
            return HttpResponse(json.dumps(results), content_type="application/json")
        except:
            pass
    return HttpResponse(RSP_FAIL, content_type="application/json")
    
@login_required
def get_minmaxdist(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        try:
            min_val, max_val = GeoDB.GetMinMaxDist(layer_uuid)
            results = {}
            results['min'] = min_val
            results['max'] = max_val
            results['step'] = (max_val-min_val) / 100.0
            return HttpResponse(json.dumps(results), 
                                content_type="application/json")
        except:
            pass
    return HttpResponse(RSP_FAIL, content_type="application/json")
    
@login_required
def thematic_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        col_name = request.GET.get("var","")
        method = request.GET.get("method","")
        k = request.GET.get("k",0)
        try:
            geodata = Geodata.objects.get(uuid = layer_uuid)
            if len(col_name) > 0:
                data = GeoDB.GetTableData(str(layer_uuid), [col_name])
                y = data[col_name]
                k = int(k)
                pysalFunc = None
                if method == "quantile":
                    pysalFunc = Quantiles
                elif method == "equal interval":
                    pysalFunc = Equal_Interval
                elif method == "natural breaks":
                    pysalFunc = Natural_Breaks
                elif method == "fisher jenks":
                    pysalFunc = Fisher_Jenks
                if pysalFunc: 
                    q = pysalFunc(np.array(y), k=k)    
                    bins = q.bins
                    id_array = []
                    for i, upper in enumerate(bins):
                        if i == 0: 
                            id_array.append([j for j,v in enumerate(y) if v <= upper])
                        else:
                            id_array.append([j for j,v in enumerate(y) \
                                             if bins[i-1] < v <= upper])
                    results = {
                        "k": len(bins),
                        "layer_uuid":layer_uuid,
                        "col_name" : col_name,
                        "method" : method,
                        "bins": bins if isinstance(bins, list) else bins.tolist(),
                        "id_array": id_array,
                    }
                    return HttpResponse(
                        json.dumps(results), 
                        content_type="application/json"
                    )
        except:
            pass
    return HttpResponse(RSP_FAIL, content_type="application/json")
    
@login_required
def lisa_map(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        var_x = request.GET.get("var", None)
        wuuid = request.GET.get("w", None)
        geodata = Geodata.objects.get(uuid = layer_uuid)
        if geodata and var_x and wuuid:
            data = GeoDB.GetTableData(str(layer_uuid), [var_x])
            x = data[var_x]
            w = helper_get_W(wuuid)
            y = np.array(x)
            
            lm = Moran_Local(y, w)
            bins = ["Not Significant","High-High","Low-High","Low-Low","Hight-Low"]
            id_array = []
            id_array.append([i for i,v in enumerate(lm.p_sim) \
                             if lm.p_sim[i] >= 0.05])
            for j in range(1,5): 
                id_array.append([i for i,v in enumerate(lm.q) \
                                 if v == j and lm.p_sim[i] < 0.05])
            results = {
                "method" : "lisa",
                "col_name": var_x,
                "bins": bins,
                "id_array" : id_array,
            }
            return HttpResponse(
                json.dumps(results), 
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")

@login_required
def spacetime(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        poly_uuid = request.GET.get("poly_uuid", None)
        point_uuid = request.GET.get("point_uuid", None)
        col_name = request.GET.get("count_col_name", None)
       
        if poly_uuid and point_uuid and col_name: 
            if GeoDB.CountPtsInPolys(poly_uuid, point_uuid, col_name):
                return HttpResponse(
                    RSP_OK,
                    content_type="application/json"
                )
    return HttpResponse(RSP_FAIL, content_type="application/json")    

@login_required
def road_segment(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        road_uuid = request.GET.get("road_uuid", None)
        road_seg_length = request.GET.get("road_seg_length", None)
        road_seg_fname = request.GET.get("road_seg_fname", None)
       
        if road_uuid and road_seg_length and road_seg_fname: 
            geodata = Geodata.objects.get(uuid=road_uuid)
            shp_path = os.path.join(settings.MEDIA_ROOT, geodata.filepath)
            json_path = os.path.join(settings.MEDIA_ROOT, geodata.jsonpath)
            shp_path = shp_path[0: shp_path.rindex(".")] + ".shp" # in case of .json
            prefix = os.path.split(shp_path)[0]
            ofn = road_seg_fname
            if ofn.endswith('shp'):
                ofn = os.path.join(prefix, ofn)
            else:
                ofn = os.path.join(prefix, ofn + ".shp")
                
            net = NetworkCluster(shp_path) 
            net.SegmentNetwork(int(road_seg_length))
            net.ExportCountsToShp(ofn, counts=False)
            
            driver = "ESRI shapefile"
            from views_utils import Save_new_shapefile
            Save_new_shapefile(userid, driver, ofn)
            
            return HttpResponse(
                RSP_OK,
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    

@login_required
def road_snap_points(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        road_uuid = request.GET.get("road_uuid", None)
        point_uuid = request.GET.get("point_uuid", None)
        col_name = request.GET.get("count_col_name", None)
        road_seg_length = request.GET.get("road_seg_length", None)
       
        if road_uuid and point_uuid and col_name: 
            geodata = Geodata.objects.get(uuid=road_uuid)
            shp_path = os.path.join(settings.MEDIA_ROOT, geodata.filepath)
            shp_path = shp_path[0: shp_path.rindex(".")] + ".shp" # in case of .json
                
            net = NetworkCluster(shp_path) 
            net.SegmentNetwork(sys.maxint)
            
            geodata = Geodata.objects.get(uuid=point_uuid)
            pt_path = os.path.join(settings.MEDIA_ROOT, geodata.filepath)
            pt_path = shp_path[0: shp_path.rindex(".")] + ".shp" # in case of .json
            counts = net.SnapPointsToNetwork(pt_path, float(road_seg_length))
            GeoDB.AddField(road_uuid, col_name, 0, counts)  # 0 integer
            
            return HttpResponse(
                RSP_OK,
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    

@login_required
def road_create_w(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        road_uuid = request.GET.get("road_uuid", None)
        road_seg_length = request.GET.get("road_seg_length", None)
        w_name = request.GET.get("w_name", None)
       
        if road_uuid and road_seg_length and w_name: 
            geodata = Geodata.objects.get(uuid=road_uuid)
            shp_path = os.path.join(settings.MEDIA_ROOT, geodata.filepath)
            shp_path = shp_path[0: shp_path.rindex(".")] + ".shp" # in case of .json
                
            net = NetworkCluster(shp_path) 
            net.SegmentNetwork(sys.maxint)
            net.CreateWeights(float(road_seg_length))
            w = W(net.neighbors)
            w.name = w_name            
            try:
                neighbors = json.dumps(net.neighbors)
            except:
                neighbors = {}
                for k,v in net.neighbors.iteritems():
                    neighbors[str(k)] = v
                neighbors = json.dumps(neighbors)
            weights = {}
            for k,v in w.weights.iteritems():
                weights[str(k)] = list(v)
            weights = json.dumps(weights) 
            shpfilename = os.path.split(shp_path)[1]
            wuuid = create_w_uuid(userid, road_uuid, w_name)
            
            new_w_item = Weights(
                uuid=wuuid, 
                userid=userid,
                shpfilename=shpfilename, 
                name = w_name, 
                n = w.n,
                wid = "fid", 
                wtype = '0', 
                wtypemeta = '{}',
                histogram = w.histogram, 
                neighbors = neighbors, 
                weights = weights
            )
            new_w_item.save() 
              
            return HttpResponse(
                RSP_OK,
                content_type="application/json"
            )
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
    
    def _save_upload_file(f, path):
        with open(path, 'wb+') as destination:
            for chunk in f.chunks():
                destination.write(chunk)        

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
                shp_name = fname if fname.find(os.sep) < 0 else \
                    os.path.split(fname)[-1]
                shp_path = get_abs_path(userid, shp_name)
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
        #if len(shp_path)  > 0 and isShp >= 3:
            # save to file information database
            #docfile = get_docfile_path(shp_path)
            #newdoc = Document(userid=userid, docfile=docfile)
            #newdoc.save()
        # remove temporary files
        shutil.rmtree(extractloc,ignore_errors=True)
        return isJson, isShp, shp_path, driver
        
    if request.method == 'POST': 
        # Get data from form
        filelist = request.FILES.getlist('userfile')
        if len(filelist) == 0:
            return HttpResponse(RSP_FAIL, content_type="application/json")
        
        elif len(filelist) == 1 and str(filelist[0]).endswith("zip"):
            # extract zip file at a temp folder under md5(userid)
            tmp_name = gen_rnd_str()
            base_loc = os.path.join(settings.MEDIA_ROOT, 'temp', user_uuid)
            if not os.path.exists(base_loc):
                os.mkdir(base_loc) 
            extract_loc = os.path.join(base_loc, tmp_name)
            ziploc = os.path.join(extract_loc, str(filelist[0]))
            if os.path.exists(extract_loc):
                shutil.rmtree(extract_loc)
            os.mkdir(extract_loc) 
            _save_upload_file(filelist[0], ziploc)
            isJson,isShp,shp_path,driver= _process_zip(userid,extract_loc,ziploc) 
        else:
            # save all files
            shpFile, shxFile, dbfFile, prjFile = (None,)*4
            for docfile in filelist:
                filename = str(docfile)
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
                    dbfFile = docfile
                elif filename.endswith("shx"):
                    isShp += 1
                    shxFile = docfile
                elif filename.endswith("prj"):
                    isShp += 1
                    prjFile = docfile
                
            if isJson or isShp >=3:
                newdoc = Document(userid = userid, docfile = shpFile)
                newdoc.save()
                real_file_path = newdoc.docfile.url
                shp_path = settings.PROJECT_ROOT
                pitems = real_file_path.split('/')
                for item in pitems:
                    if item != "":
                        shp_path = os.path.join(shp_path, item)
                if dbfFile:
                    dbf_path = shp_path[:-3] + "dbf"
                    _save_upload_file(dbfFile, dbf_path)
                if shxFile:
                    shx_path = shp_path[:-3] + "shx"
                    _save_upload_file(shxFile, shx_path)
                if prjFile:
                    prj_path = shp_path[:-3] + "prj"
                    _save_upload_file(prjFile, prj_path)
            
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
            base_loc = os.path.join(settings.MEDIA_ROOT, 'temp', user_uuid)
            extract_loc = os.path.join(base_loc, tmp_name)
            if os.path.exists(extract_loc):
                shutil.rmtree(extract_loc)
            os.mkdir(extract_loc) 
            zip_name = zip_url.split('/')[-1]
            zip_loc = os.path.join(extract_loc, zip_name)
            urllib.urlretrieve(zip_url, zip_loc)
            isJson,isShp,shp_path,driver=_process_zip(userid,extract_loc,zip_loc) 
            
        elif json_url or (shp_url and shx_url and dbf_url):
            if json_url != None:
                shp_name = json_url.split("/")[-1]
                shp_path = get_abs_path(userid, shp_name)
                shp_path = get_valid_path(shp_path)
                urllib.urlretrieve(json_url, shp_path)
                shp_name = os.path.split(shp_path)[1]
                driver = "GeoJSON"
                isJson = True
                proc = True
                
            elif shp_url and shx_url and dbf_url:
                shp_name = shp_url.split("/")[-1]
                shp_path = get_abs_path(userid, shp_name)
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
                docfile = get_rel_path(user_uuid, shp_name)
            )
            newdoc.save()
            
        if (isJson or isShp >= 3) and len(shp_path)> 0: 
            proc = True
            
    if proc:
        from views_utils import Save_new_shapefile
        result = Save_new_shapefile(userid, driver, shp_path)
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

    
