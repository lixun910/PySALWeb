# -*- coding: utf-8 -*-
import django
from django.conf.urls import patterns, url
from django.views.generic import TemplateView

urlpatterns = patterns('',
    url(r'^mylogin/$', 'django.contrib.auth.views.login', name='login'),
    url(r'^mylogout/$', 'django.contrib.auth.views.logout', name='logout'),
)
                       
urlpatterns += patterns('myproject.myapp.views',
    #url(r'^open_data/$', TemplateView.as_view(template_name='myapp/open_data.html')),
    url(r'^dup_email/$', 'dup_email', name='dup email'),
    url(r'^signup/$', 'my_signup', name='signup'),
    url(r'^login/$', 'my_login', name='login'),
    url(r'^logout/$', 'my_logout', name='logout'),
    url(r'^save_pdf/$', 'save_pdf', name='save textarea to pdf'),
    #url(r'^list/$', 'list', name='list'),
    url(r'^main/$','main', name='main'), 
    url(r'^index/$','index', name='index'), 
) 

urlpatterns += patterns('myproject.myapp.views_table',
    url(r'^get_table/$', 'get_table', name='get table'),
)

urlpatterns += patterns('myproject.myapp.views_jobs',
    url(r'^get_jobs/$', 'get_jobs', name='get jobs'),
)

urlpatterns += patterns('myproject.myapp.views_opendata',
    url(r'^get_google_key/$', 'get_google_key', name='get google key'),
    url(r'^save_google_key/$', 'save_google_key', name='save google key'),
    url(r'^open_data/$', 'open_data', name='open data portal'),
    url(r'^google_search/$', 'google_search', name='google search'),
    url(r'^geoda_data/$', 'get_geoda_data', name='get geoda data'),
    url(r'^google_search_carto/$', 'google_search_carto', name='google search to CartoDB'),
)

urlpatterns += patterns('myproject.myapp.views_plots',
    url(r'^histogram/$', 'histogram', name='histogram'),
    url(r'^scatter_plot/$', 'scatter_plot', name='scatter plot'),
    url(r'^moran_scatter_plot/$', 'moran_scatter_plot', name='moran scatter plot'),
)

urlpatterns += patterns('myproject.myapp.views_cartodb',
    url(r'^get_cartodb_account/$', 'get_cartodb_account', name='get cartodb account'),
    url(r'^save_cartodb_account/$', 'save_cartodb_account', name='save cartodb account'),
    url(r'^carto_get_tables/$', 'carto_get_tables', name='carto get tables'),
    url(r'^carto_download_table/$', 'carto_download_table', name='carto download table'),
    url(r'^carto_upload_file/$', 'carto_upload_file', name='carto upload tables'),
    url(r'^carto_create_viz/$', 'carto_create_viz', name='carto create vizjson'),
    url(r'^carto_get_viz/$', 'carto_get_viz', name='carto get vizjson'),
    url(r'^carto_add_field_from_file/$', 'carto_add_field_from_file', name='carto field from csv file'),
)

urlpatterns += patterns('myproject.myapp.views_map',
    url(r'^get_dropbox_data/$', 'get_dropbox_data', name='get map data dropbox'),
    url(r'^get_map_names/$', 'get_map_names', name='get map names'),
    url(r'^get_map_conf/$', 'get_configure', name='get map configuration'),
    url(r'^save_map_conf/$', 'save_configure', name='save map configuration'),
    url(r'^spacetime/$', 'spacetime', name='spacetime'),
    url(r'^road_segment/$', 'road_segment', name='road segment'),
    url(r'^road_snap_points/$', 'road_snap_points', name='road snap points'),
    url(r'^road_create_w/$', 'road_create_w', name='road create w'),
    url(r'^lisa_map/$', 'lisa_map', name='lisa map'),
    url(r'^thematic_map/$', 'thematic_map', name='thematic_map'),
    url(r'^d_thematic_map/$', 'd_thematic_map', name='direct thematic_map'),
    url(r'^map_count/$', 'get_n_maps', name='get number of maps'),
    url(r'^new_map/$', 'new_map', name='get new map'),
    url(r'^map_exist/$', 'map_exist', name='if map exist'),
    url(r'^saveas_map/$', 'saveas_map', name='saveas map'),
    url(r'^remove_map/$', 'remove_map', name='delete map'),
    url(r'^download_map/$', 'download_map', name='download map'),
    url(r'^get_fields/$', 'get_fields', name='get field names'),
    url(r'^get_metadata/$', 'get_metadata', name='get meta data'),
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
    url(r'^spatial_regression_carto/$', 'spatial_regression_carto', name='spatial regression cartodb'),
    url(r'^publish_spreg_cartodb/$', 'publish_spreg_cartodb', name='publish spreg cartodb'),
)    
