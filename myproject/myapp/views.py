# -*- coding: utf-8 -*-
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.conf import settings

from myproject.myapp.models import Document, Weights, Geodata, Preference
from myproject.myapp.forms import DocumentForm

import logging, os
from hashlib import md5
from views_utils import get_file_url

logger = logging.getLogger(__name__)

def test(request):
    return HttpResponse(request.user.id)
    
def my_logout(request):
    logout(request)
    return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    
def my_login(request):
    error_msg = ""
    if request.method == 'POST':
        email = request.POST.get("lemail")
        password = request.POST.get("lpassword")
        user = authenticate(username=email, password=password)
        if user is not None:
            # user.is_active
            login(request, user)
            print user.id
            return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/main/') 
        else:
            error_msg = "Email or password don't match any existing record."
    return render_to_response(
        'myapp/login.html',{
            'url_prefix': settings.URL_PREFIX,\
            'theme_jquery': settings.THEME_JQUERY,
            'error_msg': error_msg
        },
        context_instance=RequestContext(request)
    )

def my_signup(request):
    print "signup", request.POST
    if request.method == 'POST': 
        first_name = request.POST.get("first_name")
        last_name = request.POST.get("last_name")
        email = request.POST.get("email")
        reemail = request.POST.get("reemail")
        password = request.POST.get("password")
        
        print first_name, last_name, email, reemail, password
        
        if first_name and last_name and email and reemail and password:
            if email == reemail:
                username = email
                user = User.objects.create_user(username, email, password)
                user.first_name = first_name
                user.last_name = last_name
                user.save()
                user = authenticate(username=email, password=password)
                login(request, user)
                return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/main/') 
            
    return render_to_response(
        'myapp/login.html',{
            'url_prefix': settings.URL_PREFIX,\
            'theme_jquery': settings.THEME_JQUERY,
        },
        context_instance=RequestContext(request)
    )

def dup_email(request):
    email = request.GET.get("email", None)
    if email:
        try:
            user = User.objects.get(username=email)
            return HttpResponse("1")
        except:
            pass
        
    return HttpResponse("0")
    
        
        
@login_required
def main(request):
    # check user login
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 

    geodata = Geodata.objects.all().filter( userid=userid )
    geodata_content =  {}
    first_geodata = ''
    for i,layer in enumerate(geodata):
        geodata_content[i+1] = layer
        if i == 0:
            first_geodata = layer
    # render main page with userid, shps/tables, weights
    return render_to_response(
        'myapp/main.html', {'test': {0:1},
            'userid': userid, 'geodata': geodata_content, \
            'geodata0': first_geodata,'n': len(geodata), \
            'nn':range(1,len(geodata)+1),\
            'url_prefix': settings.URL_PREFIX,\
            'theme_jquery': settings.THEME_JQUERY,
            },
        context_instance=RequestContext(request)
    )

"""
def list(request):
    # Handle file upload
    if request.method == 'POST' and request.session.get('userid', False):
        form = DocumentForm(request.POST, request.FILES)
        if form.is_valid():
            docfile = request.FILES['docfile']
            shpfilename = str(docfile)
            userid = 'test1'
            shpuuid =  md5(userid+shpfilename).hexdigest()
            # if it's a zip file, unzip it, and get real file from it
            # if .shp file already there, there is no need to write db 
            newdoc = Document(uuid = shpuuid, userid = userid,filename=shpfilename, docfile = docfile)
            newdoc.save()

            # Redirect to the document list after POST
            return HttpResponseRedirect(reverse('myproject.myapp.views.list'))
    else:
        form = DocumentForm() # A empty, unbound form

    # Load documents for the list page
    documents = Document.objects.all()

    # Render list page with the documents and the form
    return render_to_response(
        'myapp/list.html',
        {'documents': documents, 'form': form},
        context_instance=RequestContext(request)
    )
"""      

@login_required
def save_pdf(request):
    userid = request.user.username
    if not userid:
        return HttpResponseRedirect(settings.URL_PREFIX+'/myapp/login/') 
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Spacer, XPreformatted
    from reportlab.platypus.flowables import Preformatted, Image
    from reportlab.lib.styles import getSampleStyleSheet
    
    if request.method == 'POST': 
        layer_uuid = request.POST.get('layer_uuid',None)
        text = request.POST.get('text','')
        if layer_uuid:
            shp_url = get_file_url(userid, layer_uuid)
            if shp_url:
                shp_location, shp_name = shp_url
                image_location = settings.PROJECT_ROOT + shp_location + ".png"
                response = HttpResponse(content_type='application/pdf')
                response['Content-Disposition'] = 'attachment;filename="result.pdf"'
                
                styles = getSampleStyleSheet()
                Title = "Regression result"
                pageinfo = ""                

                doc = SimpleDocTemplate(response) 
                #Story = [Spacer(1,2*inch)]
                Story = []
                style = styles["Code"]
                if os.path.isfile(image_location):
                    img = Image(image_location, 4*inch, 2.6*inch)
                    Story.append(img)
                text = text.replace('\r','')
                t = XPreformatted(text, style)
                Story.append(t)
                doc.build(Story)
                return response
                
    return HttpResponse("ERROR")
