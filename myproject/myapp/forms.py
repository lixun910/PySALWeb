# -*- coding: utf-8 -*-
from django import forms

class DocumentForm(forms.Form):
    docfile = forms.FileField(
        label='Select a file'
    )

class OLSForm(forms.Form):
    pass

class SpLagForm(forms.Form):
    pass

class SpErrorForm(forms.Form):
    pass

class AutoModelForm(forms.Form):
    pass
