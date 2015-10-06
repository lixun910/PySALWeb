# -*- coding: utf-8 -*-
from django.db import models
from hashlib import md5

def get_upload_path(instance, filename):
    # build a dynamic path 
    user_id = md5(instance.userid).hexdigest()
    upload_dir = "temp/%s/%s" % (user_id, filename)
    #print "Upload dir set to: %s" % upload_dir
    return upload_dir

class Document(models.Model):
    uuid = models.AutoField(primary_key=True)
    
    #md5 [userid, filename]
    #uuid = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    userid = models.CharField(max_length=80)
    #filename = models.CharField(max_length=255)
    #docfile = models.FileField(upload_to=get_upload_path,storage=OverwriteStorage())
    docfile = models.FileField(upload_to=get_upload_path)
    
    class Meta:
        db_table = "myapp_document"

class MapConfigure(models.Model):
    uuid = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    # layer uuid: md5('temp/023420/xx.shp')
    layer_uuid = models.CharField(max_length=64, db_index=True)
    # layer name
    name = models.CharField(max_length=255)
    # configuration
    configuration = models.TextField()
    
    class Meta:
        db_table = "myapp_mapconfigure"    
    
class Geodata(models.Model):
    # layer uuid: md5('temp/023420/xx.shp')
    uuid = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    # what's its original filename
    filepath = models.CharField(max_length=255)
    jsonpath = models.CharField(max_length=255)
    # layer name
    name = models.CharField(max_length=80)
    # who upload 
    userid = models.CharField(max_length=80)
    n = models.IntegerField()
    geotype = models.CharField(max_length=10)
    # '[0.0, 0.1, 0.1, 0.0]' javascript evaled
    bbox = models.TextField()
    # fields: {fieldname:type}
    fields = models.TextField()
    category = models.CharField(max_length=80)
    keywords = models.CharField(max_length=255)
    description = models.TextField()
    minpairdist = models.FloatField(null=True, blank=True)
    thumbnail = models.URLField()
    
    class Meta:
        db_table = "myapp_geodata"    

class Weights(models.Model):
    #md5([username,shpfilename,wname])
    uuid = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    userid = models.CharField(max_length=80)
    shpfilename = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    n = models.IntegerField()
    wid = models.CharField(max_length=32)
    wtype = models.CharField(max_length=50)
    wtypemeta = models.TextField()
    histogram = models.TextField()
    neighbors = models.TextField()
    weights = models.TextField()
    
    class Meta:
        db_table = "myapp_weights"    

class Preference(models.Model):
    userid = models.CharField(max_length=80, unique=True, db_index=True, primary_key=True)
    spreg = models.TextField()
    category = models.TextField()
    cartodb = models.CharField(max_length=255)
    googlekey = models.CharField(max_length=255)
    
    class Meta:
        db_table = "myapp_preference"    
    
class SpregModel(models.Model):
    #md5([userid,layeruuid])
    userid = models.CharField(max_length=80)
    layeruuid = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    name = models.CharField(max_length=255)
    content = models.TextField()
    
    class Meta:
        db_table = "myapp_spregmodel"    

class Jobs(models.Model):
    uuid = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    userid = models.CharField(max_length=80)
    type = models.CharField(max_length=80)
    name = models.CharField(max_length=255)
    status = models.IntegerField() #0:init 1:pending 2:working 3: done 4:error
    parameters = models.TextField()
    log = models.TextField()
    time = models.FloatField(null=True, blank=True)
    
    class Meta:
        db_table = "myapp_jobs"    
    
class CartoViz(models.Model):
    uuid = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    userid = models.CharField(max_length=80)
    name = models.CharField(max_length=255)
    type = models.IntegerField()
    
    class Meta:
        db_table = "myapp_cartoviz"    
    