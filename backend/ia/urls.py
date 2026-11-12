from django.urls import path
from . import views

urlpatterns = [
    path("consultar/", views.consultar_agente, name="consultar_agente"),
]
