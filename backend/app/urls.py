from django.urls import path
from . import views

app_name = 'app'

urlpatterns = [
    path('banks/', views.bank_list, name='app_bank_list'),
    # Keep the existing no-trailing-slash endpoint working for older clients.
    path('banks', views.bank_list, name='app_bank_list_legacy'),
    path('banks/<str:name>/', views.bank_detail, name='app_bank_detail'),

    path('chat/messages/', views.customer_chat_messages, name='customer_chat_messages'),
    path('chat/typing/', views.customer_chat_typing, name='customer_chat_typing'),
    path('chat/conversations/', views.admin_chat_conversations, name='admin_chat_conversations'),
    path('chat/conversations/<int:pk>/messages/', views.admin_chat_messages, name='admin_chat_messages'),
    path('chat/conversations/<int:pk>/typing/', views.admin_chat_typing, name='admin_chat_typing'),
    path('notifications/', views.user_notifications, name='user_notifications'),

    path('qr/', views.qrpercentage_list, name='app_qrpercentage_list'),
    path('qr', views.qrpercentage_list, name='app_qrpercentage_list_legacy'),
    path('qr/<int:pk>/', views.qrpercentage_delete, name='app_qrpercentage_delete'),

    path('ads/', views.ads_list, name='app_ads_list'),
    path('ads/<int:pk>/', views.ads_detail, name='app_ads_detail'),

    path('card-percentages/', views.card_percentage_list, name='card_percentage_list'),
    path('card-percentages/<str:percentage>/', views.card_percentage_delete, name='card_percentage_delete'),
    path('card-percentages/<str:percentage>/banks/', views.card_percentage_add_bank, name='card_percentage_add_bank'),
    path('card-percentages/<str:percentage>/banks/<str:bank_name>/', views.card_percentage_remove_bank, name='card_percentage_remove_bank'),

]
