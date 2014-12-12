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
from views_utils import _save_new_shapefile
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

def job_google_search(userid, uuid, q,bounds,apikey, name, opath):
    start_time = time.time()
    from myproject.myapp.models import Jobs
    job = Jobs.objects.get(uuid=uuid)
    job.status = 2
    job.save()
    from django.db import connection 
    connection.close()
    status = google.googlept(
        bounds, q, apikey, lonx=False, bbox=True, k=3, ofile=opath
    )
    end_time = time.time()
    try: 
        job = Jobs.objects.get(uuid=uuid)
        job.log = status
        job.time = (end_time - start_time) / 60.0
        if status == 'OK':
            job.status = 3
        job.save()
        from django.db import connection 
        connection.close()
        
        if status == 'OK':
            _save_new_shapefile(userid, "GeoJSON", opath) 
    except:
        job = Jobs.objects.get(uuid=uuid)
        job.log = status
        job.time = (end_time - start_time) / 60.0
        job.status = 4
        job.save()
        from django.db import connection 
        connection.close()

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
        if q and left and right and top and bottom and gkey and name:
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
                """
                job_google_search(userid, uuid, q, bounds, gkey, name, 
                                 output_path)
                """
                mp.Process(
                    target=job_google_search, 
                    args=(userid, uuid,q,bounds,gkey,name, output_path)
                ).start()
                result["success"] = 1
                return HttpResponse(
                    json.dumps(result),
                    content_type="application/json"
                )
    return HttpResponse(RSP_FAIL, content_type="application/json")    
