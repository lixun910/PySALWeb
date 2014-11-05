# -*- coding: utf-8 -*-
from django.conf.urls import patterns, include, url
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns 
from django.views.generic import TemplateView

print settings.MEDIA_URL
urlpatterns = patterns('',
	(r'myapp/', include('myproject.myapp.urls')),
	(r'^$', RedirectView.as_view(url=settings.URL_PREFIX + '/myapp/login/')), # Just for ease of use.
) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + static(settings.URL_PREFIX + settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 

urlpatterns += staticfiles_urlpatterns()
