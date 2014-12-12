# -*- coding: utf-8 -*-
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings

from myproject.myapp.models import Geodata
from myproject.myapp.forms import DocumentForm

import logging, os, zipfile, shutil
from hashlib import md5
from views_utils import *
from views_utils import _save_new_shapefile
import requests

logger = logging.getLogger(__name__)

@login_required
def google_search(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    if request.method == 'GET': 
        q = request.GET.get("q", None)
        bounds = request.GET.get("bounds", None)
        gkey = request.GET.get("gkey", None)
        name = request.GET.get("name", None)
        if q and bounds and gkey and name:
            
            return HttpResponse(
                RSP_OK,
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")    
