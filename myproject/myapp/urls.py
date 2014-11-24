# -*- coding: utf-8 -*-
import django
from django.conf.urls import patterns, url
from django.views.generic import TemplateView

urlpatterns = patterns('',
    url(r'^mylogin/$', 'django.contrib.auth.views.login', name='login'),
    url(r'^mylogout/$', 'django.contrib.auth.views.logout', name='logout'),
)
                       
urlpatterns += patterns('myproject.myapp.views',
    url(r'^test/$', 'test', name='test'),
    url(r'^dup_email/$', 'dup_email', name='dup email'),
    url(r'^signup/$', 'my_signup', name='signup'),
    url(r'^login/$', 'my_login', name='login'),
    url(r'^logout/$', 'my_logout', name='logout'),
    url(r'^save_pdf/$', 'save_pdf', name='save textarea to pdf'),
    #url(r'^list/$', 'list', name='list'),
    #url(r'^main/$', TemplateView.as_view(template_name='myapp/main.html')),
    url(r'^main/$','main', name='main'), 
) 

urlpatterns += patterns('myproject.myapp.views_map',
    url(r'^get_dropbox_data/$', 'get_dropbox_data', name='get map data dropbox'),
    url(r'^map_count/$', 'get_n_maps', name='login'),
    url(r'^new_map/$', 'new_map', name='get new map'),
    url(r'^remove_map/$', 'remove_map', name='delete map'),
    url(r'^download_map/$', 'download_map', name='download map'),
    url(r'^get_fields/$', 'get_fields', name='get field names'),
    url(r'^get_minmaxdist/$', 'get_minmaxdist', name='get'),
    url(r'^upload/$', 'upload', name='upload'),
    url(r'^upload_canvas/$', 'upload_canvas', name='upload canvas'),
    url(r'^draw/$', TemplateView.as_view(template_name='myapp/draw.html')),
)    
urlpatterns += patterns('myproject.myapp.views_weights',
    url(r'^add_UID/$', 'add_Unique_ID', name='add unique ID'),
    url(r'^check_ID/$', 'check_ID', name='check if field unique'),
    url(r'^download_w/$', 'download_w', name=''),
    url(r'^create_weights/$', 'create_weights', name=''),
    url(r'^check_w/$', 'check_w', name=''),
    url(r'^get_weights_names/$', 'get_weights_names', name=''),
    url(r'^weights/$', TemplateView.as_view(template_name='myapp/weights.html')),
)    
urlpatterns += patterns('myproject.myapp.views_spreg',
    url(r'^get_spreg_p/$', 'load_spreg_preference', name='load spreg preference'),
    url(r'^save_spreg_p/$', 'save_spreg_preference', name='save spreg preference'),
    url(r'^save_spreg_model/$', 'save_spreg_model', name='save spreg model'),
    url(r'^load_spreg_model/$', 'load_spreg_model', name='load spreg model'),
    url(r'^get_spreg_models/$', 'get_spreg_model_names', name='get spreg model names'),
    url(r'^save_spreg_result/$', 'save_spreg_result', name='save spreg result'),
    url(r'^spatial_regression/$', 'spatial_regression', name='spatial regression'),
)    
