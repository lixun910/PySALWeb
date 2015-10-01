# -*- coding: utf-8 -*-
from django.conf.urls import patterns, include, url
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns 
from django.views.generic import TemplateView
from django.contrib import admin


urlpatterns = patterns('',
    (r'myapp/', include('myproject.myapp.urls')),
    (r'^$', RedirectView.as_view(url=settings.URL_PREFIX + '/myapp/login/')), # Just for ease of use.
) 

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 

urlpatterns += static(settings.URL_PREFIX + settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 

urlpatterns += static(settings.URL_PREFIX + settings.STATIC_URL, document_root=settings.STATIC_ROOT)

urlpatterns += [
    url(r'^admin/', include(admin.site.urls)),
    url('', include('social.apps.django_app.urls', namespace='social')),
    url(r'^openlogin/$', 'common_auth.views.login'),
    url(r'^openlogout/$', 'common_auth.views.logout'),    
]
urlpatterns += staticfiles_urlpatterns()
