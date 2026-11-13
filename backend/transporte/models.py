from django.db import models

class Usuario(models.Model):
    nome = models.CharField(max_length=100)
    email = models.EmailField(unique=True, max_length=100)

    def __str__(self):
        return self.nome

class LinhasTransporte(models.Model):
    nome = models.CharField(max_length=100)
    origem = models.CharField(max_length=150)
    destino = models.CharField(max_length=150)
    ativa = models.BooleanField(default=True)

    def __str__(self):
        return self.nome

class Pontos(models.Model):
    nome = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    endereco = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.nome

class Preferencias_Usuarios(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    prefere_menos_baldecoes = models.BooleanField(default=False)
    prefere_menos_caminhada = models.BooleanField(default=False)
    acessibilidade = models.BooleanField(default=False)

    def __str__(self):
        return f"Preferências de {self.usuario.nome}"

class Consultas(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    origem = models.CharField(max_length=150)
    destino = models.CharField(max_length=150)
    horario_partida = models.DateTimeField(blank=True, null=True)
    horario_consulta = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Consulta de {self.origem} para {self.destino}"