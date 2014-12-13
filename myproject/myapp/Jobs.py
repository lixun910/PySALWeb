import os, json, sys, shutil, time
import subprocess
from osgeo import ogr
from django.conf import settings
from hashlib import md5

from views_utils import _save_new_shapefile
import google

def job_google_search(userid, uuid, q,bounds,apikey, name, opath,k=3):
    start_time = time.time()
    from myproject.myapp.models import Jobs
    job = Jobs.objects.get(uuid=uuid)
    job.status = 2
    job.save()
    from django.db import connection 
    connection.close()
    status = ''
    status = google.googlept(
        bounds, q, apikey, lonx=False, bbox=True, k=k, ofile=opath
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
