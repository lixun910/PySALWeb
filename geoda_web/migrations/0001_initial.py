# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import geoda_web.models


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CartoViz',
            fields=[
                ('uuid', models.CharField(max_length=64, unique=True, serialize=False, primary_key=True, db_index=True)),
                ('userid', models.CharField(max_length=80)),
                ('name', models.CharField(max_length=255)),
                ('type', models.IntegerField()),
            ],
            options={
                'db_table': 'myapp_cartoviz',
            },
        ),
        migrations.CreateModel(
            name='Document',
            fields=[
                ('uuid', models.AutoField(serialize=False, primary_key=True)),
                ('userid', models.CharField(max_length=80)),
                ('docfile', models.FileField(upload_to=geoda_web.models.get_upload_path)),
            ],
            options={
                'db_table': 'myapp_document',
            },
        ),
        migrations.CreateModel(
            name='Geodata',
            fields=[
                ('uuid', models.CharField(max_length=64, unique=True, serialize=False, primary_key=True, db_index=True)),
                ('filepath', models.CharField(max_length=255)),
                ('jsonpath', models.CharField(max_length=255)),
                ('name', models.CharField(max_length=80)),
                ('userid', models.CharField(max_length=80)),
                ('n', models.IntegerField()),
                ('geotype', models.CharField(max_length=10)),
                ('bbox', models.TextField()),
                ('fields', models.TextField()),
                ('category', models.CharField(max_length=80)),
                ('keywords', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('minpairdist', models.FloatField(null=True, blank=True)),
                ('thumbnail', models.URLField()),
            ],
            options={
                'db_table': 'myapp_geodata',
            },
        ),
        migrations.CreateModel(
            name='Jobs',
            fields=[
                ('uuid', models.CharField(max_length=64, unique=True, serialize=False, primary_key=True, db_index=True)),
                ('userid', models.CharField(max_length=80)),
                ('type', models.CharField(max_length=80)),
                ('name', models.CharField(max_length=255)),
                ('status', models.IntegerField()),
                ('parameters', models.TextField()),
                ('log', models.TextField()),
                ('time', models.FloatField(null=True, blank=True)),
            ],
            options={
                'db_table': 'myapp_jobs',
            },
        ),
        migrations.CreateModel(
            name='MapConfigure',
            fields=[
                ('uuid', models.CharField(max_length=64, unique=True, serialize=False, primary_key=True, db_index=True)),
                ('layer_uuid', models.CharField(max_length=64, db_index=True)),
                ('name', models.CharField(max_length=255)),
                ('configuration', models.TextField()),
            ],
            options={
                'db_table': 'myapp_mapconfigure',
            },
        ),
        migrations.CreateModel(
            name='Preference',
            fields=[
                ('userid', models.CharField(max_length=80, unique=True, serialize=False, primary_key=True, db_index=True)),
                ('spreg', models.TextField()),
                ('category', models.TextField()),
                ('cartodb', models.CharField(max_length=255)),
                ('googlekey', models.CharField(max_length=255)),
            ],
            options={
                'db_table': 'myapp_preference',
            },
        ),
        migrations.CreateModel(
            name='SpregModel',
            fields=[
                ('userid', models.CharField(max_length=80)),
                ('layeruuid', models.CharField(max_length=64, unique=True, serialize=False, primary_key=True, db_index=True)),
                ('name', models.CharField(max_length=255)),
                ('content', models.TextField()),
            ],
            options={
                'db_table': 'myapp_spregmodel',
            },
        ),
        migrations.CreateModel(
            name='Weights',
            fields=[
                ('uuid', models.CharField(max_length=64, unique=True, serialize=False, primary_key=True, db_index=True)),
                ('userid', models.CharField(max_length=80)),
                ('shpfilename', models.CharField(max_length=255)),
                ('name', models.CharField(max_length=255)),
                ('n', models.IntegerField()),
                ('wid', models.CharField(max_length=32)),
                ('wtype', models.CharField(max_length=50)),
                ('wtypemeta', models.TextField()),
                ('histogram', models.TextField()),
                ('neighbors', models.TextField()),
                ('weights', models.TextField()),
            ],
            options={
                'db_table': 'myapp_weights',
            },
        ),
    ]
