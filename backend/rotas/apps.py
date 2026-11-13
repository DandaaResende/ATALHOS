from django.apps import AppConfig
import threading
import os
import sys


class RotasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rotas'

    def ready(self):
        # Aquece o cache de dados GTFS em segundo plano na inicialização do servidor
        # para que a primeira consulta do usuário seja rápida
        comandos_ignorados = {'test', 'migrate', 'makemigrations', 'check', 'collectstatic'}
        if any(cmd in sys.argv for cmd in comandos_ignorados):
            return

        if os.environ.get('RUN_MAIN') == 'true' or 'runserver' in sys.argv:
            from .gtfs import _carregar_dados
            threading.Thread(target=_carregar_dados, daemon=True).start()
