# -*- coding: utf-8 -*-
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings

from myproject.myapp.models import Geodata, Jobs, Preference
from myproject.myapp.forms import DocumentForm

import logging, os, zipfile, shutil, time
from hashlib import md5
from views_utils import *
from views_utils import Save_new_shapefile
from views_cartodb import carto_upload_csv
from Jobs import job_google_search
import multiprocessing as mp
import google

logger = logging.getLogger(__name__)


@login_required
def open_data(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    jobs = Jobs.objects.all().filter( userid=userid )
    try:
        pref = Preference.objects.get(userid=userid)
        google_key = pref.googlekey
    except:
        google_key = ""
    
    jsonprefix = settings.URL_PREFIX + settings.MEDIA_URL
    return render_to_response(
        'myapp/open_data.html', {
            'userid': userid, 
            'google_key' : google_key,
            'jobs': jobs, 
            'n': len(jobs),
            'nn':range(1,len(jobs)+1),
            'url_prefix': settings.URL_PREFIX,
            'jsonprefix' : jsonprefix,
            'theme_jquery': settings.THEME_JQUERY,
            },
        context_instance=RequestContext(request)
    )

@login_required
def get_geoda_data(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
   
    q = request.GET.get("q", None) 
    if q:
        ds = []
    else:
        ds = Geodata.objects.all().filter(userid="geodacenter@asu.edu")
       
    check_in_cloud = False if userid == "geodacenter@asu.edu" else True
    results = []
    for d in ds:
        item = {}
        item['name'] = d.name
        item['n'] = d.n
        item['description'] = d.description
        item['uuid'] = d.uuid.strip()
        item['incloud'] = False
        if check_in_cloud:
            chk = Geodata.objects.filter(name=d.name).filter(userid=userid)
            if len(chk) > 0:
                item['incloud'] = True
        results.append(item)
    
    return HttpResponse(
        json.dumps(results), 
        content_type="application/json"
    )


@login_required
def google_search_carto(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        q = request.GET.get("q", None)
        bounds = request.GET.getlist("bounds[]", [])
        gkey = request.GET.get("gkey", None)
        name = request.GET.get("name", None)
        carto_uid = request.GET.get("carto_uid", None)
        carto_key = request.GET.get("carto_key", None)
    
        bounds = [float(i) for i in bounds]
        user_uuid = md5(userid).hexdigest()
        opath = os.path.join(
            settings.MEDIA_ROOT, 'temp', user_uuid, 
            name+".json"
        )
        findings = {}
        status = google.searchByKeyword(q, bounds, gkey, findings)
        if status == "OK":
            google.saveGeoJSON(findings, ofile=opath)
       
            # call to upload the file to CartoDB
            table_name = carto_upload_csv(open(opath, 'rb'), carto_uid, carto_key)
            
            rsp = {'status': status, 'table_name' : table_name}
            return HttpResponse(json.dumps(rsp), content_type="application/json")    
        
    return HttpResponse(RSP_FAIL, content_type="application/json")    
                
@login_required
def google_search(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        q = request.GET.get("q", None)
        left = request.GET.get("left", None)
        right = request.GET.get("right", None)
        top = request.GET.get("top", None)
        bottom = request.GET.get("bottom", None)
        gkey = request.GET.get("gkey", None)
        name = request.GET.get("name", None)
        k = request.GET.get("k", None)
        if q and left and right and top and bottom and gkey and name and k:
            bounds = [(float(top),float(left)), (float(bottom), float(right))]
            uuid = md5(q + name).hexdigest()
            result = {'success':0}
            try:
                pref = Preference.objects.get(userid=userid)
                pref.googlekey= gkey
                pref.save()
            except:
                new_pref = Preference(
                    userid = userid,
                    googlekey = gkey
                )
                new_pref.save()
            try:
                job = Jobs.objects.get(uuid=uuid)
                result["error"] = "job already exists."
                return HttpResponse(json.dumps(result), content_type="application/json") 
            except:
                new_job_item = Jobs(
                    uuid=uuid,
                    userid=userid,
                    type='google_search',
                    name=name,
                    status=0,
                    parameters=json.dumps({'q':q,'bounds':bounds,'gkey':gkey,'name':name})
                )
                new_job_item.save()
                from django.db import connection 
                connection.close()
                output_path = os.path.join(
                    settings.MEDIA_ROOT, 'temp', md5(userid).hexdigest(), 
                    name+".json"
                )
                k = int(k)
                job_google_search(userid, uuid, q, bounds, gkey, name, 
                                 output_path, k=k)
                """
                mp.Process(
                    target=job_google_search, 
                    args=(userid, uuid,q,bounds,gkey,name, output_path,k)
                ).start()
                """
                result["success"] = 1
                return HttpResponse(
                    json.dumps(result),
                    content_type="application/json"
                )
    return HttpResponse(RSP_FAIL, content_type="application/json")    
