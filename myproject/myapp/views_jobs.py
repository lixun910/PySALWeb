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
import google

logger = logging.getLogger(__name__)


@login_required
def get_jobs(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
   
    job_type = request.GET.get("type", None) 
    if job_type:
        jobs = Jobs.objects.all().filter(userid=userid).filter(type=job_type)
    else:
        jobs = Jobs.objects.all().filter(userid=userid)
        
    results = []
    for job in jobs:
        item = {}
        item['type'] = job.type
        item['name'] = job.name
        item['status'] = job.status
        item['time'] = '%.2f' % job.time if job.time else ''
        item['log'] = job.log
        item['uuid'] = ''
        if job.status == 3:
            geodata_name = job.name + '.json'
            objs = Geodata.objects.filter(userid=userid).filter(name=geodata_name)
            for geodata in objs:
                item['uuid'] = geodata.uuid
                
        results.append(item)
    
    return HttpResponse(
        json.dumps(results), 
        content_type="application/json"
    )
