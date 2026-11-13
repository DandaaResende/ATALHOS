from rest_framework import serializers


class StrictCharField(serializers.CharField):
    """
    CharField estrito que rejeita tipos não-string (como inteiros, booleanos, listas),
    preserva os espaços originais sem trim silencioso e rejeita strings vazias ou
    compostas apenas por espaços quando allow_blank=False.
    """

    def __init__(self, **kwargs):
        kwargs["trim_whitespace"] = False
        super().__init__(**kwargs)

    def run_validation(self, data=serializers.empty):
        if data is not serializers.empty and data is not None:
            if not isinstance(data, str):
                self.fail("invalid")
            if not self.allow_blank and not data.strip():
                self.fail("blank")
        return super().run_validation(data)

    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        return data


class RespostaAgenteSerializer(serializers.Serializer):
    """
    Serializer responsável por validar e padronizar a resposta
    produzida pelo serviço Gemini do aplicativo 'ia'.
    """

    INTENCOES_VALIDAS = [
        "buscar_rota",
        "consultar_linha",
        "saudacao",
        "outro",
    ]

    intencao = serializers.ChoiceField(choices=INTENCOES_VALIDAS, required=True)
    origem = StrictCharField(required=True, allow_null=True)
    destino = StrictCharField(required=True, allow_null=True)
    data = StrictCharField(required=True, allow_null=True)
    horario = StrictCharField(required=True, allow_null=True)
    preferencias = serializers.DictField(required=True)
    informacoes_faltantes = serializers.ListField(
        child=StrictCharField(),
        required=True
    )
    mensagem = StrictCharField(required=True, allow_blank=True)

    def validate(self, attrs):
        intencao = attrs.get("intencao")
        origem = attrs.get("origem")
        destino = attrs.get("destino")
        informacoes_faltantes = attrs.get("informacoes_faltantes", [])

        if intencao == "buscar_rota":
            if (not origem or not origem.strip()) and "origem" not in informacoes_faltantes:
                raise serializers.ValidationError(
                    "Para a intenção 'buscar_rota', quando a origem não estiver preenchida, "
                    "'origem' deve constar em 'informacoes_faltantes'."
                )
            if (not destino or not destino.strip()) and "destino" not in informacoes_faltantes:
                raise serializers.ValidationError(
                    "Para a intenção 'buscar_rota', quando o destino não estiver preenchido, "
                    "'destino' deve constar em 'informacoes_faltantes'."
                )

        return attrs
