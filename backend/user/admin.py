from django.contrib import admin
from .models import Users


@admin.register(Users)
class UsersAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'mobile_number',
        'email',
        'role',
        'created_at',
    )

    search_fields = ('name', 'email', 'mobile_number')
    list_filter = ('role', 'created_at')
    ordering = ('-created_at',)