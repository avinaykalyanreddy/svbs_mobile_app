from django.contrib import admin
from .models import Ads, BankAndPercentage, Percentage

# Register your models here.


admin.site.register(Ads)

admin.site.register(Percentage)
admin.site.register(BankAndPercentage)
