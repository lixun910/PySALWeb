# -*- coding: utf-8 -*-
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings
from django.contrib.auth.decorators import login_required

import numpy as np
import json, time, os, logging,shutil
from hashlib import md5

from pysal import rook_from_shapefile as rook
from pysal import queen_from_shapefile as queen
from pysal import open as pysalOpen
from pysal.core.IOHandlers.gal import GalIO as GAL
from pysal.core.IOHandlers.gwt import GwtIO as GWT

from myproject.myapp.models import Weights, Preference
import GeoDB
from views_utils import *
from weights_dispatcher import CreateWeights

logger = logging.getLogger(__name__)

@login_required
def scatter_plot(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        var_x = request.GET.get("var_x", None)
        var_y = request.GET.get("var_y", None)
        geodata = Geodata.objects.get(uuid = layer_uuid)
        if geodata and var_x and var_y:
            data = GeoDB.GetTableData(str(layer_uuid), [var_x, var_y])
            x = data[var_x]
            y = data[var_y]
            results = {
                "x": x,
                "y": y,
                "x_name": x,
                "y_name": y
            }
            return HttpResponse(
                json.dumps(results), 
                content_type="application/json"
            )
    return HttpResponse(RSP_FAIL, content_type="application/json")