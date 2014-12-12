# -*- coding: utf-8 -*-
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings

from myproject.myapp.models import Geodata, Jobs
from myproject.myapp.forms import DocumentForm

import logging, os, zipfile, shutil
from hashlib import md5
from views_utils import *
from views_utils import _save_new_shapefile
import requests

logger = logging.getLogger(__name__)


@login_required
def open_data(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
    jobs = Jobs.objects.all().filter( userid=userid )
    
    jsonprefix = settings.URL_PREFIX + settings.MEDIA_URL
    return render_to_response(
        'myapp/open_data.html', {
            'userid': userid, 
            'jobs': jobs, 
            'n': len(jobs),
            'nn':range(1,len(jobs)+1),
            'url_prefix': settings.URL_PREFIX,
            'jsonprefix' : jsonprefix,
            'theme_jquery': settings.THEME_JQUERY,
            },
        context_instance=RequestContext(request)
    )

def job_google_search(q,bounds,gkey,name):
    pass

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
            bounds = [(float(top),float(right)), (float(bottom), float(left))]
            uuid = md5(q + name).hexdigest()
            result = {'success':0}
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
                mp.Process(target=job_google_search, args=(q,bounds,gkey,name)).start()
                result["success"] = 1
                return HttpResponse(
                    json.dumps(result),
                    content_type="application/json"
                )
    return HttpResponse(RSP_FAIL, content_type="application/json")    
