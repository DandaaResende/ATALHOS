from django.urls import path
from . import views

urlpatterns = [
    path('buscar/', views.api_buscar_rota, name='api_buscar_rota'),
    path('api/linhas/<str:codigo>/itinerario/', views.api_itinerario, name='api_itinerario'),
    path('', views.pagina_mapa, name='pagina_mapa'),
]