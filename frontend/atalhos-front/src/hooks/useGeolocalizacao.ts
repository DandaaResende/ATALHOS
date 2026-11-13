import { useState, useCallback, useRef, useEffect } from 'react';

export interface Coordenadas {
  latitude: number;
  longitude: number;
  precisao?: number;
  direcao?: number | null;
  velocidade?: number | null;
}

export type StatusRastreamento = 'inativo' | 'rastreando' | 'pausado' | 'aguardando_sinal';

export function useGeolocalizacao() {
  const [localizacao, setLocalizacao] = useState<Coordenadas | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [permissaoNegada, setPermissaoNegada] = useState(false);
  const [statusRastreamento, setStatusRastreamento] = useState<StatusRastreamento>('inativo');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Limpa o watch ao desmontar o componente
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // 1. Obtenção pontual da localização (getCurrentPosition)
  const obterLocalizacao = useCallback(
    (onSuccess?: (coords: Coordenadas) => void) => {
      if (!navigator.geolocation) {
        const msg = 'Seu navegador não possui suporte a geolocalização.';
        setErro(msg);
        return;
      }

      setCarregando(true);
      setErro(null);

      navigator.geolocation.getCurrentPosition(
        (posicao) => {
          const novasCoordenadas: Coordenadas = {
            latitude: posicao.coords.latitude,
            longitude: posicao.coords.longitude,
            precisao: posicao.coords.accuracy,
            direcao: posicao.coords.heading,
            velocidade: posicao.coords.speed,
          };

          setLocalizacao(novasCoordenadas);
          setUltimaAtualizacao(new Date());
          setCarregando(false);
          setPermissaoNegada(false);
          setErro(null);

          if (onSuccess) {
            onSuccess(novasCoordenadas);
          }
        },
        (error) => {
          setCarregando(false);
          let mensagemAmigavel = 'Não foi possível obter sua localização atual.';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              mensagemAmigavel = 'Permissão de localização negada. Autorize o acesso nas configurações do navegador.';
              setPermissaoNegada(true);
              break;
            case error.POSITION_UNAVAILABLE:
              mensagemAmigavel = 'Sinal de localização ou GPS indisponível no momento.';
              break;
            case error.TIMEOUT:
              mensagemAmigavel = 'Tempo limite esgotado ao tentar capturar sua localização. Tente novamente.';
              break;
          }

          setErro(mensagemAmigavel);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    },
    []
  );

  // 2. Inicia o acompanhamento contínuo em tempo real (watchPosition)
  const iniciarAcompanhamento = useCallback((onUpdate?: (coords: Coordenadas) => void) => {
    if (!navigator.geolocation) {
      setErro('Seu navegador não possui suporte a geolocalização.');
      return;
    }

    // Interrompe qualquer rastreamento anterior
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setStatusRastreamento('aguardando_sinal');
    setErro(null);

    const id = navigator.geolocation.watchPosition(
      (posicao) => {
        const coords: Coordenadas = {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          precisao: posicao.coords.accuracy,
          direcao: posicao.coords.heading,
          velocidade: posicao.coords.speed,
        };

        setLocalizacao(coords);
        setUltimaAtualizacao(new Date());
        setStatusRastreamento('rastreando');
        setErro(null);

        if (onUpdate) {
          onUpdate(coords);
        }
      },
      (error) => {
        let msg = 'Erro ao atualizar localização em tempo real.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Permissão de localização negada.';
            setPermissaoNegada(true);
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Sinal de GPS indisponível ou fraco.';
            break;
          case error.TIMEOUT:
            msg = 'Aguardando atualização do sinal GPS...';
            break;
        }

        setErro(msg);
        setStatusRastreamento('aguardando_sinal');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 2000,
      }
    );

    watchIdRef.current = id;
  }, []);

  // 3. Pausa o acompanhamento (interrompe o watch sem resetar as últimas coordenadas)
  const pausarAcompanhamento = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatusRastreamento('pausado');
  }, []);

  // 4. Retoma o acompanhamento
  const retomarAcompanhamento = useCallback(
    (onUpdate?: (coords: Coordenadas) => void) => {
      iniciarAcompanhamento(onUpdate);
    },
    [iniciarAcompanhamento]
  );

  // 5. Encerra completamente o acompanhamento
  const encerrarAcompanhamento = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatusRastreamento('inativo');
  }, []);

  return {
    localizacao,
    carregando,
    erro,
    permissaoNegada,
    statusRastreamento,
    ultimaAtualizacao,
    obterLocalizacao,
    iniciarAcompanhamento,
    pausarAcompanhamento,
    retomarAcompanhamento,
    encerrarAcompanhamento,
    limparErro: () => setErro(null),
  };
}
