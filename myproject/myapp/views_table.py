# -*- coding: utf-8 -*-
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings
from django.db import models
from django.shortcuts import render
from django.db import connections, DEFAULT_DB_ALIAS

from myproject.myapp.models import Geodata, Jobs
from myproject.myapp.forms import DocumentForm

import logging, os, zipfile, shutil, time

from hashlib import md5
from views_utils import *

logger = logging.getLogger(__name__)

def get_field_type(connection, table_name, row):
    """
    Given the database connection, the table name, and the cursor row
    description, this routine will return the given field type name, as
    well as any additional keyword parameters and notes for the field.
    """
    field_params = dict()
    field_notes = []

    try:
        field_type = connection.introspection.get_field_type(row[1], row)
    except KeyError:
        field_type = 'TextField'
        field_notes.append('This field type is a guess.')

    # This is a hook for data_types_reverse to return a tuple of
    # (field_type, field_params_dict).
    if type(field_type) is tuple:
        field_type, new_params = field_type
        field_params.update(new_params)

    # Add max_length for all CharFields.
    if field_type == 'CharField' and row[3]:
        field_params['max_length'] = int(row[3])

    if field_type == 'DecimalField':
        if row[4] is None or row[5] is None:
            field_notes.append(
                'max_digits and decimal_places have been guessed, as this '
                'database handles decimal fields as float')
            field_params['max_digits'] = row[4] if row[4] is not None else 10
            field_params['decimal_places'] = row[5] if row[5] is not None else 5
        else:
            field_params['max_digits'] = row[4]
            field_params['decimal_places'] = row[5]

    return field_type, field_params, field_notes

@login_required
def get_table(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    if request.method == 'GET': 
        layer_uuid = request.GET.get("layer_uuid","")
        attrs = {'__module__': 'myproject.myapp.models'}
        connection = connections['default']
        cursor = connection.cursor() 
        for table_name in connection.introspection.table_names(cursor):
            if table_name == 'myapp_' + layer_uuid:
                try:
                    indexes = connection.introspection.get_indexes(cursor, table_name)
                except NotImplementedError:
                    indexes = {}                
                used_column_names = []
                for i, row in enumerate(connection.introspection.get_table_description(cursor, table_name)):
                    column_name = row[0]
                    if column_name.lower() == "wkb_geometry":
                        continue
                    pk = False
                    if column_name in indexes:
                        if indexes[column_name]['primary_key']:
                            pk = True                    
                    field_type, field_params, field_notes = \
                        get_field_type(connection, table_name, row)
                    if row[6]:  # If it's NULL...
                        if field_type == 'BooleanField(':
                            field_type = 'NullBooleanField('                        
                    if field_type == 'IntegerField':
                        attrs[column_name] = models.IntegerField() if not pk else \
                            models.IntegerField(primary_key=True)
                    elif field_type == 'CharField':
                        param = field_params['max_length']
                        attrs[column_name] = models.CharField(max_length=param)\
                            if not pk else \
                            models.CharField(max_length=param, primary_key=True)
                    elif field_type == 'FloatField':
                        attrs[column_name] = models.FloatField() if not pk else \
                            models.FloatField(primary_key=True)
                    elif field_type == 'DecimalField':
                        param1 = field_params['max_digits']
                        param2 = field_params['decimal_places']
                        attrs[column_name] = models.DecimalField(
                            max_digits=param1,
                            decimal_places=param2,
                        ) if not pk else \
                            models.DecimalField(max_digits=param1,
                                                decimal_places=param2,
                                                primary_key=True)
                    elif field_type == 'DateField':
                        attrs[column_name] = models.DateField()
                    elif field_type == 'DateTimeField':
                        attrs[column_name] = models.DateTimeField()
                    elif field_type == 'BooleanField':
                        attrs[column_name] = models.BooleanField()
                    elif field_type == 'TextField':
                        attrs[column_name] = models.TextField()
                Shp = type(str(layer_uuid), (models.Model,), attrs)
                """
                class ShpTable(tables.Table):
                    class Meta:
                        model = Shp
                        exclude = ("wkb_", )                        
                """
                return render(request, "myapp/dbtable.html", {
                    'userid': userid, 
                    'dbtable':Shp.objects.all(),
                    'STATIC_URL': settings.STATIC_URL,
                })
         
    return HttpResponse(RSP_FAIL, content_type="application/json")
